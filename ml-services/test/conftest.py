"""
Shared fixtures for ML services tests.

Provides reusable sample data and mock objects for
anomaly detection, credit risk, spending prediction, and intent classification.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta
import numpy as np


# =============================================
# Transaction Fixtures
# =============================================

@pytest.fixture
def sample_transaction():
    """A single realistic transaction dictionary."""
    return {
        "transaction_id": "txn_001",
        "user_id": "user_123",
        "amount": 2500.0,
        "date": "2026-01-15",
        "category": "groceries",
        "merchant": "BigBasket",
        "description": "Weekly grocery shopping",
    }


@pytest.fixture
def sample_transactions():
    """A batch of diverse transactions for training / batch prediction."""
    base_date = datetime(2026, 1, 1)
    return [
        {
            "transaction_id": f"txn_{i:03d}",
            "user_id": "user_123",
            "amount": float(np.random.lognormal(7, 1)),
            "date": (base_date + timedelta(days=i)).strftime("%Y-%m-%d"),
            "category": np.random.choice(
                ["groceries", "dining", "utilities", "shopping", "transport"]
            ),
            "merchant": np.random.choice(
                ["BigBasket", "Swiggy", "Amazon", "Uber", "PhonePe"]
            ),
        }
        for i in range(120)
    ]


@pytest.fixture
def anomalous_transaction():
    """A transaction that is likely anomalous (very high amount, late night)."""
    return {
        "transaction_id": "txn_anomaly",
        "user_id": "user_123",
        "amount": 500000.0,
        "date": "2026-02-15T03:22:00",
        "category": "electronics",
        "merchant": "UnknownShop",
    }


# =============================================
# Credit Application Fixtures
# =============================================

@pytest.fixture
def sample_credit_application():
    """A standard credit application for risk scoring."""
    return {
        "age": 35,
        "monthly_income": 85000.0,
        "monthly_debt": 15000.0,
        "credit_limit": 300000.0,
        "credit_used": 90000.0,
        "loan_amount": 500000.0,
        "payments_missed": 1,
        "total_payments": 48,
        "months_employed": 60,
        "credit_history_months": 96,
        "num_credit_accounts": 3,
        "has_mortgage": 0,
        "has_car_loan": 1,
    }


@pytest.fixture
def high_risk_credit_application():
    """An application that should score as high risk."""
    return {
        "age": 22,
        "monthly_income": 20000.0,
        "monthly_debt": 18000.0,
        "credit_limit": 50000.0,
        "credit_used": 48000.0,
        "loan_amount": 1000000.0,
        "payments_missed": 12,
        "total_payments": 24,
        "months_employed": 3,
        "credit_history_months": 6,
        "num_credit_accounts": 1,
        "has_mortgage": 0,
        "has_car_loan": 0,
    }


@pytest.fixture
def low_risk_credit_application():
    """An application that should score as low risk."""
    return {
        "age": 45,
        "monthly_income": 200000.0,
        "monthly_debt": 10000.0,
        "credit_limit": 1000000.0,
        "credit_used": 50000.0,
        "loan_amount": 200000.0,
        "payments_missed": 0,
        "total_payments": 120,
        "months_employed": 180,
        "credit_history_months": 240,
        "num_credit_accounts": 5,
        "has_mortgage": 1,
        "has_car_loan": 1,
    }


# =============================================
# Mock Model Fixture
# =============================================

@pytest.fixture
def mock_model():
    """
    A generic mock ML model with predict / predict_proba methods.
    Useful for testing endpoints without loading real models.
    """
    model = MagicMock()
    model.predict.return_value = np.array([0])
    model.predict_proba.return_value = np.array([[0.8, 0.2]])
    model.score_samples.return_value = np.array([0.15])
    return model


@pytest.fixture
def mock_scaler():
    """A mock StandardScaler that acts as a pass-through."""
    scaler = MagicMock()
    scaler.transform.side_effect = lambda x: x
    scaler.fit_transform.side_effect = lambda x: x
    return scaler


# =============================================
# Intent Classification Fixtures
# =============================================

@pytest.fixture
def sample_queries():
    """Sample user queries mapped to expected intents."""
    return [
        {"query": "Can I afford a new car worth 8 lakhs?", "expected": "affordability_check"},
        {"query": "Help me plan for my retirement", "expected": "retirement_planning"},
        {"query": "Show me my spending last month", "expected": "spending_analysis"},
        {"query": "I want to invest in mutual funds", "expected": "investment_advice"},
        {"query": "Create a budget for me", "expected": "budget_creation"},
        {"query": "What is the best savings strategy?", "expected": "savings_strategy"},
    ]


# =============================================
# Spending Prediction Fixtures
# =============================================

@pytest.fixture
def sample_spending_data():
    """Time-series spending data suitable for Prophet."""
    base_date = datetime(2025, 1, 1)
    return [
        {
            "date": (base_date + timedelta(days=i)).strftime("%Y-%m-%d"),
            "amount": 1000 + 200 * np.sin(i * 2 * np.pi / 30) + np.random.normal(0, 50),
            "category": "groceries",
        }
        for i in range(365)
    ]
