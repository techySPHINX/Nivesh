"""
Unit tests for spending_predictor/model.py — SpendingPredictor class.

Facebook Prophet is mocked out via the root conftest.py since it requires
cmdstan and takes significant time to fit. We test class logic, data
preparation, and prediction output format.
"""

import sys
import os
import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock
from datetime import datetime

# Ensure the ml-services root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from spending_predictor.model import SpendingPredictor


# =============================================
# Instantiation
# =============================================

class TestSpendingPredictorInit:
    """Test SpendingPredictor creation."""

    def test_default_init(self):
        predictor = SpendingPredictor()
        assert predictor.category is None
        assert predictor.model is None
        assert predictor.training_metadata == {}

    def test_init_with_category(self):
        predictor = SpendingPredictor(category="groceries")
        assert predictor.category == "groceries"

    def test_init_with_none_category(self):
        predictor = SpendingPredictor(category=None)
        assert predictor.category is None


# =============================================
# Data Preparation
# =============================================

class TestPrepareData:
    """Test prepare_data method."""

    def test_prepare_data_returns_dataframe(self, sample_spending_data):
        predictor = SpendingPredictor()
        result = predictor.prepare_data(sample_spending_data)
        assert isinstance(result, pd.DataFrame)

    def test_prepare_data_has_prophet_columns(self, sample_spending_data):
        predictor = SpendingPredictor()
        result = predictor.prepare_data(sample_spending_data)
        assert "ds" in result.columns
        assert "y" in result.columns

    def test_prepare_data_filters_by_category(self, sample_spending_data):
        predictor = SpendingPredictor(category="groceries")
        result = predictor.prepare_data(sample_spending_data)
        assert len(result) > 0
        # All original data has category "groceries", so no filtering effect here
        assert "ds" in result.columns

    def test_prepare_data_nonexistent_category(self, sample_spending_data):
        predictor = SpendingPredictor(category="nonexistent")
        result = predictor.prepare_data(sample_spending_data)
        # Should return an empty (or near-empty) DataFrame
        assert len(result) == 0 or result["y"].sum() == 0

    def test_prepare_data_daily_frequency(self, sample_spending_data):
        predictor = SpendingPredictor()
        result = predictor.prepare_data(sample_spending_data, resample_freq="D")
        assert isinstance(result, pd.DataFrame)
        assert len(result) > 0

    def test_prepare_data_weekly_frequency(self, sample_spending_data):
        predictor = SpendingPredictor()
        result = predictor.prepare_data(sample_spending_data, resample_freq="W")
        assert isinstance(result, pd.DataFrame)
        # Weekly should have fewer rows than daily
        daily = predictor.prepare_data(sample_spending_data, resample_freq="D")
        assert len(result) < len(daily)


# =============================================
# Indian Holidays
# =============================================

class TestHolidays:
    """Test holiday generation."""

    def test_add_indian_holidays_returns_dataframe(self):
        predictor = SpendingPredictor()
        holidays = predictor.add_indian_holidays()
        assert isinstance(holidays, pd.DataFrame)
        assert "holiday" in holidays.columns
        assert "ds" in holidays.columns

    def test_holidays_contain_diwali(self):
        predictor = SpendingPredictor()
        holidays = predictor.add_indian_holidays()
        assert "diwali" in holidays["holiday"].values

    def test_holidays_contain_republic_day(self):
        predictor = SpendingPredictor()
        holidays = predictor.add_indian_holidays()
        assert "republic_day" in holidays["holiday"].values

    def test_holidays_dates_are_datetime(self):
        predictor = SpendingPredictor()
        holidays = predictor.add_indian_holidays()
        assert pd.api.types.is_datetime64_any_dtype(holidays["ds"])


# =============================================
# Train / Predict — with mocked Prophet
# =============================================

class TestTrainPredict:
    """Test train and predict with mocked Prophet model."""

    def _mock_prophet_model(self):
        """Create a mock Prophet model that supports fit/predict/make_future_dataframe."""
        mock_model = MagicMock()

        # fit returns self
        mock_model.fit.return_value = mock_model

        # predict returns a DataFrame with required columns
        def fake_predict(df):
            n = len(df)
            return pd.DataFrame({
                "ds": df["ds"],
                "yhat": np.random.uniform(800, 1200, n),
                "yhat_lower": np.random.uniform(600, 800, n),
                "yhat_upper": np.random.uniform(1200, 1500, n),
                "trend": np.linspace(1000, 1100, n),
                "yearly": np.zeros(n),
                "weekly": np.zeros(n),
                "monthly": np.zeros(n),
            })

        mock_model.predict = fake_predict

        # make_future_dataframe
        def fake_future(periods=30, freq="D", include_history=False):
            start = datetime(2026, 1, 1) if not include_history else datetime(2025, 1, 1)
            dates = pd.date_range(start=start, periods=periods, freq=freq)
            return pd.DataFrame({"ds": dates})

        mock_model.make_future_dataframe = fake_future

        # to_json / from_json for save/load tests
        mock_model.to_json.return_value = '{"mock": true}'

        return mock_model

    def test_train_returns_metrics(self, sample_spending_data):
        predictor = SpendingPredictor()
        data = predictor.prepare_data(sample_spending_data)
        mock_model = self._mock_prophet_model()

        with patch("spending_predictor.model.Prophet", return_value=mock_model):
            metrics = predictor.train(data)

        assert "mae" in metrics
        assert "rmse" in metrics
        assert "r2" in metrics

    def test_predict_returns_dict(self):
        predictor = SpendingPredictor()
        predictor.model = self._mock_prophet_model()
        predictor.training_metadata = {"train_size": 365}

        result = predictor.predict(periods=30, freq="D")
        assert isinstance(result, dict)
        assert "predictions" in result
        assert "category" in result
        assert "metadata" in result

    def test_predict_output_length(self):
        predictor = SpendingPredictor()
        predictor.model = self._mock_prophet_model()
        predictor.training_metadata = {}

        result = predictor.predict(periods=60, freq="D")
        assert len(result["predictions"]) == 60

    def test_predict_predictions_shape(self):
        predictor = SpendingPredictor()
        predictor.model = self._mock_prophet_model()
        predictor.training_metadata = {}

        result = predictor.predict(periods=10, freq="D")
        for pred in result["predictions"]:
            assert "date" in pred
            assert "predicted_amount" in pred
            assert "lower_bound" in pred
            assert "upper_bound" in pred
            assert pred["predicted_amount"] >= 0
            assert pred["lower_bound"] >= 0

    def test_predict_raises_when_untrained(self):
        predictor = SpendingPredictor()
        with pytest.raises(ValueError, match="not trained"):
            predictor.predict()

    def test_predict_next_month(self):
        predictor = SpendingPredictor()
        predictor.model = self._mock_prophet_model()
        predictor.training_metadata = {}

        result = predictor.predict_next_month()
        assert "total_predicted" in result
        assert "daily_average" in result
        assert "confidence_lower" in result
        assert "confidence_upper" in result
        assert result["total_predicted"] > 0

    def test_category_in_output(self):
        predictor = SpendingPredictor(category="dining")
        predictor.model = self._mock_prophet_model()
        predictor.training_metadata = {}

        result = predictor.predict(periods=5)
        assert result["category"] == "dining"

    def test_total_category_when_none(self):
        predictor = SpendingPredictor(category=None)
        predictor.model = self._mock_prophet_model()
        predictor.training_metadata = {}

        result = predictor.predict(periods=5)
        assert result["category"] == "total"


# =============================================
# Metrics Calculation
# =============================================

class TestMetrics:
    """Test internal _calculate_metrics helper."""

    def test_calculate_metrics_returns_dict(self):
        predictor = SpendingPredictor()
        y_true = pd.Series([100, 200, 300, 400, 500])
        y_pred = pd.Series([110, 190, 310, 390, 510])
        metrics = predictor._calculate_metrics(y_true, y_pred)
        assert "mae" in metrics
        assert "rmse" in metrics
        assert "r2" in metrics

    def test_perfect_predictions(self):
        predictor = SpendingPredictor()
        y = pd.Series([100, 200, 300])
        metrics = predictor._calculate_metrics(y, y)
        assert metrics["mae"] == pytest.approx(0.0)
        assert metrics["rmse"] == pytest.approx(0.0)
        assert metrics["r2"] == pytest.approx(1.0)

    def test_mape_with_zeros(self):
        predictor = SpendingPredictor()
        y_true = pd.Series([0, 100, 200])
        y_pred = pd.Series([10, 110, 190])
        metrics = predictor._calculate_metrics(y_true, y_pred)
        # MAPE should be None when y_true contains zeros
        assert metrics["mape"] is None


# =============================================
# Save / Load
# =============================================

class TestSaveLoad:
    """Test save raises when untrained."""

    def test_save_raises_when_untrained(self, tmp_path):
        predictor = SpendingPredictor()
        with pytest.raises(ValueError, match="not trained"):
            predictor.save(str(tmp_path / "nope"))
