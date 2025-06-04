import pytest
from fastapi import status
from sqlalchemy.orm import Session
from ..src.database.models import AllowedEmail

@pytest.mark.auth
@pytest.mark.admin
class TestEmailWhitelisting:
    """Test email whitelisting functionality"""

    def test_whitelist_email(self, admin_client, test_db: Session):
        """Admin should be able to whitelist an email"""
        test_email = "test.whitelist@example.com"

        # Check that email is not already whitelisted
        existing = test_db.query(AllowedEmail).filter(AllowedEmail.email == test_email).first()
        if existing:
            test_db.delete(existing)
            test_db.commit()

        # Whitelist the email
        response = admin_client.post(
            "/admin/allowed-emails",
            json={"email": test_email}
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
        assert test_email in response.json()["message"]

        # Verify in database
        db_entry = test_db.query(AllowedEmail).filter(AllowedEmail.email == test_email).first()
        assert db_entry is not None
        assert db_entry.email == test_email

    def test_whitelist_already_whitelisted(self, admin_client, test_db: Session):
        """Whitelisting an already whitelisted email should be successful"""
        test_email = "already.whitelisted@example.com"

        # Ensure email is already whitelisted
        existing = test_db.query(AllowedEmail).filter(AllowedEmail.email == test_email).first()
        if not existing:
            allowed_email = AllowedEmail(
                email=test_email,
                added_by_admin_id=1  # Admin user id
            )
            test_db.add(allowed_email)
            test_db.commit()

        # Try to whitelist again
        response = admin_client.post(
            "/admin/allowed-emails",
            json={"email": test_email}
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
        assert "already whitelisted" in response.json()["message"]

    def test_whitelist_invalid_email(self, admin_client):
        """Should reject invalid email formats"""
        response = admin_client.post(
            "/admin/allowed-emails",
            json={"email": "not-an-email"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_whitelisted_emails(self, admin_client, test_db: Session):
        """Admin should be able to list all whitelisted emails"""
        response = admin_client.get("/admin/allowed-emails")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_whitelist_email_unauthorized(self, user_client):
        """Regular users should not be able to whitelist emails"""
        response = user_client.post(
            "/admin/allowed-emails",
            json={"email": "test@example.com"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
