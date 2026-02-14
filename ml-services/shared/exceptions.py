"""
Custom Exceptions for ML Services

Provides standardized exception hierarchy for better error handling
"""

from typing import Optional, Dict, Any


class MLServiceError(Exception):
    """Base exception for all ML service errors"""

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details
        }


# Model Errors
class ModelError(MLServiceError):
    """Base exception for model-related errors"""
    pass


class ModelNotLoadedError(ModelError):
    """Model not loaded or initialized"""
    pass


class ModelLoadError(ModelError):
    """Failed to load model"""
    pass


class ModelPredictionError(ModelError):
    """Prediction failed"""
    pass


class ModelTrainingError(ModelError):
    """Training failed"""
    pass


# Validation Errors
class ValidationError(MLServiceError):
    """Input validation failed"""
    pass


class InvalidInputError(ValidationError):
    """Invalid input data"""
    pass


class MissingFieldError(ValidationError):
    """Required field missing"""
    pass


# Feature Store Errors
class FeatureStoreError(MLServiceError):
    """Base exception for feature store errors"""
    pass


class FeatureNotFoundError(FeatureStoreError):
    """Requested feature not found"""
    pass


class FeatureCacheError(FeatureStoreError):
    """Feature cache operation failed"""
    pass


# Data Errors
class DataError(MLServiceError):
    """Base exception for data-related errors"""
    pass


class DataValidationError(DataError):
    """Data validation failed"""
    pass


class DataPreparationError(DataError):
    """Data preparation failed"""
    pass


class InsufficientDataError(DataError):
    """Insufficient data for operation"""
    pass


# External Service Errors
class ExternalServiceError(MLServiceError):
    """Base exception for external service errors"""
    pass


class RedisConnectionError(ExternalServiceError):
    """Redis connection failed"""
    pass


class DatabaseError(ExternalServiceError):
    """Database operation failed"""
    pass


class MLflowError(ExternalServiceError):
    """MLflow operation failed"""
    pass


# Configuration Errors
class ConfigurationError(MLServiceError):
    """Configuration error"""
    pass


class MissingConfigError(ConfigurationError):
    """Required configuration missing"""
    pass


# Resource Errors
class ResourceError(MLServiceError):
    """Base exception for resource errors"""
    pass


class ResourceNotFoundError(ResourceError):
    """Requested resource not found"""
    pass


class ResourceExhaustedError(ResourceError):
    """Resource quota exceeded"""
    pass


# Timeout Errors
class TimeoutError(MLServiceError):
    """Operation timed out"""
    pass


class PredictionTimeoutError(TimeoutError):
    """Prediction request timed out"""
    pass


class TrainingTimeoutError(TimeoutError):
    """Training request timed out"""
    pass


# Circuit Breaker Errors
class CircuitBreakerError(MLServiceError):
    """Circuit breaker is open"""
    pass


# Error factory
def create_error(
    error_type: str,
    message: str,
    **kwargs
) -> MLServiceError:
    """
    Factory function to create appropriate error type.

    Args:
        error_type: Type of error ('model', 'validation', 'data', etc.)
        message: Error message
        **kwargs: Additional error details

    Returns:
        Appropriate exception instance
    """
    error_map = {
        'model': ModelError,
        'model_not_loaded': ModelNotLoadedError,
        'model_load': ModelLoadError,
        'prediction': ModelPredictionError,
        'training': ModelTrainingError,
        'validation': ValidationError,
        'invalid_input': InvalidInputError,
        'missing_field': MissingFieldError,
        'feature_store': FeatureStoreError,
        'feature_not_found': FeatureNotFoundError,
        'feature_cache': FeatureCacheError,
        'data': DataError,
        'data_validation': DataValidationError,
        'data_preparation': DataPreparationError,
        'insufficient_data': InsufficientDataError,
        'external_service': ExternalServiceError,
        'redis': RedisConnectionError,
        'database': DatabaseError,
        'mlflow': MLflowError,
        'configuration': ConfigurationError,
        'missing_config': MissingConfigError,
        'resource': ResourceError,
        'resource_not_found': ResourceNotFoundError,
        'resource_exhausted': ResourceExhaustedError,
        'timeout': TimeoutError,
        'prediction_timeout': PredictionTimeoutError,
        'training_timeout': TrainingTimeoutError,
        'circuit_breaker': CircuitBreakerError,
    }

    error_class = error_map.get(error_type, MLServiceError)
    return error_class(message, **kwargs)
