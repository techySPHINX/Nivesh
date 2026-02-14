# ML Services Security & Resilience Quick Reference

Quick guide for using the new security and resilience features.

---

## 🔐 Security Features

### Input Validation

```python
from shared.security import InputValidator

# Validate text
try:
    clean_text = InputValidator.validate_text(
        user_input,
        field_name="query",
        min_length=3,
        max_length=512
    )
except ValueError as e:
    # Handle validation error
    print(f"Invalid input: {e}")

# Validate user ID
user_id = InputValidator.validate_user_id("user_123")  # ✅ Valid
# user_id = InputValidator.validate_user_id("user@123")  # ❌ Raises ValueError

# Validate numbers
amount = InputValidator.validate_numeric(
    100.50,
    field_name="amount",
    min_value=0,
    max_value=1000000
)

# Validate dictionaries
data = InputValidator.validate_dict(
    {"name": "John", "age": 30},
    required_fields=["name", "age"]
)
```

### API Authentication

**Server Side:**

```python
from fastapi import Depends
from shared.security import verify_api_key

@app.post("/predict")
async def predict(
    request: PredictRequest,
    api_key: str = Depends(verify_api_key)  # Requires X-API-Key header
):
    return model.predict(request.query)
```

**Client Side:**

```bash
# cURL
curl -X POST http://localhost:8000/predict/intent \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is my balance?"}'

# Python
import requests

headers = {
    "X-API-Key": "your-secret-key",
    "Content-Type": "application/json"
}

response = requests.post(
    "http://localhost:8000/predict/intent",
    headers=headers,
    json={"query": "What is my balance?"}
)
```

**Configuration:**

```bash
# .env file
ML_API_KEYS=key1,key2,key3
```

### Rate Limiting

**Server Side:**

```python
from fastapi import Depends
from shared.security import check_rate_limit

@app.post("/predict")
async def predict(
    request: Request,
    _rate_limit: None = Depends(check_rate_limit)  # 100/minute per IP
):
    return {"result": "ok"}
```

**Client Response (Rate Limited):**

```json
{
  "detail": "Rate limit exceeded. Please try again later."
}
```

HTTP Status: 429 Too Many Requests

**Configuration:**

```python
from shared.security import SecurityConfig

config = SecurityConfig(
    rate_limit_per_minute=100  # Adjust as needed
)
```

---

## 🔄 Resilience Features

### Circuit Breaker

**Decorator Usage:**

```python
from shared.circuit_breaker import circuit_breaker

@circuit_breaker("redis", failure_threshold=5, recovery_timeout=60)
def get_from_redis(key: str):
    return redis_client.get(key)

try:
    data = get_from_redis("user:123")
except Exception as e:
    if "Circuit breaker is OPEN" in str(e):
        # Service unavailable, use fallback
        data = get_default_data()
```

**Function Call Usage:**

```python
from shared.circuit_breaker import get_circuit_breaker

breaker = get_circuit_breaker("database", failure_threshold=3)

def query_database():
    return breaker.call(db.execute, "SELECT * FROM users")
```

**Check Circuit Status:**

```python
from shared.circuit_breaker import get_all_circuit_breakers_status

status = get_all_circuit_breakers_status()
# {
#     "redis": {"state": "closed", "failure_count": 0},
#     "database": {"state": "open", "failure_count": 5, "time_until_reset": 45.3}
# }
```

**Manual Reset:**

```python
from shared.circuit_breaker import get_circuit_breaker

breaker = get_circuit_breaker("redis")
breaker.reset()  # Manually close the circuit
```

### Retry with Exponential Backoff

**Decorator Usage:**

```python
from shared.retry import retry_with_backoff

@retry_with_backoff(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=10.0,
    exponential_base=2.0,
    jitter=True,
    retry_on=(ConnectionError, TimeoutError)
)
def fetch_data_from_api():
    response = requests.get("https://api.example.com/data")
    response.raise_for_status()
    return response.json()

# Will retry up to 3 times with delays: ~1s, ~2s, ~4s (with jitter)
```

**Predefined Retry Configs:**

```python
from shared.retry import retry_redis, retry_database, retry_mlflow

@retry_redis(max_attempts=3)  # Optimized for Redis
def cache_get(key):
    return redis_client.get(key)

@retry_database(max_attempts=3)  # Optimized for databases
def query_user(user_id):
    return db.query(User).filter_by(id=user_id).first()

@retry_mlflow(max_attempts=5)  # Optimized for MLflow
def load_model(model_name):
    return mlflow.load_model(f"models:/{model_name}/production")
```

**Retrier Class:**

```python
from shared.retry import Retrier, RetryConfig

retrier = Retrier(RetryConfig(
    max_attempts=5,
    initial_delay=2.0,
    max_delay=30.0,
    retry_on=(ConnectionError,)
))

result = retrier.call(expensive_api_call, arg1, arg2)
```

---

## ⚠️ Custom Exceptions

### Using Custom Exceptions

```python
from shared.exceptions import (
    ValidationError,
    ModelNotLoadedError,
    ModelPredictionError,
    FeatureNotFoundError
)

# Raise custom exception
def predict(query: str):
    if not query:
        raise ValidationError("Query cannot be empty")

    if not model_loaded:
        raise ModelNotLoadedError("Model not initialized")

    try:
        result = model.predict(query)
    except Exception as e:
        raise ModelPredictionError(f"Prediction failed: {e}")

    return result
```

### Exception Hierarchy

```
MLServiceError (base)
├── ModelError
│   ├── ModelNotLoadedError
│   ├── ModelLoadError
│   ├── ModelPredictionError
│   └── ModelTrainingError
├── ValidationError
│   ├── InvalidInputError
│   └── MissingFieldError
├── FeatureStoreError
│   ├── FeatureNotFoundError
│   └── FeatureCacheError
├── DataError
│   ├── DataValidationError
│   ├── DataPreparationError
│   └── InsufficientDataError
├── ExternalServiceError
│   ├── RedisConnectionError
│   ├── DatabaseError
│   └── MLflowError
├── ConfigurationError
│   └── MissingConfigError
├── ResourceError
│   ├── ResourceNotFoundError
│   └── ResourceExhaustedError
├── TimeoutError
│   ├── PredictionTimeoutError
│   └── TrainingTimeoutError
└── CircuitBreakerError
```

### Error Handling in API

```python
from fastapi import HTTPException
from shared.exceptions import ValidationError, ModelNotLoadedError

@app.post("/predict")
async def predict(request: PredictRequest):
    try:
        result = model.predict(request.query)
        return result
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ModelNotLoadedError as e:
        raise HTTPException(status_code=503, detail="Service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

## 🔍 Logging & Monitoring

### Sanitize Sensitive Data

```python
from shared.security import sanitize_log_data

user_data = {
    "user_id": "123",
    "password": "secret123",
    "api_key": "sk-abc",
    "amount": 100.50
}

safe_data = sanitize_log_data(user_data)
logger.info(f"User data: {safe_data}")
# Output: {'user_id': '123', 'password': '***REDACTED***', 'api_key': '***REDACTED***', 'amount': 100.5}
```

### Monitor Circuit Breakers

```python
import logging
from shared.circuit_breaker import get_all_circuit_breakers_status

logger = logging.getLogger(__name__)

# Periodic health check
def check_service_health():
    circuit_status = get_all_circuit_breakers_status()

    for service, status in circuit_status.items():
        if status["state"] == "open":
            logger.error(
                f"Circuit breaker OPEN for {service}. "
                f"Failures: {status['failure_count']}, "
                f"Reset in: {status['time_until_reset']:.1f}s"
            )
```

---

## 🧪 Testing

### Test with Security Features

```python
import pytest
from fastapi.testclient import TestClient
from your_app import app

client = TestClient(app)

def test_api_without_auth():
    """Test API requires authentication"""
    response = client.post("/predict/intent", json={"query": "test"})
    assert response.status_code == 403

def test_api_with_auth():
    """Test API with valid authentication"""
    headers = {"X-API-Key": "test-key"}
    response = client.post(
        "/predict/intent",
        headers=headers,
        json={"query": "What is my balance?"}
    )
    assert response.status_code == 200

def test_rate_limiting():
    """Test rate limiting works"""
    headers = {"X-API-Key": "test-key"}

    # Make 101 requests (limit is 100)
    for i in range(101):
        response = client.post(
            "/predict/intent",
            headers=headers,
            json={"query": f"test query {i}"}
        )

    # Last request should be rate limited
    assert response.status_code == 429
```

---

## 📋 Configuration

### Environment Variables

```bash
# Security
ML_API_KEYS=key1,key2,key3

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100

# Input Validation
MAX_TEXT_LENGTH=1024
MAX_BATCH_SIZE=32

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60

# Retry
MAX_RETRY_ATTEMPTS=3
RETRY_INITIAL_DELAY=1.0
RETRY_MAX_DELAY=60.0
```

### Python Configuration

```python
from shared.security import SecurityConfig
from shared.circuit_breaker import CircuitBreaker
from shared.retry import RetryConfig

# Security
security_config = SecurityConfig(
    max_text_length=1024,
    max_batch_size=32,
    rate_limit_per_minute=100
)

# Circuit Breaker
redis_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    success_threshold=2
)

# Retry
retry_config = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=60.0,
    exponential_base=2.0,
    jitter=True
)
```

---

## 🚨 Troubleshooting

### Common Issues

**Issue:** API returns 403 Forbidden

```
Solution: Add X-API-Key header with valid API key
```

**Issue:** API returns 429 Too Many Requests

```
Solution: Wait for rate limit window to reset (60 seconds)
Or: Contact admin to increase rate limit
```

**Issue:** Circuit breaker is OPEN

```
Solution: Wait for recovery timeout, or manually reset:
  breaker = get_circuit_breaker("service_name")
  breaker.reset()
```

**Issue:** Validation errors

```
Solution: Check error message for specific validation failure
Common: Empty input, too long, invalid characters, wrong type
```

---

## 📚 Additional Resources

- **Comprehensive Analysis:** See `COMPREHENSIVE_ANALYSIS.md`
- **Improvements Summary:** See `ML_SERVICES_IMPROVEMENTS_SUMMARY.md`
- **API Documentation:** See `docs/RAG_API_REFERENCE.md`
- **Testing Guide:** Run `pytest test/test_security.py test/test_circuit_breaker.py`

---

## 💡 Best Practices

1. **Always validate inputs** before processing
2. **Use circuit breakers** for all external services (Redis, DB, APIs)
3. **Retry transient failures** with exponential backoff
4. **Sanitize logs** before writing sensitive data
5. **Handle exceptions** with appropriate HTTP status codes
6. **Monitor circuit breaker states** for service health
7. **Test authentication** in all environments
8. **Configure rate limits** based on expected load
9. **Use custom exceptions** for better error categorization
10. **Add timeouts** to all external service calls

---

**Last Updated:** January 27, 2026  
**Version:** 2.0.0  
**Branch:** ml-services-improvements
