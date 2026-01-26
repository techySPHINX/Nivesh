"""
ML Model Serving API
FastAPI server for serving trained models

Version: 2.0.0
Last Updated: January 27, 2026
"""

from model_server.health import router as health_router
from shared.logger import setup_logger
from shared.config import MLConfig
from shared.security import verify_api_key, check_rate_limit, InputValidator
from shared.exceptions import (
    ModelNotLoadedError, ModelPredictionError, ValidationError,
    ExternalServiceError
)
from shared.circuit_breaker import circuit_breaker
from shared.retry import retry_redis, retry_mlflow
from shared.monitoring import (
    track_prediction, get_prediction_tracker, health_monitor,
    track_cache_access, track_invalid_input
)
from shared.performance import (
    LRUCache, lru_cache, RequestDeduplicator, measure_performance
)
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import mlflow
import redis
import json
import hashlib
import time
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))


# Configure logging
config = MLConfig()
logger = setup_logger(__name__, config.log_level)

# Initialize FastAPI
app = FastAPI(
    title="Nivesh ML API",
    description="Machine Learning Model Serving for Financial Intelligence",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
cors_origins = config.cors_origins if hasattr(
    config, 'cors_origins') else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include health check router
app.include_router(health_router)

# Redis cache
try:
    redis_client = redis.Redis(
        host=config.redis_host,
        port=config.redis_port,
        password=config.redis_password,
        db=config.redis_db,
        decode_responses=True,
        socket_connect_timeout=5
    )
    # Test connection
    redis_client.ping()
    logger.info("✅ Redis connected successfully")
except Exception as e:
    logger.error(f"❌ Redis connection failed: {e}")
    redis_client = None

# MLflow setup
try:
    mlflow.set_tracking_uri(config.mlflow_tracking_uri)
    logger.info(f"✅ MLflow tracking URI set: {config.mlflow_tracking_uri}")
except Exception as e:
    logger.error(f"❌ MLflow setup failed: {e}")

# Prometheus metrics
prediction_counter = Counter(
    'ml_predictions_total', 'Total ML predictions', ['model_name'])
prediction_latency = Histogram(
    'ml_prediction_latency_seconds', 'Prediction latency', ['model_name'])
error_counter = Counter('ml_errors_total', 'Total ML errors', [
                        'model_name', 'error_type'])

# Model cache
models_cache: Dict[str, Any] = {}

# Initialize performance optimizations
prediction_cache = LRUCache(max_size=1000, default_ttl=3600)
request_deduplicator = RequestDeduplicator()

# ==========================================
# Request/Response Models
# ==========================================


class IntentClassificationRequest(BaseModel):
    query: str
    user_id: Optional[str] = None


class IntentClassificationResponse(BaseModel):
    intent: str
    confidence: float
    alternatives: List[Dict[str, float]]


class NERRequest(BaseModel):
    text: str


class NERResponse(BaseModel):
    entities: List[Dict[str, Any]]


class SpendingPredictionRequest(BaseModel):
    user_id: str
    months: int = 12


class SpendingPredictionResponse(BaseModel):
    forecast: List[Dict[str, Any]]


class AnomalyDetectionRequest(BaseModel):
    user_id: str
    transaction: Dict[str, Any]


class AnomalyDetectionResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    threshold: float


class CreditRiskRequest(BaseModel):
    applicant_data: Dict[str, Any]


class CreditRiskResponse(BaseModel):
    will_default: bool
    risk_score: int
    risk_category: str
    default_probability: Optional[float] = None
    no_default_probability: Optional[float] = None

# ==========================================
# Helper Functions
# ==========================================


@retry_mlflow(max_attempts=3)
def load_model(model_name: str, version: str = "production"):
    """Load model from MLflow with caching and retry"""
    cache_key = f"{model_name}:{version}"

    if cache_key in models_cache:
        logger.debug(f"Model loaded from cache: {cache_key}")
        track_cache_access("model", hit=True)
        return models_cache[cache_key]

    track_cache_access("model", hit=False)
    
    try:
        start_time = time.time()
        model_uri = f"models:/{model_name}/{version}"
        logger.info(f"Loading model from MLflow: {model_uri}")
        model = mlflow.pyfunc.load_model(model_uri)
        models_cache[cache_key] = model
        
        load_time = time.time() - start_time
        health_monitor.record_load(model_name, success=True, load_time=load_time)
        logger.info(f"Model loaded successfully: {cache_key} in {load_time:.2f}s")
        
        return model
    except Exception as e:
        health_monitor.record_load(model_name, success=False, load_time=0)
        logger.error(f"Failed to load model {cache_key}: {str(e)}")
        raise ModelNotLoadedError(
            message=f"Model loading failed: {model_name}",
            error_code="MODEL_LOAD_FAILED",
            details={"model_name": model_name,
                     "version": version, "error": str(e)}
        )


@circuit_breaker("redis", failure_threshold=3, recovery_timeout=30)
@retry_redis(max_attempts=3)
def get_cached_prediction(cache_key: str) -> Optional[Dict]:
    """Get cached prediction from Redis with circuit breaker"""
    try:
        if redis_client is None:
            return None
        cached = redis_client.get(cache_key)
        if cached:
            track_cache_access("redis", hit=True)
            return json.loads(cached)
        track_cache_access("redis", hit=False)
    except Exception as e:
        logger.warning(f"Cache read failed: {str(e)}")
        track_cache_access("redis", hit=False)
        raise  # Let retry/circuit breaker handle it
    return None


@circuit_breaker("redis", failure_threshold=3, recovery_timeout=30)
@retry_redis(max_attempts=2)
def set_cached_prediction(cache_key: str, prediction: Dict, ttl: int = 3600):
    """Cache prediction in Redis with circuit breaker"""
    try:
        if redis_client is None:
            return
        redis_client.setex(cache_key, ttl, json.dumps(prediction))
    except Exception as e:
        logger.warning(f"Cache write failed: {str(e)}")
        # Don't raise - cache write failure shouldn't break prediction


def generate_cache_key(model_name: str, input_data: str) -> str:
    """Generate cache key from model name and input"""
    input_hash = hashlib.md5(input_data.encode()).hexdigest()
    return f"pred:{model_name}:{input_hash}"

# ==========================================
# Health & Metrics Endpoints
# ==========================================


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": len(models_cache),
        "mlflow_uri": mlflow.get_tracking_uri()
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/monitoring/health")
async def monitoring_health():
    """
    Detailed health monitoring endpoint.
    Returns health status for all models and cache statistics.
    """
    return {
        "status": "ok",
        "models": health_monitor.get_all_health_status(),
        "cache": {
            "prediction_cache": prediction_cache.get_stats(),
            "model_cache_size": len(models_cache)
        },
        "redis": {
            "connected": redis_client is not None,
            "ping": redis_client.ping() if redis_client else False
        }
    }


@app.get("/monitoring/statistics")
async def monitoring_statistics():
    """
    Get prediction statistics for all models.
    """
    stats = {}
    for model_name in ["intent_classifier", "financial_ner", "spending_predictor",
                       "anomaly_detector", "credit_risk_scorer"]:
        tracker = get_prediction_tracker(model_name)
        stats[model_name] = tracker.get_statistics()
    return stats

# ==========================================
# Model Endpoints
# ==========================================


@app.post("/predict/intent", response_model=IntentClassificationResponse)
@prediction_latency.labels(model_name='intent_classifier').time()
async def predict_intent(
    request: IntentClassificationRequest,
    api_key: str = Depends(verify_api_key),
    _rate_limit: None = Depends(check_rate_limit)
):
    """
    Classify user query intent

    Example intents: affordability_check, goal_planning, spending_analysis,
    investment_advice, budget_query, transaction_search

    Requires:
        - X-API-Key header for authentication
        - Rate limit: 100 requests per minute per IP
    """
    start_time = time.time()
    model_name = 'intent_classifier'
    
    try:
        prediction_counter.labels(model_name=model_name).inc()

        # Validate input
        try:
            query = InputValidator.validate_text(
                request.query,
                field_name="query",
                min_length=3,
                max_length=512
            )
        except ValidationError as e:
            track_invalid_input(model_name, "invalid_query")
            raise

        # Check cache
        cache_key = generate_cache_key(model_name, query)
        cached = get_cached_prediction(cache_key)
        if cached:
            logger.debug(f"Cache hit for intent query: {query[:50]}...")
            latency = time.time() - start_time
            health_monitor.record_prediction(model_name, latency, success=True)
            return IntentClassificationResponse(**cached)

        # Load model
        model = load_model(model_name, 'production')

        # Make prediction
        result = model.predict([query])

        response = {
            "intent": result[0]['intent'],
            "confidence": float(result[0]['confidence']),
            "alternatives": [
                {"intent": alt['intent'],
                    "confidence": float(alt['confidence'])}
                for alt in result[0].get('alternatives', [])
            ]
        }

        # Cache result
        set_cached_prediction(cache_key, response, ttl=3600)
        
        # Track prediction
        latency = time.time() - start_time
        health_monitor.record_prediction(model_name, latency, success=True)
        
        tracker = get_prediction_tracker(model_name)
        tracker.log_prediction(
            input_data={"query": query[:100]},  # Store truncated for privacy
            prediction=response,
            latency=latency
        )

        return IntentClassificationResponse(**response)

    except ValidationError as e:
        logger.warning(f"Invalid input for intent classification: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except ModelNotLoadedError as e:
        error_counter.labels(model_name='intent_classifier',
                             error_type='model_not_loaded').inc()
        logger.error(f"Model not loaded: {e}")
        raise HTTPException(status_code=503, detail="Model not available")
    except Exception as e:
        error_counter.labels(model_name='intent_classifier',
                             error_type=type(e).__name__).inc()
        logger.error(f"Intent classification failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction failed")


@app.post("/predict/ner", response_model=NERResponse)
@prediction_latency.labels(model_name='financial_ner').time()
async def extract_entities(request: NERRequest):
    """
    Extract financial entities (MONEY, DATE, CATEGORY, MERCHANT, ACCOUNT)
    """
    try:
        prediction_counter.labels(model_name='financial_ner').inc()

        # Check cache
        cache_key = generate_cache_key('financial_ner', request.text)
        cached = get_cached_prediction(cache_key)
        if cached:
            return NERResponse(**cached)

        # Load model
        model = load_model('financial_ner', 'production')

        # Extract entities
        doc = model(request.text)
        entities = [
            {
                "text": ent.text,
                "label": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char,
                "confidence": float(ent._.confidence) if hasattr(ent._, 'confidence') else 1.0
            }
            for ent in doc.ents
        ]

        response = {"entities": entities}

        # Cache result
        set_cached_prediction(cache_key, response, ttl=3600)

        return NERResponse(**response)

    except Exception as e:
        error_counter.labels(model_name='financial_ner',
                             error_type=type(e).__name__).inc()
        logger.error(f"NER extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/spending", response_model=SpendingPredictionResponse)
@prediction_latency.labels(model_name='spending_predictor').time()
async def predict_spending(request: SpendingPredictionRequest):
    """
    Predict future spending using Prophet time series model
    Returns monthly spending forecasts with confidence intervals
    """
    try:
        prediction_counter.labels(model_name='spending_predictor').inc()

        # Check cache
        cache_key = generate_cache_key(
            'spending_predictor', f"{request.user_id}:{request.months}")
        cached = get_cached_prediction(cache_key)
        if cached:
            return SpendingPredictionResponse(**cached)

        # Load spending predictor model (shared or user-specific)
        try:
            # Try user-specific model first
            model = load_model(
                f'spending_predictor_{request.user_id}', 'production')
        except:
            # Fall back to general model
            model = load_model('spending_predictor', 'production')

        # Generate predictions for next N months (in days)
        periods = request.months * 30
        forecast_result = model.predict(periods=periods, freq='D')

        # Convert predictions to monthly aggregates
        import pandas as pd
        df = pd.DataFrame(forecast_result['predictions'])
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')

        # Aggregate by month
        monthly_forecast = []
        for month in df['month'].unique():
            month_data = df[df['month'] == month]
            monthly_forecast.append({
                'month': str(month),
                'predicted_amount': float(month_data['predicted_amount'].sum()),
                'lower_bound': float(month_data['lower_bound'].sum()),
                'upper_bound': float(month_data['upper_bound'].sum()),
                'daily_average': float(month_data['predicted_amount'].mean()),
            })

        response = {
            "forecast": monthly_forecast[:request.months]
        }

        # Cache result
        set_cached_prediction(cache_key, response, ttl=1800)  # 30 min cache

        return SpendingPredictionResponse(**response)

    except Exception as e:
        error_counter.labels(model_name='spending_predictor',
                             error_type=type(e).__name__).inc()
        logger.error(f"Spending prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/anomaly", response_model=AnomalyDetectionResponse)
@prediction_latency.labels(model_name='anomaly_detector').time()
async def detect_anomaly(request: AnomalyDetectionRequest):
    """
    Detect anomalous transactions using Isolation Forest
    Returns anomaly flag, score, and threshold
    """
    try:
        prediction_counter.labels(model_name='anomaly_detector').inc()

        # Check cache (shorter TTL for anomaly detection)
        cache_key = generate_cache_key(
            'anomaly_detector',
            f"{request.user_id}:{json.dumps(request.transaction, sort_keys=True)}"
        )
        cached = get_cached_prediction(cache_key)
        if cached:
            return AnomalyDetectionResponse(**cached)

        # Load model (try user-specific, fall back to general)
        try:
            model = load_model(
                f'anomaly_detector_{request.user_id}', 'production')
        except:
            model = load_model('anomaly_detector', 'production')

        # Predict using the AnomalyDetector's predict method
        result = model.predict(request.transaction, return_score=True)

        response = {
            "is_anomaly": result['is_anomaly'],
            "anomaly_score": result['anomaly_score'],
            "threshold": result['threshold']
        }

        # Cache result (5 min TTL for fresh anomaly detection)
        set_cached_prediction(cache_key, response, ttl=300)

        return AnomalyDetectionResponse(**response)

    except Exception as e:
        error_counter.labels(model_name='anomaly_detector',
                             error_type=type(e).__name__).inc()
        logger.error(f"Anomaly detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/credit-risk", response_model=CreditRiskResponse)
@prediction_latency.labels(model_name='credit_risk_scorer').time()
async def predict_credit_risk(request: CreditRiskRequest):
    """
    Predict loan default risk using XGBoost classifier
    Returns risk score (0-100), risk category, and default probability
    """
    try:
        prediction_counter.labels(model_name='credit_risk_scorer').inc()

        # Check cache
        cache_key = generate_cache_key(
            'credit_risk_scorer',
            json.dumps(request.applicant_data, sort_keys=True)
        )
        cached = get_cached_prediction(cache_key)
        if cached:
            return CreditRiskResponse(**cached)

        # Load model
        model = load_model('credit_risk_scorer', 'production')

        # Predict using CreditRiskScorer's predict method
        result = model.predict(request.applicant_data, return_probability=True)

        response = {
            "will_default": result['will_default'],
            "risk_score": result['risk_score'],
            "risk_category": result['risk_category'],
            "default_probability": result.get('default_probability'),
            "no_default_probability": result.get('no_default_probability')
        }

        # Cache result (1 hour TTL)
        set_cached_prediction(cache_key, response, ttl=3600)

        return CreditRiskResponse(**response)

    except Exception as e:
        error_counter.labels(model_name='credit_risk_scorer',
                             error_type=type(e).__name__).inc()
        logger.error(f"Credit risk prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# Admin Endpoints
# ==========================================


@app.get("/models/list")
async def list_models():
    """List all registered models"""
    try:
        client = mlflow.tracking.MlflowClient()
        models = client.search_registered_models()
        return {
            "models": [
                {
                    "name": model.name,
                    "creation_time": model.creation_timestamp,
                    "last_updated": model.last_updated_timestamp,
                    "versions": len(model.latest_versions)
                }
                for model in models
            ]
        }
    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cache/clear")
async def clear_cache():
    """Clear all cached predictions"""
    try:
        # Clear Redis cache
        pattern = "pred:*"
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)

        # Clear in-memory model cache
        models_cache.clear()

        return {"message": f"Cleared {len(keys)} cached predictions and all loaded models"}
    except Exception as e:
        logger.error(f"Failed to clear cache: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# Drift Detection Endpoints
# ==========================================

# Import drift detection router
sys.path.insert(0, str(Path(__file__).parent.parent / 'drift_detection'))

try:
    from drift_endpoints import router as drift_router
    app.include_router(drift_router)
    logger.info("Drift detection endpoints registered")
except Exception as e:
    logger.warning(f"Failed to load drift detection endpoints: {e}")


# ==========================================
# Startup & Shutdown Handlers
# ==========================================

@app.on_event("startup")
async def warmup_models():
    """
    Warm up models on startup to avoid cold start latency.
    Load models into memory and run test predictions.
    """
    logger.info("🚀 Starting model warmup...")

    warmup_models_list = [
        "intent_classifier",
        "financial_ner",
        "spending_predictor",
        "anomaly_detector",
        "credit_risk_scorer"
    ]

    # Register models with health monitor
    for model_name in warmup_models_list:
        health_monitor.register_model(model_name)

    successful_warmups = []
    failed_warmups = []

    for model_name in warmup_models_list:
        try:
            logger.info(f"Warming up {model_name}...")

            # Pre-load model
            model = load_model(model_name, "production")
            successful_warmups.append(model_name)

            logger.info(f"✅ {model_name} warmed up successfully")
        except Exception as e:
            logger.error(f"❌ Failed to warm up {model_name}: {e}")
            failed_warmups.append(model_name)

    logger.info(
        f"Model warmup completed: {len(successful_warmups)} successful, "
        f"{len(failed_warmups)} failed"
    )

    if failed_warmups:
        logger.warning(f"Failed to warm up models: {failed_warmups}")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Graceful shutdown handler.
    - Close Redis connections
    - Clear model cache
    - Log shutdown completion
    """
    logger.info("🔴 Starting graceful shutdown...")

    try:
        # Close Redis connection
        if redis_client:
            redis_client.close()
            logger.info("Redis connection closed")
    except Exception as e:
        logger.error(f"Error closing Redis connection: {e}")

    try:
        # Clear model cache
        models_cache.clear()
        logger.info("Model cache cleared")
    except Exception as e:
        logger.error(f"Error clearing model cache: {e}")

    logger.info("✅ Shutdown complete")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True
    )
