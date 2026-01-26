"""
Unit tests for circuit breaker

Tests:
- Circuit state transitions
- Failure counting
- Recovery timeout
- Half-open state behavior
"""

import pytest
import time
from shared.circuit_breaker import CircuitBreaker, CircuitState, circuit_breaker


class TestCircuitBreaker:
    """Test circuit breaker functionality"""

    def test_initial_state(self):
        """Test circuit breaker starts in CLOSED state"""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=1)
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    def test_successful_calls(self):
        """Test successful calls keep circuit CLOSED"""
        cb = CircuitBreaker(failure_threshold=3)

        def success_func():
            return "success"

        # Multiple successful calls
        for _ in range(5):
            result = cb.call(success_func)
            assert result == "success"
            assert cb.state == CircuitState.CLOSED

    def test_failure_opens_circuit(self):
        """Test circuit opens after failure threshold"""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=1)

        def failing_func():
            raise Exception("Test failure")

        # Fail 3 times to open circuit
        for i in range(3):
            with pytest.raises(Exception):
                cb.call(failing_func)

        assert cb.state == CircuitState.OPEN
        assert cb.failure_count == 3

    def test_open_circuit_blocks_calls(self):
        """Test OPEN circuit blocks calls"""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=10)

        def failing_func():
            raise Exception("Test failure")

        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                cb.call(failing_func)

        # Next call should be blocked immediately
        with pytest.raises(Exception, match="Circuit breaker is OPEN"):
            cb.call(failing_func)

    def test_half_open_transition(self):
        """Test transition from OPEN to HALF_OPEN"""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=1)

        def failing_func():
            raise Exception("Test failure")

        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                cb.call(failing_func)

        assert cb.state == CircuitState.OPEN

        # Wait for recovery timeout
        time.sleep(1.1)

        # Next call should attempt (HALF_OPEN)
        # It will fail and reopen
        with pytest.raises(Exception):
            cb.call(failing_func)

    def test_half_open_recovery(self):
        """Test successful recovery from HALF_OPEN to CLOSED"""
        cb = CircuitBreaker(
            failure_threshold=2,
            recovery_timeout=1,
            success_threshold=2
        )

        fail_count = 0

        def sometimes_failing_func():
            nonlocal fail_count
            if fail_count < 2:
                fail_count += 1
                raise Exception("Failing")
            return "success"

        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                cb.call(sometimes_failing_func)

        assert cb.state == CircuitState.OPEN

        # Wait for recovery timeout
        time.sleep(1.1)

        # Succeed twice to close circuit
        result1 = cb.call(sometimes_failing_func)
        result2 = cb.call(sometimes_failing_func)

        assert result1 == "success"
        assert result2 == "success"
        assert cb.state == CircuitState.CLOSED

    def test_reset_circuit(self):
        """Test manual circuit reset"""
        cb = CircuitBreaker(failure_threshold=2)

        def failing_func():
            raise Exception("Test failure")

        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                cb.call(failing_func)

        assert cb.state == CircuitState.OPEN

        # Manual reset
        cb.reset()

        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0
        assert cb.success_count == 0

    def test_circuit_breaker_status(self):
        """Test status reporting"""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=5)

        status = cb.status

        assert status["state"] == "closed"
        assert status["failure_count"] == 0
        assert status["success_count"] == 0
        assert status["time_until_reset"] == 0


class TestCircuitBreakerDecorator:
    """Test circuit breaker decorator"""

    def test_decorator_success(self):
        """Test decorator with successful calls"""
        call_count = 0

        @circuit_breaker("test_service", failure_threshold=3)
        def test_function():
            nonlocal call_count
            call_count += 1
            return "success"

        # Multiple successful calls
        for _ in range(5):
            result = test_function()
            assert result == "success"

        assert call_count == 5

    def test_decorator_opens_circuit(self):
        """Test decorator opens circuit on failures"""
        call_count = 0

        @circuit_breaker("failing_service", failure_threshold=2, recovery_timeout=1)
        def failing_function():
            nonlocal call_count
            call_count += 1
            raise ValueError("Test error")

        # Fail twice to open circuit
        for _ in range(2):
            with pytest.raises(ValueError):
                failing_function()

        # Third call should be blocked by circuit breaker
        with pytest.raises(Exception, match="Circuit breaker is OPEN"):
            failing_function()

        # Only 2 actual calls, third was blocked
        assert call_count == 2

    def test_decorator_recovery(self):
        """Test decorator allows recovery"""
        call_count = 0
        fail_until_count = 2

        @circuit_breaker(
            "recovery_service",
            failure_threshold=2,
            recovery_timeout=1,
            success_threshold=1
        )
        def recovering_function():
            nonlocal call_count
            call_count += 1
            if call_count <= fail_until_count:
                raise ValueError("Temporary failure")
            return "recovered"

        # Open circuit
        for _ in range(2):
            with pytest.raises(ValueError):
                recovering_function()

        # Wait for recovery window
        time.sleep(1.1)

        # Should succeed and close circuit
        result = recovering_function()
        assert result == "recovered"


class TestCircuitBreakerEdgeCases:
    """Test edge cases and error conditions"""

    def test_zero_failure_threshold(self):
        """Test circuit breaker with zero threshold (should work as normal)"""
        cb = CircuitBreaker(failure_threshold=0)

        def success_func():
            return "ok"

        # Should still work
        result = cb.call(success_func)
        assert result == "ok"

    def test_very_short_recovery_timeout(self):
        """Test very short recovery timeout"""
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)

        def failing_func():
            raise Exception("Fail")

        # Open circuit
        with pytest.raises(Exception):
            cb.call(failing_func)

        assert cb.state == CircuitState.OPEN

        # Wait minimal time
        time.sleep(0.2)

        # Should attempt recovery
        with pytest.raises(Exception):
            cb.call(failing_func)

    def test_exception_types(self):
        """Test circuit breaker with different exception types"""
        cb = CircuitBreaker(failure_threshold=2)

        def multi_error_func(error_type):
            if error_type == "value":
                raise ValueError("Value error")
            elif error_type == "type":
                raise TypeError("Type error")
            else:
                raise RuntimeError("Runtime error")

        # Different exceptions should all count towards threshold
        with pytest.raises(ValueError):
            cb.call(multi_error_func, "value")

        with pytest.raises(TypeError):
            cb.call(multi_error_func, "type")

        assert cb.state == CircuitState.OPEN


class TestMultipleCircuitBreakers:
    """Test multiple independent circuit breakers"""

    def test_independent_circuits(self):
        """Test that different services have independent circuits"""
        from shared.circuit_breaker import get_circuit_breaker

        cb1 = get_circuit_breaker("service1", failure_threshold=2)
        cb2 = get_circuit_breaker("service2", failure_threshold=2)

        def failing_func():
            raise Exception("Fail")

        # Open circuit 1
        for _ in range(2):
            with pytest.raises(Exception):
                cb1.call(failing_func)

        assert cb1.state == CircuitState.OPEN
        assert cb2.state == CircuitState.CLOSED

    def test_circuit_breaker_reuse(self):
        """Test getting same circuit breaker instance"""
        from shared.circuit_breaker import get_circuit_breaker

        cb1 = get_circuit_breaker("reuse_service")
        cb2 = get_circuit_breaker("reuse_service")

        assert cb1 is cb2
