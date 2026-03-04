"""
Unit tests for anomaly_detector/model.py — AnomalyDetector class.

Verifies instantiation, feature engineering, training, single-transaction
prediction, batch prediction, input validation, and save/load round-trip.
sklearn's IsolationForest is used directly (lightweight), so we do NOT
need to mock it.
"""

import sys
import os
import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Ensure the ml-services root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from anomaly_detector.model import AnomalyDetector


# =============================================
# Helper: generate synthetic training data
# =============================================

def _make_training_transactions(n: int = 200):
    """Return a list of transaction dicts suitable for training."""
    rng = np.random.RandomState(42)
    base_date = datetime(2025, 6, 1)
    categories = ["groceries", "dining", "utilities", "shopping", "transport"]
    merchants = ["BigBasket", "Swiggy", "Amazon", "Uber", "PhonePe"]
    txns = []
    for i in range(n):
        txns.append({
            "transaction_id": f"txn_{i:04d}",
            "user_id": "user_A" if i % 3 != 0 else "user_B",
            "amount": float(rng.lognormal(7, 0.8)),
            "date": (base_date + timedelta(days=i % 90)).strftime("%Y-%m-%d"),
            "category": categories[i % len(categories)],
            "merchant": merchants[i % len(merchants)],
        })
    return txns


def _train_detector(contamination: float = 0.05) -> AnomalyDetector:
    """Train and return a ready-to-use detector."""
    detector = AnomalyDetector(contamination=contamination, n_estimators=50, random_state=42)
    txns = _make_training_transactions(200)
    X, _ = detector.prepare_data(txns)
    detector.train(X)
    return detector


# =============================================
# Instantiation
# =============================================

class TestAnomalyDetectorInit:
    """Test AnomalyDetector object creation."""

    def test_default_init(self):
        det = AnomalyDetector()
        assert det.contamination == 0.01
        assert det.n_estimators == 100
        assert det.model is None
        assert det.scaler is None

    def test_custom_params(self):
        det = AnomalyDetector(contamination=0.05, n_estimators=50, random_state=0)
        assert det.contamination == 0.05
        assert det.n_estimators == 50
        assert det.random_state == 0

    def test_user_profiles_empty_initially(self):
        det = AnomalyDetector()
        assert det.user_profiles == {}


# =============================================
# Feature Engineering
# =============================================

class TestFeatureEngineering:
    """Test engineer_features and build_user_profiles."""

    def test_engineer_features_adds_columns(self):
        det = AnomalyDetector()
        txns = _make_training_transactions(20)
        df = pd.DataFrame(txns)
        featured = det.engineer_features(df)
        assert "log_amount" in featured.columns
        assert "amount_zscore" in featured.columns

    def test_build_user_profiles(self):
        det = AnomalyDetector()
        txns = _make_training_transactions(60)
        df = pd.DataFrame(txns)
        df["date"] = pd.to_datetime(df["date"])
        profiles = det.build_user_profiles(df)
        assert "user_A" in profiles
        assert "mean_amount" in profiles["user_A"]
        assert profiles["user_A"]["total_transactions"] > 0


# =============================================
# Training
# =============================================

class TestTraining:
    """Test model training."""

    def test_train_returns_metrics(self):
        det = AnomalyDetector(contamination=0.05, n_estimators=50, random_state=42)
        txns = _make_training_transactions(200)
        X, _ = det.prepare_data(txns)
        metrics = det.train(X)
        assert "n_samples" in metrics
        assert "anomaly_rate" in metrics
        assert 0 <= metrics["anomaly_rate"] <= 1

    def test_train_sets_model_and_scaler(self):
        det = AnomalyDetector(n_estimators=30, random_state=42)
        txns = _make_training_transactions(100)
        X, _ = det.prepare_data(txns)
        det.train(X)
        assert det.model is not None
        assert det.scaler is not None

    def test_train_with_labels(self):
        det = AnomalyDetector(contamination=0.05, n_estimators=50, random_state=42)
        txns = _make_training_transactions(200)
        labels = np.array([1] * 190 + [-1] * 10)  # 10 anomalies
        X, y = det.prepare_data(txns, labels=labels)
        metrics = det.train(X, y)
        assert "accuracy" in metrics
        assert "precision" in metrics
        assert "recall" in metrics


# =============================================
# Single Prediction
# =============================================

class TestPredict:
    """Test single-transaction prediction."""

    def test_predict_normal_transaction(self, sample_transaction):
        det = _train_detector()
        result = det.predict(sample_transaction)
        assert "is_anomaly" in result
        assert isinstance(result["is_anomaly"], bool)
        assert "confidence" in result

    def test_predict_with_score(self, sample_transaction):
        det = _train_detector()
        result = det.predict(sample_transaction, return_score=True)
        assert "anomaly_score" in result
        assert "threshold" in result
        assert isinstance(result["anomaly_score"], float)

    def test_predict_anomalous_transaction(self, anomalous_transaction):
        det = _train_detector()
        result = det.predict(anomalous_transaction, return_score=True)
        # We just verify the output shape; the actual flag depends on the learned model
        assert "is_anomaly" in result
        assert isinstance(result["anomaly_score"], float)

    def test_predict_raises_when_untrained(self, sample_transaction):
        det = AnomalyDetector()
        with pytest.raises(ValueError, match="Model not trained"):
            det.predict(sample_transaction)

    def test_predict_raises_on_non_dict_input(self):
        det = _train_detector()
        with pytest.raises(TypeError, match="must be a dictionary"):
            det.predict("not a dict")

    def test_predict_raises_on_empty_dict(self):
        det = _train_detector()
        with pytest.raises(ValueError, match="cannot be empty"):
            det.predict({})

    def test_predict_raises_on_missing_required_fields(self):
        det = _train_detector()
        with pytest.raises(ValueError, match="missing required fields"):
            det.predict({"category": "groceries"})

    def test_predict_raises_on_negative_amount(self):
        det = _train_detector()
        with pytest.raises(ValueError, match="cannot be negative"):
            det.predict({"amount": -100, "date": "2026-01-01"})


# =============================================
# Batch Prediction
# =============================================

class TestBatchPredict:
    """Test batch prediction."""

    def test_batch_predict_returns_list(self):
        det = _train_detector()
        txns = _make_training_transactions(10)
        results = det.predict_batch(txns)
        assert isinstance(results, list)
        assert len(results) == 10

    def test_batch_predict_result_shape(self):
        det = _train_detector()
        txns = _make_training_transactions(5)
        results = det.predict_batch(txns)
        for r in results:
            assert "is_anomaly" in r
            assert "anomaly_score" in r
            assert "confidence" in r


# =============================================
# Save / Load Round-trip
# =============================================

class TestSaveLoad:
    """Test model persistence."""

    def test_save_load_round_trip(self, tmp_path, sample_transaction):
        det = _train_detector()
        save_dir = str(tmp_path / "anomaly_model")
        det.save(save_dir)

        loaded = AnomalyDetector.load(save_dir)
        result = loaded.predict(sample_transaction, return_score=True)
        assert "is_anomaly" in result
        assert "anomaly_score" in result

    def test_save_raises_when_untrained(self, tmp_path):
        det = AnomalyDetector()
        with pytest.raises(ValueError, match="Model not trained"):
            det.save(str(tmp_path / "nope"))
