import pytest
from fastapi import status
from unittest.mock import patch
from jose import jwt

# Use local import style for backend tests
from backend.src.database.models import User, AllowedEmail
from backend.src.auth.auth import SECRET_KEY, ALGORITHM

@pytest.fixture
def create_test_users(db_session):
    """Create test users with different roles for authentication testing"""
    # Create admin user
    admin_user = User(
        email="admin.test@example.com",
        google_id="admin-google-id-test",
        first_name="Admin",
        last_name="User",
        role="Admin",
        is_active=True
    )
    
    # Create regular user
    regular_user = User(
        email="user.test@example.com",
        google_id="user-google-id-test",
        first_name="Regular",
        last_name="User",
        role="User",
        is_active=True
    )
    
    # Add users to the database
    db_session.add(admin_user)
    db_session.add(regular_user)
    
    # Add emails to whitelist
    admin_email = AllowedEmail(
        email="admin.test@example.com",
        added_by_admin_id=1  # Assuming ID 1 exists for this test
    )
    
    regular_email = AllowedEmail(
        email="user.test@example.com",
        added_by_admin_id=1  # Assuming ID 1 exists for this test
    )
    
    # Add whitelisted emails to database
    db_session.add(admin_email)
    db_session.add(regular_email)
    
    db_session.commit()
    
    return {"admin": admin_user, "regular": regular_user}

@pytest.mark.auth
class TestRoleBasedAuthentication:
    """Test the role-based authentication flow"""
    
    def test_admin_role_preserved(self, client, db_session, create_test_users):
        """Test that admin role is preserved during login"""
        # Simulate Google login with admin email
        token_info = {"token": "mock_google_token_for_admin"}
          # Mock the id_token.verify_oauth2_token to return admin user info
        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "email": "admin.test@example.com",
                "sub": "admin-google-id-test",
                "given_name": "Admin",
                "family_name": "User"
            }
            
            response = client.post("/auth/google-callback", json=token_info)
            
            assert response.status_code == status.HTTP_200_OK
            assert "access_token" in response.json()
            
            # Verify token contains correct role
            from src.auth.auth import jwt, SECRET_KEY, ALGORITHM
            token = response.json()["access_token"]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            assert payload["role"] == "Admin"
            assert payload["sub"] == "admin.test@example.com"
            assert "user_id" in payload
    
    def test_user_role_preserved(self, client, db_session, create_test_users):
        """Test that regular user role is preserved during login"""
        # Simulate Google login with regular user email
        token_info = {"token": "mock_google_token_for_user"}
          # Mock the id_token.verify_oauth2_token to return regular user info
        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "email": "user.test@example.com",
                "sub": "user-google-id-test",
                "given_name": "Regular",
                "family_name": "User"
            }
            
            response = client.post("/auth/google-callback", json=token_info)
            
            assert response.status_code == status.HTTP_200_OK
            assert "access_token" in response.json()
            
            # Verify token contains correct role
            from src.auth.auth import jwt, SECRET_KEY, ALGORITHM
            token = response.json()["access_token"]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            assert payload["role"] == "User"
            assert payload["sub"] == "user.test@example.com"
            assert "user_id" in payload
    
    def test_new_user_gets_default_role(self, client, db_session):
        """Test that a new user gets the default 'User' role"""
        # Add email to whitelist first
        new_email = "new.user@example.com"
        allowed_email = AllowedEmail(
            email=new_email,
            added_by_admin_id=1  # Assuming ID 1 exists for this test
        )
        db_session.add(allowed_email)
        db_session.commit()
        
        # Simulate Google login with new user email
        token_info = {"token": "mock_google_token_for_new_user"}
          # Mock the id_token.verify_oauth2_token to return new user info
        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "email": new_email,
                "sub": "new-user-google-id",
                "given_name": "New",
                "family_name": "User"
            }
            
            response = client.post("/auth/google-callback", json=token_info)
            
            assert response.status_code == status.HTTP_200_OK
            assert "access_token" in response.json()
            
            # Verify token contains correct default role
            from src.auth.auth import jwt, SECRET_KEY, ALGORITHM
            token = response.json()["access_token"]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            assert payload["role"] == "User"
            assert payload["sub"] == new_email
            assert "user_id" in payload
            
            # Verify user was created in the database with correct role
            user = db_session.query(User).filter(User.email == new_email).first()
            assert user is not None
            assert user.role == "User"
    
    def test_non_whitelisted_email_rejected(self, client, db_session):
        """Test that non-whitelisted emails are rejected"""
        # Simulate Google login with non-whitelisted email
        token_info = {"token": "mock_google_token_for_non_whitelisted"}
          # Mock the id_token.verify_oauth2_token to return non-whitelisted user info
        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "email": "not.allowed@example.com",
                "sub": "not-allowed-google-id",
                "given_name": "Not",
                "family_name": "Allowed"
            }
            
            response = client.post("/auth/google-callback", json=token_info)
            
            # Should be unauthorized
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Your email is not authorized" in response.json()["detail"]
