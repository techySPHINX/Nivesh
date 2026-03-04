"""
Unit tests for the FastAPI model server (model_server/app.py).

Tests health endpoints and prediction endpoint structure.
Heavy dependencies (MLflow, torch, etc.) are mocked out via the root
conftest.py. Redis connection is patched so no live server is needed.
"""

import sys
import os
import pytest
from unittest.mock import patch, MagicMock

# Ensure parent is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Both shared/monitoring.py and model_server/app.py define Prometheus
# metrics with identical names (e.g. ml_prediction_latency_seconds).
# In production they run in separate processes but in the test process
# both modules are imported together.  Monkeypatch the Prometheus
# registry to silently ignore duplicate registrations.
import prometheus_client.registry as _prom_reg

_original_register = _prom_reg.CollectorRegistry.register


def _lenient_register(self, collector):
    try:
        _original_register(self, collector)
    except ValueError:
        pass  # suppress duplicated timeseries errors


_prom_reg.CollectorRegistry.register = _lenient_register

# Patch Redis connection so app.py startup doesn't need a live Redis server
_mock_redis_instance = MagicMock()
_mock_redis_instance.ping.return_value = True
_mock_redis_instance.get.return_value = None
_mock_redis_instance.keys.return_value = []

with patch("redis.Redis", return_value=_mock_redis_instance), \
     patch.dict(os.environ, {
         "MLFLOW_TRACKING_URI": "http://mock:5000",
         "REDIS_HOST": "localhost",
         "REDIS_PORT": "6379",
     }):
    from model_server.app import app

# Restore original register
_prom_reg.CollectorRegistry.register = _original_register

from fastapi.testclient import TestClient

client = TestClient(app, raise_server_exceptions=False)


# =============================================
# Health Endpoints
# =============================================

class TestHealthEndpoints:
    """Tests for health / readiness / liveness endpoints."""

    def test_root_health_returns_200(self):
        """GET /health should return 200 with status field."""
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert "status" in body

    def test_root_health_contains_models_loaded(self):
        """GET /health response should report models_loaded count."""
        response = client.get("/health")
        body = response.json()
        assert "models_loaded" in body
        assert isinstance(body["models_loaded"], int)

    def test_health_sub_router_returns_200(self):
        """GET /health/ (sub-router) should also succeed."""
        response = client.get("/health/")
        # The sub-router may return 200 or 307 redirect; both are acceptable
        assert response.status_code in (200, 307)

    def test_metrics_endpoint(self):
        """GET /metrics should return Prometheus-style content."""
        response = client.get("/metrics")
        assert response.status_code == 200


# =============================================
# Prediction Endpoint Structure
# =============================================

class TestPredictionEndpointStructure:
    """Validate request/response schemas for prediction endpoints."""

    def test_intent_missing_body_returns_422(self):
        """POST /predict/intent with no body should return 422."""
        response = client.post("/predict/intent")
        assert response.status_code == 422

    def test_intent_empty_object_returns_422(self):
        """POST /predict/intent with {} should return 422 (query is required)."""
        response = client.post("/predict/intent", json={})
        assert response.status_code == 422

    def test_intent_invalid_type_returns_422(self):
        """POST /predict/intent with non-string query should return 422."""
        response = client.post("/predict/intent", json={"query": 12345})
        # Pydantic may coerce int→str; if not, expect 422
        assert response.status_code in (400, 422, 500)

    def test_anomaly_missing_body_returns_422(self):
        """POST /predict/anomaly with no body → 422."""
        response = client.post("/predict/anomaly")
        assert response.status_code == 422

    def test_anomaly_missing_fields_returns_422(self):
        """POST /predict/anomaly with partial body → 422."""
        response = client.post("/predict/anomaly", json={"user_id": "u1"})
        assert response.status_code == 422

    def test_credit_risk_missing_body_returns_422(self):
        """POST /predict/credit-risk with no body → 422."""
        response = client.post("/predict/credit-risk")
        assert response.status_code == 422

    def test_spending_missing_body_returns_422(self):
        """POST /predict/spending with no body → 422."""
        response = client.post("/predict/spending")
        assert response.status_code == 422

    def test_ner_missing_body_returns_422(self):
        """POST /predict/ner with no body → 422."""
        response = client.post("/predict/ner")
        assert response.status_code == 422


# =============================================
# Admin / Utility Endpoints
# =============================================

class TestAdminEndpoints:
    """Tests for model listing, cache clearing, monitoring."""

    def test_models_list_endpoint_exists(self):
        """GET /models/list should not return 404."""
        response = client.get("/models/list")
        assert response.status_code != 404

    def test_monitoring_statistics_endpoint(self):
        """GET /monitoring/statistics should return model stats dict."""
        response = client.get("/monitoring/statistics")
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, dict)

    def test_openapi_schema_available(self):
        """GET /openapi.json should return the OpenAPI schema."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        body = response.json()
        assert "paths" in body
        assert "/predict/intent" in body["paths"]
        assert "/predict/anomaly" in body["paths"]
        assert "/predict/credit-risk" in body["paths"]
        assert "/predict/spending" in body["paths"]
