"""
Security Utilities for ML Services

Provides:
- Input validation
- API key authentication
- Rate limiting
- Request sanitization
"""

import re
import hashlib
import secrets
from typing import Optional, List
from fastapi import Security, HTTPException, status, Request
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, validator
import os
import logging

logger = logging.getLogger(__name__)

# API Key Configuration
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
VALID_API_KEYS = set(os.getenv("ML_API_KEYS", "").split(","))


class SecurityConfig(BaseModel):
    """Security configuration"""
    max_text_length: int = 1024
    max_batch_size: int = 32
    allowed_user_id_pattern: str = r'^[a-zA-Z0-9_-]{1,100}$'
    rate_limit_per_minute: int = 100


security_config = SecurityConfig()


async def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    """
    Verify API key authentication.

    Args:
        api_key: API key from request header

    Returns:
        Validated API key

    Raises:
        HTTPException: If API key is invalid or missing
    """
    if not api_key:
        logger.warning("Missing API key in request")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing API key"
        )

    # Hash the API key for comparison
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # In production, compare hashed keys
    if api_key not in VALID_API_KEYS and len(VALID_API_KEYS) > 0:
        logger.warning(f"Invalid API key attempt: {api_key_hash[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )

    logger.debug(f"API key validated: {api_key_hash[:10]}...")
    return api_key


class InputValidator:
    """Input validation utilities"""

    @staticmethod
    def validate_text(
        text: str,
        field_name: str = "text",
        max_length: Optional[int] = None,
        min_length: int = 1,
        allow_empty: bool = False
    ) -> str:
        """
        Validate and sanitize text input.

        Args:
            text: Input text to validate
            field_name: Name of the field for error messages
            max_length: Maximum allowed length
            min_length: Minimum allowed length
            allow_empty: Whether to allow empty strings

        Returns:
            Sanitized text

        Raises:
            ValueError: If validation fails
        """
        if not isinstance(text, str):
            raise ValueError(f"{field_name} must be a string")

        # Strip whitespace
        text = text.strip()

        # Check empty
        if not text and not allow_empty:
            raise ValueError(f"{field_name} cannot be empty")

        # Check length
        if len(text) < min_length:
            raise ValueError(
                f"{field_name} must be at least {min_length} characters"
            )

        max_len = max_length or security_config.max_text_length
        if len(text) > max_len:
            logger.warning(
                f"{field_name} exceeded max length ({len(text)} > {max_len}), truncating"
            )
            text = text[:max_len]

        # Remove null bytes and other problematic characters
        text = text.replace('\x00', '')

        return text

    @staticmethod
    def validate_user_id(user_id: str) -> str:
        """
        Validate user ID format.

        Args:
            user_id: User identifier

        Returns:
            Validated user ID

        Raises:
            ValueError: If user ID format is invalid
        """
        if not user_id:
            raise ValueError("user_id cannot be empty")

        if not re.match(security_config.allowed_user_id_pattern, user_id):
            raise ValueError(
                "user_id must contain only alphanumeric characters, hyphens, and underscores"
            )

        return user_id

    @staticmethod
    def validate_numeric(
        value: float,
        field_name: str,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None
    ) -> float:
        """
        Validate numeric input.

        Args:
            value: Numeric value to validate
            field_name: Name of the field
            min_value: Minimum allowed value
            max_value: Maximum allowed value

        Returns:
            Validated value

        Raises:
            ValueError: If validation fails
        """
        if not isinstance(value, (int, float)):
            raise ValueError(f"{field_name} must be a number")

        if min_value is not None and value < min_value:
            raise ValueError(f"{field_name} must be >= {min_value}")

        if max_value is not None and value > max_value:
            raise ValueError(f"{field_name} must be <= {max_value}")

        return value

    @staticmethod
    def validate_dict(
        data: dict,
        required_fields: Optional[List[str]] = None,
        field_name: str = "data"
    ) -> dict:
        """
        Validate dictionary input.

        Args:
            data: Dictionary to validate
            required_fields: List of required keys
            field_name: Name of the field

        Returns:
            Validated dictionary

        Raises:
            ValueError: If validation fails
        """
        if not isinstance(data, dict):
            raise ValueError(f"{field_name} must be a dictionary")

        if required_fields:
            missing_fields = set(required_fields) - set(data.keys())
            if missing_fields:
                raise ValueError(
                    f"{field_name} missing required fields: {missing_fields}"
                )

        return data


class RateLimiter:
    """Simple in-memory rate limiter"""

    def __init__(self):
        self.requests = {}  # {client_id: [timestamp, ...]}

    def check_rate_limit(
        self,
        client_id: str,
        max_requests: int = 100,
        window_seconds: int = 60
    ) -> bool:
        """
        Check if client has exceeded rate limit.

        Args:
            client_id: Client identifier (IP or API key)
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds

        Returns:
            True if within limit, False if exceeded
        """
        import time

        current_time = time.time()

        # Initialize client if not exists
        if client_id not in self.requests:
            self.requests[client_id] = []

        # Remove old requests outside the window
        self.requests[client_id] = [
            ts for ts in self.requests[client_id]
            if current_time - ts < window_seconds
        ]

        # Check limit
        if len(self.requests[client_id]) >= max_requests:
            logger.warning(
                f"Rate limit exceeded for client {client_id}: "
                f"{len(self.requests[client_id])}/{max_requests}"
            )
            return False

        # Add current request
        self.requests[client_id].append(current_time)
        return True


# Global rate limiter instance
rate_limiter = RateLimiter()


async def check_rate_limit(request: Request):
    """
    Rate limiting dependency for FastAPI.

    Args:
        request: FastAPI request object

    Raises:
        HTTPException: If rate limit exceeded
    """
    client_ip = request.client.host

    if not rate_limiter.check_rate_limit(
        client_id=client_ip,
        max_requests=security_config.rate_limit_per_minute,
        window_seconds=60
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )


def sanitize_log_data(data: dict) -> dict:
    """
    Sanitize sensitive data before logging.

    Args:
        data: Data dictionary to sanitize

    Returns:
        Sanitized dictionary
    """
    sensitive_fields = {
        'password', 'api_key', 'token', 'secret',
        'ssn', 'pan', 'aadhaar', 'credit_card'
    }

    sanitized = {}
    for key, value in data.items():
        if any(field in key.lower() for field in sensitive_fields):
            sanitized[key] = "***REDACTED***"
        else:
            sanitized[key] = value

    return sanitized


# Exception classes
class ValidationError(Exception):
    """Input validation error"""
    pass


class AuthenticationError(Exception):
    """Authentication error"""
    pass


class RateLimitError(Exception):
    """Rate limit exceeded"""
    pass
