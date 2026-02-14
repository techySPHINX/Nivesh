"""
Shared configuration for ML services
"""
import os
from typing import Dict, Any
from pydantic_settings import BaseSettings
from pydantic import Field


class MLConfig(BaseSettings):
    """ML Services Configuration"""

    # MLflow Configuration
    mlflow_tracking_uri: str = Field(
        default="http://localhost:5000",
        env="MLFLOW_TRACKING_URI"
    )
    mlflow_registry_uri: str = Field(
        default="postgresql://postgres:password@localhost:5432/nivesh",
        env="MLFLOW_REGISTRY_URI"
    )

    # Feature Store (Redis)
    redis_host: str = Field(default="localhost", env="REDIS_HOST")
    redis_port: int = Field(default=6379, env="REDIS_PORT")
    redis_db: int = Field(default=0, env="REDIS_DB")
    redis_password: str = Field(default=None, env="REDIS_PASSWORD")
    feature_ttl_seconds: int = Field(
        default=3600, env="FEATURE_TTL_SECONDS")  # 1 hour

    # Database
    database_url: str = Field(
        default="postgresql://postgres:password@localhost:5432/nivesh",
        env="DATABASE_URL"
    )

    # Model Storage
    model_storage_backend: str = Field(
        default="local", env="MODEL_STORAGE_BACKEND")  # local, s3, gcs
    model_storage_path: str = Field(
        default="./models", env="MODEL_STORAGE_PATH")
    s3_bucket: str = Field(default=None, env="S3_BUCKET")
    gcs_bucket: str = Field(default=None, env="GCS_BUCKET")

    # Model Server
    model_server_host: str = Field(default="0.0.0.0", env="MODEL_SERVER_HOST")
    model_server_port: int = Field(default=8000, env="MODEL_SERVER_PORT")
    model_cache_size: int = Field(default=10, env="MODEL_CACHE_SIZE")

    # Training Configuration
    training_batch_size: int = Field(default=16, env="TRAINING_BATCH_SIZE")
    training_epochs: int = Field(default=3, env="TRAINING_EPOCHS")
    learning_rate: float = Field(default=2e-5, env="LEARNING_RATE")

    # Intent Classification
    intent_model_name: str = Field(
        default="distilbert-base-uncased", env="INTENT_MODEL_NAME")
    intent_max_length: int = Field(default=128, env="INTENT_MAX_LENGTH")
    intent_confidence_threshold: float = Field(
        default=0.7, env="INTENT_CONFIDENCE_THRESHOLD")

    # NER
    ner_model_name: str = Field(default="en_core_web_sm", env="NER_MODEL_NAME")

    # Spending Prediction
    spending_forecast_horizon: int = Field(
        default=365, env="SPENDING_FORECAST_HORIZON")  # days

    # Anomaly Detection
    anomaly_contamination: float = Field(
        default=0.01, env="ANOMALY_CONTAMINATION")  # 1%
    anomaly_threshold: float = Field(default=-0.5, env="ANOMALY_THRESHOLD")

    # Credit Risk
    credit_risk_threshold: float = Field(
        default=0.5, env="CREDIT_RISK_THRESHOLD")

    # Monitoring
    prometheus_port: int = Field(default=9090, env="PROMETHEUS_PORT")
    enable_monitoring: bool = Field(default=True, env="ENABLE_MONITORING")

    # Drift Detection
    drift_detection_enabled: bool = Field(
        default=True, env="DRIFT_DETECTION_ENABLED")
    drift_check_interval_hours: int = Field(
        default=24, env="DRIFT_CHECK_INTERVAL_HOURS")
    drift_alert_threshold: float = Field(
        default=0.3, env="DRIFT_ALERT_THRESHOLD")

    # Google AI (Gemini)
    google_api_key: str = Field(default=None, env="GOOGLE_API_KEY")
    gemini_model: str = Field(default="gemini-1.5-pro", env="GEMINI_MODEL")

    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global configuration instance
config = MLConfig()


# Intent labels
INTENT_LABELS = [
    "affordability_check",
    "goal_planning",
    "spending_analysis",
    "investment_advice",
    "debt_management",
    "tax_planning",
    "emergency_fund",
    "retirement_planning",
    "insurance_advice",
    "transaction_query",
    "budget_creation",
    "savings_strategy",
    "loan_inquiry",
    "general_question"
]


# NER entity types
NER_ENTITY_TYPES = [
    "MONEY",      # ₹50,000, $100
    "DATE",       # next month, in 2 years
    "CATEGORY",   # groceries, EMI
    "MERCHANT",   # Swiggy, Amazon
    "ACCOUNT"     # savings account, credit card
]


# Feature schemas
FEATURE_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "user_financial_profile": {
        "monthly_income": "float",
        "avg_monthly_expense": "float",
        "debt_to_income_ratio": "float",
        "emergency_fund_months": "float",
        "spending_volatility": "float",
        "income_volatility": "float",
        "existing_loans": "int",
        "payment_on_time_percentage": "float",
        "credit_utilization": "float"
    },
    "transaction_features": {
        "amount": "float",
        "amount_zscore": "float",
        "merchant_frequency": "int",
        "time_of_day": "int",
        "day_of_week": "int",
        "category_deviation": "float",
        "is_recurring": "bool",
        "days_since_last_transaction": "int"
    },
    "spending_pattern_features": {
        "category": "str",
        "avg_amount": "float",
        "frequency": "int",
        "seasonality_index": "float",
        "trend": "float"
    }
}


# Model registry statuses
MODEL_STATUSES = [
    "staging",
    "production",
    "archived",
    "failed"
]


# Deployment environments
DEPLOYMENT_ENVIRONMENTS = [
    "development",
    "staging",
    "production"
]
