"""
Tests for monitoring utilities

Test Coverage:
- Prediction tracking
- Model health monitoring
- Cache access tracking
- Prometheus metrics
"""

import pytest
import time
from datetime import datetime
from shared.monitoring import (
    PredictionTracker, ModelHealthMonitor,
    track_cache_access, track_invalid_input,
    get_prediction_tracker, health_monitor,
    prediction_total, prediction_latency
)


class TestPredictionTracker:
    """Test PredictionTracker class"""

    def test_log_prediction(self):
        """Test logging a prediction"""
        tracker = PredictionTracker("test_model")

        tracker.log_prediction(
            input_data={"query": "test"},
            prediction={"intent": "test", "confidence": 0.95},
            latency=0.15
        )

        assert len(tracker.predictions) == 1
        assert tracker.predictions[0]["model_name"] == "test_model"
        assert tracker.predictions[0]["confidence"] == 0.95
        assert tracker.predictions[0]["latency"] == 0.15

    def test_max_history_limit(self):
        """Test that predictions are limited to max_history"""
        tracker = PredictionTracker("test_model")
        tracker.max_history = 10

        # Add more than max_history predictions
        for i in range(15):
            tracker.log_prediction(
                input_data={"query": f"test{i}"},
                prediction={"result": i},
                latency=0.1
            )

        assert len(tracker.predictions) == 10
        # Should keep most recent
        assert tracker.predictions[-1]["prediction"]["result"] == 14

    def test_get_recent_predictions(self):
        """Test getting recent predictions"""
        tracker = PredictionTracker("test_model")

        for i in range(20):
            tracker.log_prediction(
                input_data={"query": f"test{i}"},
                prediction={"result": i},
                latency=0.1
            )

        recent = tracker.get_recent_predictions(5)
        assert len(recent) == 5
        assert recent[-1]["prediction"]["result"] == 19

    def test_get_statistics(self):
        """Test getting prediction statistics"""
        tracker = PredictionTracker("test_model")

        # Add predictions with varying confidence and latency
        tracker.log_prediction(
            input_data={"query": "test1"},
            prediction={"confidence": 0.9},
            latency=0.1
        )
        tracker.log_prediction(
            input_data={"query": "test2"},
            prediction={"confidence": 0.7},
            latency=0.3
        )
        tracker.log_prediction(
            input_data={"query": "test3"},
            prediction={"confidence": 0.8},
            latency=0.2
        )

        stats = tracker.get_statistics()

        assert stats["total_predictions"] == 3
        assert stats["avg_confidence"] == pytest.approx(0.8, abs=0.01)
        assert stats["min_confidence"] == 0.7
        assert stats["max_confidence"] == 0.9
        assert stats["avg_latency"] == pytest.approx(0.2, abs=0.01)

    def test_statistics_empty(self):
        """Test statistics with no predictions"""
        tracker = PredictionTracker("test_model")
        stats = tracker.get_statistics()
        assert stats == {}


class TestModelHealthMonitor:
    """Test ModelHealthMonitor class"""

    def test_register_model(self):
        """Test registering a model"""
        monitor = ModelHealthMonitor()
        monitor.register_model("test_model")

        assert "test_model" in monitor.model_states
        assert monitor.model_states["test_model"]["loaded"] == False
        assert monitor.model_states["test_model"]["prediction_count"] == 0

    def test_record_load_success(self):
        """Test recording successful model load"""
        monitor = ModelHealthMonitor()
        monitor.record_load("test_model", success=True, load_time=1.5)

        assert monitor.model_states["test_model"]["loaded"] == True
        assert monitor.model_states["test_model"]["load_time"] == 1.5

    def test_record_load_failure(self):
        """Test recording failed model load"""
        monitor = ModelHealthMonitor()
        monitor.record_load("test_model", success=False, load_time=0)

        assert monitor.model_states["test_model"]["loaded"] == False

    def test_record_prediction(self):
        """Test recording predictions"""
        monitor = ModelHealthMonitor()
        monitor.register_model("test_model")

        monitor.record_prediction("test_model", latency=0.2, success=True)
        monitor.record_prediction("test_model", latency=0.3, success=True)

        state = monitor.model_states["test_model"]
        assert state["prediction_count"] == 2
        assert state["error_count"] == 0
        assert state["avg_latency"] == pytest.approx(0.25, abs=0.01)

    def test_record_prediction_errors(self):
        """Test recording prediction errors"""
        monitor = ModelHealthMonitor()
        monitor.register_model("test_model")

        monitor.record_prediction("test_model", latency=0.2, success=True)
        monitor.record_prediction("test_model", latency=0.3, success=False)

        state = monitor.model_states["test_model"]
        assert state["prediction_count"] == 2
        assert state["error_count"] == 1

    def test_get_health_status_healthy(self):
        """Test health status for healthy model"""
        monitor = ModelHealthMonitor()
        monitor.record_load("test_model", success=True, load_time=1.0)

        for _ in range(10):
            monitor.record_prediction("test_model", latency=0.1, success=True)

        health = monitor.get_health_status("test_model")

        assert health["status"] == "healthy"
        assert health["loaded"] == True
        assert health["error_rate"] == 0.0
        assert health["prediction_count"] == 10

    def test_get_health_status_unhealthy(self):
        """Test health status for unhealthy model (high error rate)"""
        monitor = ModelHealthMonitor()
        monitor.record_load("test_model", success=True, load_time=1.0)

        # Add predictions with high error rate (>10%)
        for _ in range(5):
            monitor.record_prediction("test_model", latency=0.1, success=False)
        for _ in range(5):
            monitor.record_prediction("test_model", latency=0.1, success=True)

        health = monitor.get_health_status("test_model")

        assert health["status"] == "unhealthy"
        assert health["error_rate"] == 0.5

    def test_get_health_status_degraded(self):
        """Test health status for degraded model (slow)"""
        monitor = ModelHealthMonitor()
        monitor.record_load("test_model", success=True, load_time=1.0)

        # Add slow predictions
        for _ in range(10):
            monitor.record_prediction("test_model", latency=6.0, success=True)

        health = monitor.get_health_status("test_model")

        assert health["status"] == "degraded"
        assert health["avg_latency"] > 5.0

    def test_get_health_status_not_loaded(self):
        """Test health status for unloaded model"""
        monitor = ModelHealthMonitor()
        monitor.record_load("test_model", success=False, load_time=0)

        health = monitor.get_health_status("test_model")

        assert health["status"] == "not_loaded"
        assert health["loaded"] == False

    def test_get_health_status_unknown(self):
        """Test health status for unknown model"""
        monitor = ModelHealthMonitor()
        health = monitor.get_health_status("nonexistent_model")

        assert health["status"] == "unknown"

    def test_get_all_health_status(self):
        """Test getting health status for all models"""
        monitor = ModelHealthMonitor()

        monitor.register_model("model1")
        monitor.register_model("model2")
        monitor.record_load("model1", success=True, load_time=1.0)

        all_health = monitor.get_all_health_status()

        assert "model1" in all_health
        assert "model2" in all_health
        assert all_health["model1"]["loaded"] == True
        assert all_health["model2"]["loaded"] == False


class TestTrackingFunctions:
    """Test global tracking functions"""

    def test_get_prediction_tracker(self):
        """Test getting/creating prediction tracker"""
        tracker1 = get_prediction_tracker("model1")
        tracker2 = get_prediction_tracker("model1")
        tracker3 = get_prediction_tracker("model2")

        # Same model should return same tracker
        assert tracker1 is tracker2
        # Different model should return different tracker
        assert tracker1 is not tracker3

    def test_track_cache_access(self):
        """Test tracking cache access (should not raise errors)"""
        try:
            track_cache_access("test_cache", hit=True)
            track_cache_access("test_cache", hit=False)
        except Exception as e:
            pytest.fail(f"track_cache_access raised exception: {e}")

    def test_track_invalid_input(self):
        """Test tracking invalid input (should not raise errors)"""
        try:
            track_invalid_input("test_model", "validation_error")
        except Exception as e:
            pytest.fail(f"track_invalid_input raised exception: {e}")


class TestPrometheusMetrics:
    """Test Prometheus metrics integration"""

    def test_prediction_counter_exists(self):
        """Test that prediction counter metric exists"""
        assert prediction_total is not None

        # Increment counter
        prediction_total.labels(model_name="test", status="success").inc()

    def test_prediction_latency_histogram_exists(self):
        """Test that prediction latency histogram exists"""
        assert prediction_latency is not None

        # Observe latency
        prediction_latency.labels(model_name="test").observe(0.123)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
