"""
Unit tests for credit_risk_scorer/model.py — CreditRiskScorer class.

Verifies instantiation, feature engineering, training, prediction,
boundary cases, feature importance, and save/load.
XGBoost is used directly (relatively fast) so no mocking is required
for the core model.
"""

import sys
import os
import pytest
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from credit_risk_scorer.model import CreditRiskScorer


# =============================================
# Helper: generate synthetic training data
# =============================================

def _make_training_data(n: int = 300):
    """Return a list of applicant dicts with a binary `default` target."""
    rng = np.random.RandomState(42)
    data = []
    for i in range(n):
        income = rng.uniform(20000, 200000)
        debt = rng.uniform(0, income * 0.8)
        credit_limit = rng.uniform(50000, 1000000)
        credit_used = rng.uniform(0, credit_limit)
        missed = rng.poisson(1)
        total_payments = rng.randint(6, 120)
        # Default is correlated with debt-to-income ratio
        default_prob = min(1.0, (debt / income) + missed * 0.05)
        default = int(rng.random() < default_prob)
        data.append({
            "age": int(rng.randint(21, 65)),
            "monthly_income": round(income, 2),
            "monthly_debt": round(debt, 2),
            "credit_limit": round(credit_limit, 2),
            "credit_used": round(credit_used, 2),
            "loan_amount": round(rng.uniform(50000, 2000000), 2),
            "payments_missed": int(missed),
            "total_payments": int(total_payments),
            "months_employed": int(rng.randint(1, 240)),
            "credit_history_months": int(rng.randint(3, 300)),
            "num_credit_accounts": int(rng.randint(1, 10)),
            "has_mortgage": int(rng.choice([0, 1])),
            "has_car_loan": int(rng.choice([0, 1])),
            "default": default,
        })
    return data


def _train_scorer() -> CreditRiskScorer:
    """Train and return a ready-to-use scorer."""
    scorer = CreditRiskScorer(max_depth=4, n_estimators=50, random_state=42)
    data = _make_training_data(300)
    X, y = scorer.prepare_data(data, target_col="default")
    scorer.train(X, y)
    return scorer


# =============================================
# Instantiation
# =============================================

class TestCreditRiskScorerInit:
    """Test CreditRiskScorer creation."""

    def test_default_init(self):
        scorer = CreditRiskScorer()
        assert scorer.max_depth == 6
        assert scorer.n_estimators == 100
        assert scorer.learning_rate == 0.1
        assert scorer.model is None
        assert scorer.scaler is None

    def test_custom_params(self):
        scorer = CreditRiskScorer(max_depth=3, n_estimators=200, learning_rate=0.05)
        assert scorer.max_depth == 3
        assert scorer.n_estimators == 200
        assert scorer.learning_rate == 0.05

    def test_label_encoders_empty_initially(self):
        scorer = CreditRiskScorer()
        assert scorer.label_encoders == {}


# =============================================
# Feature Engineering
# =============================================

class TestFeatureEngineering:
    """Test engineer_features method."""

    def test_debt_to_income_created(self, sample_credit_application):
        scorer = CreditRiskScorer()
        df = pd.DataFrame([sample_credit_application])
        result = scorer.engineer_features(df)
        assert "debt_to_income" in result.columns

    def test_credit_utilization_created(self, sample_credit_application):
        scorer = CreditRiskScorer()
        df = pd.DataFrame([sample_credit_application])
        result = scorer.engineer_features(df)
        assert "credit_utilization" in result.columns

    def test_loan_to_income_created(self, sample_credit_application):
        scorer = CreditRiskScorer()
        df = pd.DataFrame([sample_credit_application])
        result = scorer.engineer_features(df)
        assert "loan_to_income" in result.columns

    def test_payment_miss_rate(self, sample_credit_application):
        scorer = CreditRiskScorer()
        df = pd.DataFrame([sample_credit_application])
        result = scorer.engineer_features(df)
        assert "payment_miss_rate" in result.columns
        # 1 missed / (48 + 1) ≈ 0.0204
        assert 0 <= result["payment_miss_rate"].iloc[0] <= 1

    def test_credit_history_years(self, sample_credit_application):
        scorer = CreditRiskScorer()
        df = pd.DataFrame([sample_credit_application])
        result = scorer.engineer_features(df)
        assert "credit_history_years" in result.columns
        assert result["credit_history_years"].iloc[0] == pytest.approx(96 / 12)


# =============================================
# Training
# =============================================

class TestTraining:
    """Test model training."""

    def test_train_returns_metrics(self):
        scorer = CreditRiskScorer(max_depth=3, n_estimators=30, random_state=42)
        data = _make_training_data(200)
        X, y = scorer.prepare_data(data, target_col="default")
        metrics = scorer.train(X, y)
        assert "accuracy" in metrics
        assert "auc_roc" in metrics
        assert "f1_score" in metrics
        assert 0 <= metrics["auc_roc"] <= 1

    def test_train_sets_model_and_scaler(self):
        scorer = CreditRiskScorer(n_estimators=20, random_state=42)
        data = _make_training_data(150)
        X, y = scorer.prepare_data(data, target_col="default")
        scorer.train(X, y)
        assert scorer.model is not None
        assert scorer.scaler is not None

    def test_feature_importances_populated(self):
        scorer = _train_scorer()
        assert scorer.feature_importances_ is not None
        assert len(scorer.feature_importances_) > 0


# =============================================
# Prediction
# =============================================

class TestPredict:
    """Test single-applicant prediction."""

    def test_predict_standard_application(self, sample_credit_application):
        scorer = _train_scorer()
        result = scorer.predict(sample_credit_application)
        assert "will_default" in result
        assert "risk_score" in result
        assert "risk_category" in result
        assert isinstance(result["will_default"], bool)
        assert 0 <= result["risk_score"] <= 100
        assert result["risk_category"] in ("low", "medium", "high")

    def test_predict_returns_probability(self, sample_credit_application):
        scorer = _train_scorer()
        result = scorer.predict(sample_credit_application, return_probability=True)
        assert "default_probability" in result
        assert "no_default_probability" in result
        assert 0 <= result["default_probability"] <= 1
        assert result["default_probability"] + result["no_default_probability"] == pytest.approx(1.0)

    def test_predict_without_probability(self, sample_credit_application):
        scorer = _train_scorer()
        result = scorer.predict(sample_credit_application, return_probability=False)
        assert "default_probability" not in result

    def test_predict_raises_when_untrained(self, sample_credit_application):
        scorer = CreditRiskScorer()
        with pytest.raises(ValueError, match="not trained"):
            scorer.predict(sample_credit_application)


# =============================================
# Boundary / Edge Cases
# =============================================

class TestBoundaryCases:
    """Test edge cases and boundary inputs."""

    def test_risk_score_range(self, sample_credit_application, high_risk_credit_application, low_risk_credit_application):
        """Risk scores must always be in [0, 100]."""
        scorer = _train_scorer()
        for app in [sample_credit_application, high_risk_credit_application, low_risk_credit_application]:
            result = scorer.predict(app)
            assert 0 <= result["risk_score"] <= 100

    def test_risk_category_low(self):
        """Score < 30 → 'low'."""
        scorer = _train_scorer()
        # We can't guarantee a specific score, but we verify the mapping logic
        # by checking that the model at least returns a valid category
        data = _make_training_data(10)
        for d in data:
            d.pop("default", None)
            result = scorer.predict(d)
            if result["risk_score"] < 30:
                assert result["risk_category"] == "low"
            elif result["risk_score"] < 60:
                assert result["risk_category"] == "medium"
            else:
                assert result["risk_category"] == "high"

    def test_zero_income_application(self):
        """Applicant with zero income should not crash."""
        scorer = _train_scorer()
        app = {
            "age": 30,
            "monthly_income": 0.0,
            "monthly_debt": 0.0,
            "credit_limit": 10000.0,
            "credit_used": 5000.0,
            "loan_amount": 50000.0,
            "payments_missed": 0,
            "total_payments": 12,
            "months_employed": 6,
            "credit_history_months": 12,
            "num_credit_accounts": 1,
            "has_mortgage": 0,
            "has_car_loan": 0,
        }
        result = scorer.predict(app)
        assert "risk_score" in result

    def test_very_high_values(self):
        """Extreme numerical values should not cause overflow."""
        scorer = _train_scorer()
        app = {
            "age": 60,
            "monthly_income": 10_000_000.0,
            "monthly_debt": 500_000.0,
            "credit_limit": 50_000_000.0,
            "credit_used": 1_000_000.0,
            "loan_amount": 100_000_000.0,
            "payments_missed": 0,
            "total_payments": 600,
            "months_employed": 480,
            "credit_history_months": 480,
            "num_credit_accounts": 20,
            "has_mortgage": 1,
            "has_car_loan": 1,
        }
        result = scorer.predict(app)
        assert 0 <= result["risk_score"] <= 100


# =============================================
# Feature Importance
# =============================================

class TestFeatureImportance:
    """Test feature importance extraction."""

    def test_get_feature_importance_returns_list(self):
        scorer = _train_scorer()
        importance = scorer.get_feature_importance(top_n=5)
        assert isinstance(importance, list)
        assert len(importance) <= 5

    def test_feature_importance_item_shape(self):
        scorer = _train_scorer()
        importance = scorer.get_feature_importance(top_n=3)
        for item in importance:
            assert "feature" in item
            assert "importance" in item
            assert isinstance(item["importance"], float)

    def test_feature_importance_raises_untrained(self):
        scorer = CreditRiskScorer()
        with pytest.raises(ValueError, match="not trained"):
            scorer.get_feature_importance()


# =============================================
# Save / Load Round-trip
# =============================================

class TestSaveLoad:
    """Test model persistence."""

    def test_save_load_round_trip(self, tmp_path, sample_credit_application):
        scorer = _train_scorer()
        save_dir = str(tmp_path / "credit_model")
        scorer.save(save_dir)

        loaded = CreditRiskScorer.load(save_dir)
        result = loaded.predict(sample_credit_application)
        assert "risk_score" in result
        assert 0 <= result["risk_score"] <= 100

    def test_save_raises_when_untrained(self, tmp_path):
        scorer = CreditRiskScorer()
        with pytest.raises(ValueError, match="not trained"):
            scorer.save(str(tmp_path / "nope"))
