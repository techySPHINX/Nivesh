"""
Enhanced Monitoring and Observability Utilities

Provides:
- Prediction tracking
- Model performance metrics
- Drift detection integration
- Request tracing
- Latency percentiles
"""

import time
import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps
from datetime import datetime
from prometheus_client import Counter, Histogram, Gauge, Summary
import json

logger = logging.getLogger(__name__)


# ==========================================
# Prometheus Metrics
# ==========================================

# Prediction metrics
prediction_total = Counter(
    'ml_prediction_total',
    'Total number of predictions',
    ['model_name', 'status']
)

prediction_latency = Histogram(
    'ml_prediction_latency_seconds',
    'Prediction latency in seconds',
    ['model_name'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

prediction_confidence = Histogram(
    'ml_prediction_confidence',
    'Prediction confidence scores',
    ['model_name'],
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99]
)

# Model health metrics
model_load_failures = Counter(
    'ml_model_load_failures_total',
    'Total model loading failures',
    ['model_name']
)

model_cache_hits = Counter(
    'ml_model_cache_hits_total',
    'Total model cache hits',
    ['cache_type']
)

model_cache_misses = Counter(
    'ml_model_cache_misses_total',
    'Total model cache misses',
    ['cache_type']
)

# Feature store metrics
feature_retrieval_latency = Histogram(
    'ml_feature_retrieval_latency_seconds',
    'Feature retrieval latency',
    ['feature_type']
)

feature_not_found = Counter(
    'ml_feature_not_found_total',
    'Features not found',
    ['feature_type']
)

# Data quality metrics
invalid_input_total = Counter(
    'ml_invalid_input_total',
    'Total invalid inputs',
    ['model_name', 'validation_error']
)

# Active models gauge
active_models = Gauge(
    'ml_active_models',
    'Number of active loaded models'
)

# Circuit breaker metrics
circuit_breaker_state = Gauge(
    'ml_circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    ['service_name']
)

circuit_breaker_failures = Counter(
    'ml_circuit_breaker_failures_total',
    'Circuit breaker failures',
    ['service_name']
)


# ==========================================
# Monitoring Decorators
# ==========================================

def track_prediction(model_name: str):
    """
    Decorator to track prediction metrics.
    
    Usage:
        @track_prediction("intent_classifier")
        def predict(query: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            status = "success"
            
            try:
                result = func(*args, **kwargs)
                
                # Track confidence if available
                if isinstance(result, dict) and 'confidence' in result:
                    prediction_confidence.labels(
                        model_name=model_name
                    ).observe(result['confidence'])
                
                return result
                
            except Exception as e:
                status = "error"
                logger.error(
                    f"Prediction error in {model_name}: {e}",
                    exc_info=True
                )
                raise
                
            finally:
                # Track latency
                duration = time.time() - start_time
                prediction_latency.labels(
                    model_name=model_name
                ).observe(duration)
                
                # Track total predictions
                prediction_total.labels(
                    model_name=model_name,
                    status=status
                ).inc()
                
                # Log slow predictions
                if duration > 1.0:
                    logger.warning(
                        f"Slow prediction in {model_name}: {duration:.2f}s"
                    )
        
        return wrapper
    return decorator


def track_feature_retrieval(feature_type: str):
    """
    Decorator to track feature retrieval metrics.
    
    Usage:
        @track_feature_retrieval("user_features")
        def get_features(user_id: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                # Track not found
                if result is None:
                    feature_not_found.labels(
                        feature_type=feature_type
                    ).inc()
                
                return result
                
            finally:
                duration = time.time() - start_time
                feature_retrieval_latency.labels(
                    feature_type=feature_type
                ).observe(duration)
        
        return wrapper
    return decorator


# ==========================================
# Monitoring Classes
# ==========================================

class PredictionTracker:
    """Track predictions for drift detection and monitoring"""
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.predictions = []
        self.max_history = 1000
    
    def log_prediction(
        self,
        input_data: Dict[str, Any],
        prediction: Dict[str, Any],
        latency: float,
        timestamp: Optional[datetime] = None
    ):
        """
        Log a prediction for monitoring and drift detection.
        
        Args:
            input_data: Input features (sanitized)
            prediction: Prediction results
            latency: Prediction latency in seconds
            timestamp: Prediction timestamp
        """
        record = {
            "model_name": self.model_name,
            "timestamp": timestamp or datetime.utcnow().isoformat(),
            "input_summary": self._summarize_input(input_data),
            "prediction": prediction,
            "latency": latency,
            "confidence": prediction.get('confidence', None)
        }
        
        self.predictions.append(record)
        
        # Keep only recent predictions
        if len(self.predictions) > self.max_history:
            self.predictions = self.predictions[-self.max_history:]
        
        # Log structured record
        logger.info(
            "prediction_logged",
            extra={
                "model_name": self.model_name,
                "confidence": record["confidence"],
                "latency": latency,
                "timestamp": record["timestamp"]
            }
        )
    
    def _summarize_input(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Summarize input data for logging (avoid storing large data)"""
        summary = {}
        
        for key, value in input_data.items():
            if isinstance(value, str):
                summary[key] = f"str(len={len(value)})"
            elif isinstance(value, (list, tuple)):
                summary[key] = f"list(len={len(value)})"
            elif isinstance(value, dict):
                summary[key] = f"dict(keys={len(value)})"
            else:
                summary[key] = type(value).__name__
        
        return summary
    
    def get_recent_predictions(self, n: int = 100) -> list:
        """Get N most recent predictions"""
        return self.predictions[-n:]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get prediction statistics"""
        if not self.predictions:
            return {}
        
        confidences = [
            p['confidence'] for p in self.predictions
            if p.get('confidence') is not None
        ]
        
        latencies = [p['latency'] for p in self.predictions]
        
        return {
            "total_predictions": len(self.predictions),
            "avg_confidence": sum(confidences) / len(confidences) if confidences else None,
            "min_confidence": min(confidences) if confidences else None,
            "max_confidence": max(confidences) if confidences else None,
            "avg_latency": sum(latencies) / len(latencies),
            "p50_latency": sorted(latencies)[len(latencies) // 2],
            "p95_latency": sorted(latencies)[int(len(latencies) * 0.95)],
            "p99_latency": sorted(latencies)[int(len(latencies) * 0.99)]
        }


class ModelHealthMonitor:
    """Monitor model health and performance"""
    
    def __init__(self):
        self.model_states = {}
    
    def register_model(self, model_name: str):
        """Register a model for monitoring"""
        self.model_states[model_name] = {
            "loaded": False,
            "load_time": None,
            "last_prediction": None,
            "prediction_count": 0,
            "error_count": 0,
            "avg_latency": 0.0
        }
        logger.info(f"Registered model for monitoring: {model_name}")
    
    def record_load(self, model_name: str, success: bool, load_time: float):
        """Record model loading"""
        if model_name not in self.model_states:
            self.register_model(model_name)
        
        self.model_states[model_name]["loaded"] = success
        self.model_states[model_name]["load_time"] = load_time
        
        if not success:
            model_load_failures.labels(model_name=model_name).inc()
            logger.error(f"Model load failed: {model_name}")
        else:
            logger.info(f"Model loaded: {model_name} in {load_time:.2f}s")
            active_models.set(sum(
                1 for s in self.model_states.values() if s["loaded"]
            ))
    
    def record_prediction(
        self,
        model_name: str,
        latency: float,
        success: bool = True
    ):
        """Record a prediction"""
        if model_name not in self.model_states:
            self.register_model(model_name)
        
        state = self.model_states[model_name]
        state["last_prediction"] = datetime.utcnow()
        state["prediction_count"] += 1
        
        if not success:
            state["error_count"] += 1
        
        # Update rolling average latency
        n = state["prediction_count"]
        state["avg_latency"] = (
            (state["avg_latency"] * (n - 1) + latency) / n
        )
    
    def get_health_status(self, model_name: str) -> Dict[str, Any]:
        """Get model health status"""
        if model_name not in self.model_states:
            return {"status": "unknown"}
        
        state = self.model_states[model_name]
        error_rate = (
            state["error_count"] / state["prediction_count"]
            if state["prediction_count"] > 0 else 0
        )
        
        # Determine health status
        if not state["loaded"]:
            status = "not_loaded"
        elif error_rate > 0.1:
            status = "unhealthy"
        elif state["avg_latency"] > 5.0:
            status = "degraded"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "loaded": state["loaded"],
            "prediction_count": state["prediction_count"],
            "error_count": state["error_count"],
            "error_rate": error_rate,
            "avg_latency": state["avg_latency"],
            "last_prediction": state["last_prediction"].isoformat() if state["last_prediction"] else None
        }
    
    def get_all_health_status(self) -> Dict[str, Dict[str, Any]]:
        """Get health status for all models"""
        return {
            name: self.get_health_status(name)
            for name in self.model_states.keys()
        }


# ==========================================
# Global Instances
# ==========================================

# Global prediction trackers
prediction_trackers: Dict[str, PredictionTracker] = {}

# Global health monitor
health_monitor = ModelHealthMonitor()


def get_prediction_tracker(model_name: str) -> PredictionTracker:
    """Get or create prediction tracker for a model"""
    if model_name not in prediction_trackers:
        prediction_trackers[model_name] = PredictionTracker(model_name)
    return prediction_trackers[model_name]


# ==========================================
# Cache Monitoring
# ==========================================

def track_cache_access(cache_type: str, hit: bool):
    """Track cache hit/miss"""
    if hit:
        model_cache_hits.labels(cache_type=cache_type).inc()
    else:
        model_cache_misses.labels(cache_type=cache_type).inc()


def track_invalid_input(model_name: str, error_type: str):
    """Track invalid input"""
    invalid_input_total.labels(
        model_name=model_name,
        validation_error=error_type
    ).inc()


# ==========================================
# Circuit Breaker Monitoring
# ==========================================

def update_circuit_breaker_state(service_name: str, state: str):
    """
    Update circuit breaker state metric.
    
    Args:
        service_name: Name of the service
        state: State ('closed', 'open', 'half_open')
    """
    state_map = {
        'closed': 0,
        'open': 1,
        'half_open': 2
    }
    
    circuit_breaker_state.labels(
        service_name=service_name
    ).set(state_map.get(state, 0))


def track_circuit_breaker_failure(service_name: str):
    """Track circuit breaker failure"""
    circuit_breaker_failures.labels(
        service_name=service_name
    ).inc()
