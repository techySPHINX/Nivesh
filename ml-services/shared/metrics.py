"""
Prometheus metrics for ML services
"""
from prometheus_client import Counter, Histogram, Gauge
from functools import wraps
import time
from typing import Callable, Any


# Prediction counters
predictions_total = Counter(
    'ml_predictions_total',
    'Total number of predictions',
    ['model_name', 'status']
)

# Latency histogram
prediction_latency = Histogram(
    'ml_prediction_latency_seconds',
    'Prediction latency in seconds',
    ['model_name']
)

# Error counter
errors_total = Counter(
    'ml_errors_total',
    'Total number of errors',
    ['model_name', 'error_type']
)

# Model accuracy gauge
model_accuracy = Gauge(
    'ml_model_accuracy',
    'Current model accuracy',
    ['model_name']
)

# Drift score gauge
drift_score = Gauge(
    'ml_drift_score',
    'Data drift score',
    ['model_name', 'feature']
)

# Active models gauge
active_models = Gauge(
    'ml_active_models',
    'Number of loaded models'
)


def track_prediction(model_name: str, status: str = 'success'):
    """Track a prediction event"""
    predictions_total.labels(model_name=model_name, status=status).inc()


def track_latency(model_name: str):
    """Decorator to track prediction latency"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                latency = time.time() - start_time
                prediction_latency.labels(model_name=model_name).observe(latency)
                return result
            except Exception as e:
                latency = time.time() - start_time
                prediction_latency.labels(model_name=model_name).observe(latency)
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                latency = time.time() - start_time
                prediction_latency.labels(model_name=model_name).observe(latency)
                return result
            except Exception as e:
                latency = time.time() - start_time
                prediction_latency.labels(model_name=model_name).observe(latency)
                raise
        
        # Return appropriate wrapper based on function type
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def increment_error(model_name: str, error_type: str):
    """Track an error event"""
    errors_total.labels(model_name=model_name, error_type=error_type).inc()


def update_model_accuracy(model_name: str, accuracy: float):
    """Update model accuracy metric"""
    model_accuracy.labels(model_name=model_name).set(accuracy)


def update_drift_score(model_name: str, feature: str, score: float):
    """Update drift score metric"""
    drift_score.labels(model_name=model_name, feature=feature).set(score)


def set_active_models(count: int):
    """Set number of active models"""
    active_models.set(count)
