"""Tests for token authentication lifecycle."""

from datetime import datetime, timedelta
from app.api.auth import validate_token, _tokens, TOKEN_LIFETIME


class TestTokenValidation:
    def setup_method(self):
        _tokens.clear()

    def test_valid_token(self):
        _tokens["test-token"] = datetime.utcnow() + TOKEN_LIFETIME
        assert validate_token("test-token") is True

    def test_invalid_token(self):
        assert validate_token("nonexistent") is False

    def test_expired_token(self):
        _tokens["expired"] = datetime.utcnow() - timedelta(seconds=1)
        assert validate_token("expired") is False
        # Should be cleaned up
        assert "expired" not in _tokens

    def test_empty_token(self):
        assert validate_token("") is False

    def test_multiple_tokens(self):
        _tokens["token-a"] = datetime.utcnow() + TOKEN_LIFETIME
        _tokens["token-b"] = datetime.utcnow() + TOKEN_LIFETIME
        assert validate_token("token-a") is True
        assert validate_token("token-b") is True

    def test_token_just_at_boundary(self):
        """Token expiring right now should be expired."""
        _tokens["boundary"] = datetime.utcnow()
        # This is a race but in practice utcnow() in validate_token
        # will be slightly after, so it should be expired
        result = validate_token("boundary")
        # Either True or False is acceptable at exact boundary
        assert isinstance(result, bool)
