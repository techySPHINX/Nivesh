"""
Circuit Breaker Pattern Implementation

Prevents cascading failures by temporarily blocking calls to failing services.
"""

import time
import logging
from enum import Enum
from typing import Callable, Optional, Any
from functools import wraps
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failure threshold reached, blocking calls
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker implementation.

    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Too many failures, requests are blocked
    - HALF_OPEN: Testing recovery, limited requests allowed
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 2,
        timeout: int = 30
    ):
        """
        Initialize circuit breaker.

        Args:
            failure_threshold: Number of failures to open circuit
            recovery_timeout: Seconds to wait before trying again (OPEN -> HALF_OPEN)
            success_threshold: Number of successes needed to close circuit (HALF_OPEN -> CLOSED)
            timeout: Request timeout in seconds
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        self.timeout = timeout

        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = CircuitState.CLOSED

        logger.info(
            f"Circuit breaker initialized: "
            f"failure_threshold={failure_threshold}, "
            f"recovery_timeout={recovery_timeout}s"
        )

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function through circuit breaker.

        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments

        Returns:
            Function result

        Raises:
            Exception: If circuit is OPEN or function fails
        """
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info("Circuit breaker entering HALF_OPEN state")
            else:
                raise Exception(
                    f"Circuit breaker is OPEN. "
                    f"Retry after {self._time_until_reset():.1f}s"
                )

        try:
            # Execute the function
            result = func(*args, **kwargs)

            # Handle success
            self._on_success()

            return result

        except Exception as e:
            # Handle failure
            self._on_failure()
            raise e

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return True

        elapsed = time.time() - self.last_failure_time
        return elapsed >= self.recovery_timeout

    def _time_until_reset(self) -> float:
        """Calculate time until circuit can be reset"""
        if self.last_failure_time is None:
            return 0.0

        elapsed = time.time() - self.last_failure_time
        remaining = max(0, self.recovery_timeout - elapsed)
        return remaining

    def _on_success(self):
        """Handle successful call"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            logger.debug(
                f"Circuit breaker success in HALF_OPEN: "
                f"{self.success_count}/{self.success_threshold}"
            )

            if self.success_count >= self.success_threshold:
                self._close_circuit()

        # Reset failure count in CLOSED state
        if self.state == CircuitState.CLOSED:
            self.failure_count = 0

    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        logger.warning(
            f"Circuit breaker failure: "
            f"{self.failure_count}/{self.failure_threshold}"
        )

        if self.state == CircuitState.HALF_OPEN:
            # Any failure in HALF_OPEN reopens circuit
            self._open_circuit()
        elif self.failure_count >= self.failure_threshold:
            self._open_circuit()

    def _open_circuit(self):
        """Open the circuit"""
        self.state = CircuitState.OPEN
        self.success_count = 0
        logger.error(
            f"Circuit breaker OPENED after {self.failure_count} failures. "
            f"Will retry in {self.recovery_timeout}s"
        )

    def _close_circuit(self):
        """Close the circuit"""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        logger.info("Circuit breaker CLOSED - service recovered")

    def reset(self):
        """Manually reset the circuit breaker"""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        logger.info("Circuit breaker manually reset")

    @property
    def status(self) -> dict:
        """Get current circuit breaker status"""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "time_until_reset": self._time_until_reset() if self.state == CircuitState.OPEN else 0
        }


# Global circuit breakers for each service
_circuit_breakers = {}


def get_circuit_breaker(
    service_name: str,
    **kwargs
) -> CircuitBreaker:
    """
    Get or create circuit breaker for a service.

    Args:
        service_name: Name of the service
        **kwargs: CircuitBreaker parameters

    Returns:
        CircuitBreaker instance
    """
    if service_name not in _circuit_breakers:
        _circuit_breakers[service_name] = CircuitBreaker(**kwargs)

    return _circuit_breakers[service_name]


def circuit_breaker(
    service_name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    success_threshold: int = 2
):
    """
    Decorator to apply circuit breaker pattern.

    Args:
        service_name: Name of the service
        failure_threshold: Number of failures to open circuit
        recovery_timeout: Seconds to wait before retry
        success_threshold: Successes needed to close circuit

    Example:
        @circuit_breaker("redis", failure_threshold=3, recovery_timeout=30)
        def get_from_redis(key):
            return redis_client.get(key)
    """
    def decorator(func):
        breaker = get_circuit_breaker(
            service_name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            success_threshold=success_threshold
        )

        @wraps(func)
        def wrapper(*args, **kwargs):
            return breaker.call(func, *args, **kwargs)

        return wrapper

    return decorator


def get_all_circuit_breakers_status() -> dict:
    """Get status of all circuit breakers"""
    return {
        name: breaker.status
        for name, breaker in _circuit_breakers.items()
    }


def reset_all_circuit_breakers():
    """Reset all circuit breakers"""
    for breaker in _circuit_breakers.values():
        breaker.reset()
    logger.info("All circuit breakers reset")
