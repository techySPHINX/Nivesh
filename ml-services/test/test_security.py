"""
Unit tests for security utilities

Tests:
- Input validation
- API authentication
- Rate limiting
- Input sanitization
"""

import pytest
import time
from shared.security import (
    InputValidator,
    RateLimiter,
    SecurityConfig,
    sanitize_log_data
)
from fastapi import HTTPException


class TestInputValidator:
    """Test input validation"""
    
    def test_validate_text_valid(self):
        """Test valid text input"""
        text = "This is a valid query"
        result = InputValidator.validate_text(text, min_length=3, max_length=100)
        assert result == text.strip()
    
    def test_validate_text_empty(self):
        """Test empty text rejection"""
        with pytest.raises(ValueError, match="cannot be empty"):
            InputValidator.validate_text("", allow_empty=False)
    
    def test_validate_text_whitespace_only(self):
        """Test whitespace-only text"""
        with pytest.raises(ValueError, match="cannot be empty"):
            InputValidator.validate_text("   ", allow_empty=False)
    
    def test_validate_text_too_long(self):
        """Test text truncation"""
        long_text = "a" * 1000
        result = InputValidator.validate_text(long_text, max_length=100)
        assert len(result) == 100
    
    def test_validate_text_not_string(self):
        """Test non-string input rejection"""
        with pytest.raises(ValueError, match="must be a string"):
            InputValidator.validate_text(123)
    
    def test_validate_text_null_bytes(self):
        """Test null byte removal"""
        text = "test\x00query"
        result = InputValidator.validate_text(text)
        assert "\x00" not in result
    
    def test_validate_user_id_valid(self):
        """Test valid user ID"""
        user_id = "user_123-abc"
        result = InputValidator.validate_user_id(user_id)
        assert result == user_id
    
    def test_validate_user_id_invalid_characters(self):
        """Test user ID with invalid characters"""
        with pytest.raises(ValueError, match="alphanumeric"):
            InputValidator.validate_user_id("user@123")
    
    def test_validate_user_id_empty(self):
        """Test empty user ID"""
        with pytest.raises(ValueError, match="cannot be empty"):
            InputValidator.validate_user_id("")
    
    def test_validate_numeric_valid(self):
        """Test valid numeric input"""
        result = InputValidator.validate_numeric(42.5, "amount", min_value=0, max_value=100)
        assert result == 42.5
    
    def test_validate_numeric_below_min(self):
        """Test numeric value below minimum"""
        with pytest.raises(ValueError, match="must be >="):
            InputValidator.validate_numeric(-5, "amount", min_value=0)
    
    def test_validate_numeric_above_max(self):
        """Test numeric value above maximum"""
        with pytest.raises(ValueError, match="must be <="):
            InputValidator.validate_numeric(150, "amount", max_value=100)
    
    def test_validate_numeric_not_number(self):
        """Test non-numeric input"""
        with pytest.raises(ValueError, match="must be a number"):
            InputValidator.validate_numeric("abc", "amount")
    
    def test_validate_dict_valid(self):
        """Test valid dictionary"""
        data = {"key1": "value1", "key2": "value2"}
        result = InputValidator.validate_dict(data)
        assert result == data
    
    def test_validate_dict_missing_fields(self):
        """Test dictionary missing required fields"""
        data = {"key1": "value1"}
        with pytest.raises(ValueError, match="missing required fields"):
            InputValidator.validate_dict(data, required_fields=["key1", "key2"])
    
    def test_validate_dict_not_dict(self):
        """Test non-dictionary input"""
        with pytest.raises(ValueError, match="must be a dictionary"):
            InputValidator.validate_dict("not a dict")


class TestRateLimiter:
    """Test rate limiting"""
    
    def test_rate_limiter_within_limit(self):
        """Test requests within rate limit"""
        limiter = RateLimiter()
        client_id = "test_client_1"
        
        # Should allow 10 requests
        for i in range(10):
            assert limiter.check_rate_limit(client_id, max_requests=10, window_seconds=60)
    
    def test_rate_limiter_exceeds_limit(self):
        """Test rate limit exceeded"""
        limiter = RateLimiter()
        client_id = "test_client_2"
        
        # Fill up the limit
        for i in range(5):
            limiter.check_rate_limit(client_id, max_requests=5, window_seconds=60)
        
        # Next request should be denied
        assert not limiter.check_rate_limit(client_id, max_requests=5, window_seconds=60)
    
    def test_rate_limiter_window_reset(self):
        """Test rate limit window reset"""
        limiter = RateLimiter()
        client_id = "test_client_3"
        
        # Fill up the limit
        for i in range(3):
            limiter.check_rate_limit(client_id, max_requests=3, window_seconds=1)
        
        # Wait for window to expire
        time.sleep(1.1)
        
        # Should be able to make requests again
        assert limiter.check_rate_limit(client_id, max_requests=3, window_seconds=1)
    
    def test_rate_limiter_multiple_clients(self):
        """Test rate limiting for multiple clients"""
        limiter = RateLimiter()
        
        # Each client should have independent limits
        assert limiter.check_rate_limit("client_1", max_requests=1, window_seconds=60)
        assert limiter.check_rate_limit("client_2", max_requests=1, window_seconds=60)
        
        # Client 1 should be rate limited
        assert not limiter.check_rate_limit("client_1", max_requests=1, window_seconds=60)
        
        # Client 2 should still be rate limited
        assert not limiter.check_rate_limit("client_2", max_requests=1, window_seconds=60)


class TestSanitization:
    """Test data sanitization"""
    
    def test_sanitize_log_data_sensitive_fields(self):
        """Test sanitization of sensitive fields"""
        data = {
            "username": "test_user",
            "password": "secret123",
            "api_key": "sk-abc123",
            "credit_card": "1234-5678-9012-3456",
            "amount": 100.50
        }
        
        sanitized = sanitize_log_data(data)
        
        assert sanitized["username"] == "test_user"
        assert sanitized["password"] == "***REDACTED***"
        assert sanitized["api_key"] == "***REDACTED***"
        assert sanitized["credit_card"] == "***REDACTED***"
        assert sanitized["amount"] == 100.50
    
    def test_sanitize_log_data_case_insensitive(self):
        """Test case-insensitive field matching"""
        data = {
            "Password": "secret",
            "API_KEY": "key123"
        }
        
        sanitized = sanitize_log_data(data)
        
        assert sanitized["Password"] == "***REDACTED***"
        assert sanitized["API_KEY"] == "***REDACTED***"
    
    def test_sanitize_log_data_no_sensitive_fields(self):
        """Test sanitization with no sensitive data"""
        data = {
            "user_id": "123",
            "amount": 50.0,
            "timestamp": "2026-01-27"
        }
        
        sanitized = sanitize_log_data(data)
        
        # Should be unchanged
        assert sanitized == data


class TestSecurityConfig:
    """Test security configuration"""
    
    def test_security_config_defaults(self):
        """Test default configuration values"""
        config = SecurityConfig()
        
        assert config.max_text_length == 1024
        assert config.max_batch_size == 32
        assert config.rate_limit_per_minute == 100
        assert config.allowed_user_id_pattern is not None


# Integration tests
class TestSecurityIntegration:
    """Integration tests for security components"""
    
    def test_full_validation_pipeline(self):
        """Test complete validation pipeline"""
        # Simulate user input
        raw_input = {
            "query": "  What is my spending?  ",
            "user_id": "user_123",
            "amount": 50.0
        }
        
        # Validate each field
        query = InputValidator.validate_text(raw_input["query"], min_length=3)
        user_id = InputValidator.validate_user_id(raw_input["user_id"])
        amount = InputValidator.validate_numeric(raw_input["amount"], "amount", min_value=0)
        
        # Check results
        assert query == "What is my spending?"
        assert user_id == "user_123"
        assert amount == 50.0
    
    def test_validation_with_malicious_input(self):
        """Test validation against malicious input"""
        malicious_inputs = [
            {"query": "<script>alert('xss')</script>"},  # XSS attempt
            {"user_id": "../../../etc/passwd"},  # Path traversal
            {"query": "a" * 10000},  # Extremely long input
            {"user_id": "user'; DROP TABLE users;--"},  # SQL injection attempt
        ]
        
        # All should either be sanitized or rejected
        for input_data in malicious_inputs:
            if "query" in input_data:
                query = InputValidator.validate_text(
                    input_data["query"],
                    max_length=1024
                )
                assert len(query) <= 1024
            
            if "user_id" in input_data:
                # SQL injection and path traversal should fail validation
                with pytest.raises(ValueError):
                    InputValidator.validate_user_id(input_data["user_id"])
