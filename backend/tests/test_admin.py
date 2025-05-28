from fastapi.testclient import TestClient
import pytest
from ..main import app
from ..auth.auth import create_access_token

client = TestClient(app)

def get_admin_token():
    admin_data = {
        "user_id": 1,
        "email": "admin@example.com",
        "role": "Admin"
    }
    return create_access_token(admin_data)

def get_user_token():
    user_data = {
        "user_id": 2,
        "email": "user@example.com",
        "role": "User"
    }
    return create_access_token(user_data)

def test_access_admin_routes_with_admin():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Test accessing question management
    response = client.get("/questions", headers=headers)
    assert response.status_code == 200

    # Test accessing user management
    response = client.get("/auth/users", headers=headers)
    assert response.status_code == 200

def test_access_admin_routes_with_user():
    token = get_user_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Test accessing question management
    response = client.get("/questions", headers=headers)
    assert response.status_code == 403

    # Test accessing user management
    response = client.get("/auth/users", headers=headers)
    assert response.status_code == 403

def test_create_question():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    question_data = {
        "question_text": "Test question",
        "question_type": "MCQ",
        "correct_option_index": 0,
        "paper_id": 1,
        "section_id": 1,
        "options": [
            {"option_text": "Correct answer", "option_order": 0},
            {"option_text": "Wrong answer 1", "option_order": 1},
            {"option_text": "Wrong answer 2", "option_order": 2},
            {"option_text": "Wrong answer 3", "option_order": 3}
        ]
    }
    
    response = client.post("/questions/", json=question_data, headers=headers)
    assert response.status_code == 200
    assert response.json()["question_text"] == "Test question"
    assert response.json()["is_active"] == True

def test_manage_users():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test getting list of users
    response = client.get("/auth/users", headers=headers)
    assert response.status_code == 200
    
    # Test updating user role
    response = client.put(
        "/auth/users/2/role",
        json={"role": "Admin"},
        headers=headers
    )
    assert response.status_code == 200
    
    # Test updating user status
    response = client.put(
        "/auth/users/2/status",
        json={"is_active": False},
        headers=headers
    )
    assert response.status_code == 200
