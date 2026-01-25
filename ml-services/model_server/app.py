"""
ML Model Serving API
FastAPI server for serving trained models
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import mlflow
import redis
import json
import hashlib
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Nivesh ML API",
    description="Machine Learning Model Serving for Financial Intelligence",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis cache
redis_client = redis.Redis(
    host='redis',
    port=6379,
    password='nivesh_password',
    decode_responses=True
)

# MLflow setup
mlflow.set_tracking_uri("http://mlflow:5000")

# Prometheus metrics
prediction_counter = Counter(
    'ml_predictions_total', 'Total ML predictions', ['model_name'])
prediction_latency = Histogram(
    'ml_prediction_latency_seconds', 'Prediction latency', ['model_name'])
error_counter = Counter('ml_errors_total', 'Total ML errors', [
                        'model_name', 'error_type'])

# Model cache
models_cache: Dict[str, Any] = {}

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

# ==========================================
# Helper Functions
# ==========================================


def load_model(model_name: str, version: str = "production"):
    """Load model from MLflow with caching"""
    cache_key = f"{model_name}:{version}"

    if cache_key in models_cache:
        logger.info(f"Model loaded from cache: {cache_key}")
        return models_cache[cache_key]

    try:
        model_uri = f"models:/{model_name}/{version}"
        model = mlflow.pyfunc.load_model(model_uri)
        models_cache[cache_key] = model
        logger.info(f"Model loaded from MLflow: {cache_key}")
        return model
    except Exception as e:
        logger.error(f"Failed to load model {cache_key}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Model loading failed: {str(e)}")


def get_cached_prediction(cache_key: str) -> Optional[Dict]:
    """Get cached prediction from Redis"""
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Cache read failed: {str(e)}")
    return None


def set_cached_prediction(cache_key: str, prediction: Dict, ttl: int = 3600):
    """Cache prediction in Redis"""
    try:
        redis_client.setex(cache_key, ttl, json.dumps(prediction))
    except Exception as e:
        logger.warning(f"Cache write failed: {str(e)}")


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

# ==========================================
# Model Endpoints
# ==========================================


@app.post("/predict/intent", response_model=IntentClassificationResponse)
@prediction_latency.labels(model_name='intent_classifier').time()
async def predict_intent(request: IntentClassificationRequest):
    """
    Classify user query intent

    Example intents: affordability_check, goal_planning, spending_analysis,
    investment_advice, budget_query, transaction_search
    """
    try:
        prediction_counter.labels(model_name='intent_classifier').inc()

        # Check cache
        cache_key = generate_cache_key('intent_classifier', request.query)
        cached = get_cached_prediction(cache_key)
        if cached:
            return IntentClassificationResponse(**cached)

        # Load model
        model = load_model('intent_classifier', 'production')

        # Make prediction
        result = model.predict([request.query])

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

        return IntentClassificationResponse(**response)

    except Exception as e:
        error_counter.labels(model_name='intent_classifier',
                             error_type=type(e).__name__).inc()
        logger.error(f"Intent classification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
            model = load_model(f'spending_predictor_{request.user_id}', 'production')
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
    """
    try:
        prediction_counter.labels(model_name='anomaly_detector').inc()

        # Load user-specific model
        model = load_model(f'anomaly_detector_{request.user_id}', 'production')

        # Engineer features from transaction
        features = engineer_transaction_features(request.transaction)

        # Predict
        is_anomaly = model.predict([features])[0] == -1
        anomaly_score = float(model.score_samples([features])[0])

        response = {
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": anomaly_score,
            "threshold": -0.5  # Configurable threshold
        }

        return AnomalyDetectionResponse(**response)

    except Exception as e:
        error_counter.labels(model_name='anomaly_detector',
                             error_type=type(e).__name__).inc()
        logger.error(f"Anomaly detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# Utility Functions
# ==========================================


def engineer_transaction_features(transaction: Dict[str, Any]) -> List[float]:
    """
    Engineer features from transaction for anomaly detection
    """
    # TODO: Implement proper feature engineering
    return [
        float(transaction.get('amount', 0)),
        float(transaction.get('hour', 0)),
        float(transaction.get('day_of_week', 0)),
        # Add more features
    ]

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
