import pytest
from fastapi import status

@pytest.mark.auth
@pytest.mark.admin
class TestAdminAccess:
    """Test admin access control"""
    
    def test_access_admin_routes_with_admin(self, admin_client):
        """Admin should be able to access admin-only routes"""
        # Test accessing question management
        response = admin_client.get("/questions")
        assert response.status_code == status.HTTP_200_OK

        # Test accessing user management
        response = admin_client.get("/auth/users")
        assert response.status_code == status.HTTP_200_OK

    def test_access_admin_routes_with_user(self, user_client):
        """Regular users should not be able to access admin-only routes"""
        # Test accessing question management
        response = user_client.get("/questions")
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Test accessing user management
        response = user_client.get("/auth/users")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_access_without_token(self, client):
        """Requests without token should be rejected"""
        # Test accessing question management
        response = client.get("/questions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Test accessing user management
        response = client.get("/auth/users")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.auth
@pytest.mark.admin
class TestUserManagement:
    """Test user management functionality"""

    def test_list_users(self, admin_client):
        """Admin should be able to list all users"""
        response = admin_client.get("/auth/users")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)
        assert len(response.json()) > 0

    @pytest.mark.parametrize(
        "role,expected_status",
        [
            ("Admin", status.HTTP_200_OK),
            ("RegularUser", status.HTTP_200_OK),
            ("InvalidRole", status.HTTP_400_BAD_REQUEST)
        ]
    )
    def test_update_user_role(self, admin_client, role, expected_status):
        """Admin should be able to update user roles"""
        response = admin_client.put(
            "/auth/users/2/role",
            json={"role": role}
        )
        assert response.status_code == expected_status
        if expected_status == status.HTTP_200_OK:
            assert response.json()["role"] == role

    @pytest.mark.parametrize(
        "is_active",
        [True, False]
    )
    def test_update_user_status(self, admin_client, is_active):
        """Admin should be able to activate/deactivate users"""
        response = admin_client.put(
            "/auth/users/2/status",
            json={"is_active": is_active}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_active"] == is_active

@pytest.mark.auth
@pytest.mark.admin
class TestEmailWhitelist:
    """Test email whitelist functionality"""

    def test_whitelist_email_as_admin(self, admin_client):
        """Admin should be able to whitelist emails"""
        test_email = "newuser@example.com"
        response = admin_client.post(
            "/auth/whitelist-email",
            params={"email": test_email}
        )
        assert response.status_code == status.HTTP_200_OK
        assert "success" in response.json()["status"].lower()

    def test_whitelist_email_as_user(self, user_client):
        """Regular users should not be able to whitelist emails"""
        test_email = "another@example.com"
        response = user_client.post(
            "/auth/whitelist-email",
            params={"email": test_email}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.auth
class TestUserIdentity:
    """Test user identity endpoints"""

    def test_me_endpoint_admin(self, admin_client):
        """Admin should get correct identity info"""
        response = admin_client.get("/auth/me")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "admin@example.com"
        assert data["role"] == "Admin"

    def test_me_endpoint_user(self, user_client):
        """Regular user should get correct identity info"""
        response = user_client.get("/auth/me")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "user@example.com"
        assert data["role"] == "RegularUser"

@pytest.mark.auth
@pytest.mark.admin
class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_rate_limiting(self, admin_client):
        """Endpoints should enforce rate limits"""
        # Make multiple rapid requests to trigger rate limit
        for _ in range(31):  # Should hit rate limit after 30 requests
            response = admin_client.get("/auth/users")
        
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS