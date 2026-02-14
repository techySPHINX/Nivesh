"""
Retry Logic with Exponential Backoff

Provides decorators and utilities for retrying failed operations
"""

import time
import logging
import random
from typing import Callable, Optional, Tuple, Type
from functools import wraps
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RetryConfig:
    """Retry configuration"""
    max_attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    retry_on: Tuple[Type[Exception], ...] = (Exception,)


class RetryError(Exception):
    """Raised when max retry attempts exceeded"""
    pass


def calculate_backoff_delay(
    attempt: int,
    initial_delay: float = 1.0,
    exponential_base: float = 2.0,
    max_delay: float = 60.0,
    jitter: bool = True
) -> float:
    """
    Calculate exponential backoff delay with optional jitter.

    Args:
        attempt: Current attempt number (0-indexed)
        initial_delay: Initial delay in seconds
        exponential_base: Base for exponential calculation
        max_delay: Maximum delay cap
        jitter: Whether to add random jitter

    Returns:
        Delay in seconds
    """
    # Calculate exponential delay
    delay = min(initial_delay * (exponential_base ** attempt), max_delay)

    # Add jitter to prevent thundering herd
    if jitter:
        delay = delay * (0.5 + random.random() * 0.5)

    return delay


def retry_with_backoff(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retry_on: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable] = None
):
    """
    Decorator to retry function with exponential backoff.

    Args:
        max_attempts: Maximum number of retry attempts
        initial_delay: Initial delay between retries (seconds)
        max_delay: Maximum delay cap (seconds)
        exponential_base: Base for exponential backoff
        jitter: Whether to add random jitter
        retry_on: Tuple of exception types to retry on
        on_retry: Optional callback function called on each retry

    Example:
        @retry_with_backoff(max_attempts=3, initial_delay=1.0)
        def fetch_data():
            response = requests.get("https://api.example.com/data")
            response.raise_for_status()
            return response.json()
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    # Attempt the function call
                    result = func(*args, **kwargs)

                    # Success - log if we had previous failures
                    if attempt > 0:
                        logger.info(
                            f"{func.__name__} succeeded on attempt {attempt + 1}/{max_attempts}"
                        )

                    return result

                except retry_on as e:
                    last_exception = e

                    # Don't sleep on the last attempt
                    if attempt < max_attempts - 1:
                        delay = calculate_backoff_delay(
                            attempt=attempt,
                            initial_delay=initial_delay,
                            exponential_base=exponential_base,
                            max_delay=max_delay,
                            jitter=jitter
                        )

                        logger.warning(
                            f"{func.__name__} failed (attempt {attempt + 1}/{max_attempts}): {e}. "
                            f"Retrying in {delay:.2f}s..."
                        )

                        # Call retry callback if provided
                        if on_retry:
                            try:
                                on_retry(attempt, e, delay)
                            except Exception as callback_error:
                                logger.error(
                                    f"Error in retry callback: {callback_error}")

                        time.sleep(delay)
                    else:
                        logger.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {e}"
                        )

            # All attempts failed
            raise RetryError(
                f"{func.__name__} failed after {max_attempts} attempts. "
                f"Last error: {last_exception}"
            ) from last_exception

        return wrapper

    return decorator


class Retrier:
    """
    Reusable retry handler with configurable backoff.
    """

    def __init__(self, config: Optional[RetryConfig] = None):
        """
        Initialize retrier.

        Args:
            config: Retry configuration
        """
        self.config = config or RetryConfig()

    def call(self, func: Callable, *args, **kwargs):
        """
        Execute function with retry logic.

        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments

        Returns:
            Function result

        Raises:
            RetryError: If all retry attempts fail
        """
        last_exception = None

        for attempt in range(self.config.max_attempts):
            try:
                result = func(*args, **kwargs)

                if attempt > 0:
                    logger.info(
                        f"Function succeeded on attempt {attempt + 1}/{self.config.max_attempts}"
                    )

                return result

            except self.config.retry_on as e:
                last_exception = e

                if attempt < self.config.max_attempts - 1:
                    delay = calculate_backoff_delay(
                        attempt=attempt,
                        initial_delay=self.config.initial_delay,
                        exponential_base=self.config.exponential_base,
                        max_delay=self.config.max_delay,
                        jitter=self.config.jitter
                    )

                    logger.warning(
                        f"Attempt {attempt + 1}/{self.config.max_attempts} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )

                    time.sleep(delay)

        raise RetryError(
            f"Function failed after {self.config.max_attempts} attempts. "
            f"Last error: {last_exception}"
        ) from last_exception


# Predefined retry configurations
REDIS_RETRY = RetryConfig(
    max_attempts=3,
    initial_delay=0.5,
    max_delay=5.0,
    retry_on=(ConnectionError, TimeoutError)
)

DATABASE_RETRY = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=10.0,
    retry_on=(ConnectionError, TimeoutError)
)

MLFLOW_RETRY = RetryConfig(
    max_attempts=5,
    initial_delay=1.0,
    max_delay=30.0,
    retry_on=(ConnectionError, TimeoutError)
)

API_RETRY = RetryConfig(
    max_attempts=3,
    initial_delay=2.0,
    max_delay=20.0,
    retry_on=(ConnectionError, TimeoutError)
)


def retry_redis(max_attempts: int = 3):
    """Convenience decorator for Redis operations"""
    return retry_with_backoff(
        max_attempts=max_attempts,
        initial_delay=REDIS_RETRY.initial_delay,
        max_delay=REDIS_RETRY.max_delay,
        retry_on=REDIS_RETRY.retry_on
    )


def retry_database(max_attempts: int = 3):
    """Convenience decorator for database operations"""
    return retry_with_backoff(
        max_attempts=max_attempts,
        initial_delay=DATABASE_RETRY.initial_delay,
        max_delay=DATABASE_RETRY.max_delay,
        retry_on=DATABASE_RETRY.retry_on
    )


def retry_mlflow(max_attempts: int = 5):
    """Convenience decorator for MLflow operations"""
    return retry_with_backoff(
        max_attempts=max_attempts,
        initial_delay=MLFLOW_RETRY.initial_delay,
        max_delay=MLFLOW_RETRY.max_delay,
        retry_on=MLFLOW_RETRY.retry_on
    )


def retry_api(max_attempts: int = 3):
    """Convenience decorator for API calls"""
    return retry_with_backoff(
        max_attempts=max_attempts,
        initial_delay=API_RETRY.initial_delay,
        max_delay=API_RETRY.max_delay,
        retry_on=API_RETRY.retry_on
    )
