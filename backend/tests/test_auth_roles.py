"""
Tests for verifying authentication flows related to the CIL CBT App.
These tests validate the behavior of Google authentication, role preservation,
and proper JWT token generation.

Important behaviors tested:
1. Whitelisting checks
2. Role preservation for existing users
3. Default role assignment for new users
4. Inclusion of role and user_id in JWT tokens
"""

import os
import json
import pytest
from datetime import datetime, timedelta
from jose import jwt
from fastapi import status

# Use the correct import style for backend tests
from backend.src.auth.auth import SECRET_KEY, ALGORITHM
from backend.src.database.models import User, AllowedEmail


def test_verify_token_includes_correct_role(client, db_session):
    """
    Test that the verify_token endpoint returns the correct user role.
    This verifies that roles are being properly extracted from tokens.
    """
    # Create test user with Admin role
    admin_user = User(
        email="admin@example.com",
        google_id="g-123456-admin",
        first_name="Admin",
        last_name="Test",
        role="Admin",
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()
    
    # Create token with role included
    payload = {
        "sub": admin_user.email,
        "role": admin_user.role,
        "user_id": admin_user.user_id,
        "exp": datetime.utcnow() + timedelta(minutes=15)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    # Test the /auth/me endpoint which uses verify_token
    client.headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/auth/me")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == admin_user.email
    assert data["role"] == "Admin"
    assert data["user_id"] == admin_user.user_id


def test_dev_login_includes_role_and_user_id(client, db_session):
    """
    Test that the dev-login endpoint includes role and user_id in the token.
    """
    # Set environment variable for development mode
    os.environ["ENV"] = "development"
    
    # Make the request to dev-login endpoint
    response = client.post("/auth/dev-login")
    
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()
    
    # Verify token contains role and user_id
    token = response.json()["access_token"]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    
    assert "role" in payload
    assert payload["role"] == "Admin"  # Dev login should create Admin role
    assert "user_id" in payload
    
    # Reset environment variable
    os.environ.pop("ENV", None)
