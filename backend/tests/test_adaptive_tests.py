"""
Test script to verify adaptive test functionality and question difficulty levels.
"""
import pytest
import sys
import os
import logging
import json
import random
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the parent directory and src directory to the path so we can import our models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.src.main import app
from backend.src.database.models import Question, TestAttempt, User, Paper
from backend.src.database.database import get_db
from backend.src.routers.tests import select_adaptive_question

# Test client
client = TestClient(app)

@pytest.fixture
def test_user_token(client):
    """Create a test user and return a valid token."""
    # Create a test user
    user_data = {
        "email": "testuser@example.com",
        "password": "testpassword123",
        "full_name": "Test User"
    }
    response = client.post("/users/", json=user_data)
    assert response.status_code == 201

    # Login to get token
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return token

@pytest.fixture
def sample_paper(db: Session):
    """Create a sample paper with questions of varying difficulty."""
    # Create a paper
    paper = Paper(paper_name="Adaptive Test Paper", description="Paper for testing adaptive features")
    db.add(paper)
    db.flush()
    
    # Create questions with different difficulty levels
    difficulty_levels = ["Easy", "Medium", "Hard"]
    questions = []
    
    for i in range(15):
        difficulty = difficulty_levels[i % 3]
        question = Question(
            paper_id=paper.paper_id,
            question_text=f"Test Question {i+1} ({difficulty})",
            difficulty_level=difficulty
        )
        db.add(question)
        questions.append(question)
    
    db.commit()
    return paper

def test_question_difficulty_creation(db: Session):
    """Test that questions can be created with different difficulty levels."""
    # Create questions with different difficulty levels
    difficulty_levels = ["Easy", "Medium", "Hard"]
    for difficulty in difficulty_levels:
        question = Question(
            question_text=f"Test {difficulty} Question",
            difficulty_level=difficulty
        )
        db.add(question)
    
    db.commit()
    
    # Verify questions were created with correct difficulty
    for difficulty in difficulty_levels:
        questions = db.query(Question).filter(Question.difficulty_level == difficulty).all()
        assert len(questions) > 0
        assert questions[0].difficulty_level == difficulty

def test_start_adaptive_test(client, test_user_token, sample_paper):
    """Test starting an adaptive test with a specific strategy."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # Start an adaptive test
    response = client.post(
        "/tests/start",
        headers=headers,
        json={
            "paper_id": sample_paper.paper_id,
            "adaptive": True,
            "adaptive_strategy": "progressive"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "attempt_id" in data
    assert "adaptive_strategy_chosen" in data
    assert data["adaptive_strategy_chosen"] == "progressive"

def test_next_question_adaptive(client, test_user_token, db: Session, sample_paper):
    """Test getting the next question in an adaptive test."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # Start an adaptive test
    start_response = client.post(
        "/tests/start",
        headers=headers,
        json={
            "paper_id": sample_paper.paper_id,
            "adaptive": True,
            "adaptive_strategy": "progressive"
        }
    )
    
    attempt_id = start_response.json()["attempt_id"]
    
    # Get the next question
    next_response = client.get(
        f"/tests/{attempt_id}/next_question",
        headers=headers
    )
    
    assert next_response.status_code == 200
    data = next_response.json()
    assert "question" in data
    assert "options" in data
    
    # Submit an answer (correct) and get next question
    question_id = data["question"]["id"]
    correct_option = data["options"][0]["id"]  # Assuming first option is correct for test
    
    answer_response = client.post(
        f"/tests/{attempt_id}/answer",
        headers=headers,
        json={
            "question_id": question_id,
            "selected_option_id": correct_option
        }
    )
    
    assert answer_response.status_code == 200
    
    # Get the next question - should be harder
    next_response = client.get(
        f"/tests/{attempt_id}/next_question",
        headers=headers
    )
    
    assert next_response.status_code == 200

def test_select_adaptive_question():
    """Test the logic for adaptive question selection."""
    # Create mock questions with different difficulty levels
    questions = [
        Question(id=1, question_text="Easy Q1", difficulty_level="Easy"),
        Question(id=2, question_text="Easy Q2", difficulty_level="Easy"),
        Question(id=3, question_text="Medium Q1", difficulty_level="Medium"),
        Question(id=4, question_text="Medium Q2", difficulty_level="Medium"),
        Question(id=5, question_text="Hard Q1", difficulty_level="Hard"),
        Question(id=6, question_text="Hard Q2", difficulty_level="Hard")
    ]
    
    # Test progressive strategy with correct answers
    next_question = select_adaptive_question(
        questions=questions,
        answered_questions=[1],  # Easy question answered
        current_difficulty="Easy",
        performance=1.0,  # Perfect performance
        strategy="progressive"
    )
    
    assert next_question.difficulty_level == "Medium"
    
    # Test progressive strategy with incorrect answers
    next_question = select_adaptive_question(
        questions=questions,
        answered_questions=[3],  # Medium question answered
        current_difficulty="Medium",
        performance=0.0,  # Poor performance
        strategy="progressive"
    )
    
    assert next_question.difficulty_level == "Easy"
    
    # Test random strategy
    for _ in range(5):
        next_question = select_adaptive_question(
            questions=questions,
            answered_questions=[],
            current_difficulty=None,
            performance=None,
            strategy="random"
        )
        assert next_question in questions

def test_finish_adaptive_test(client, test_user_token, db: Session, sample_paper):
    """Test finishing an adaptive test and updating performance records."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # Start an adaptive test
    start_response = client.post(
        "/tests/start",
        headers=headers,
        json={
            "paper_id": sample_paper.paper_id,
            "adaptive": True
        }
    )
    
    attempt_id = start_response.json()["attempt_id"]
    
    # Get the first question
    next_response = client.get(
        f"/tests/{attempt_id}/next_question",
        headers=headers
    )
    
    question_id = next_response.json()["question"]["id"]
    option_id = next_response.json()["options"][0]["id"]
    
    # Submit an answer
    client.post(
        f"/tests/{attempt_id}/answer",
        headers=headers,
        json={
            "question_id": question_id,
            "selected_option_id": option_id
        }
    )
    
    # Finish the test
    finish_response = client.post(
        f"/tests/{attempt_id}/finish",
        headers=headers
    )
    
    assert finish_response.status_code == 200
    assert "score" in finish_response.json()
    
    # Check that performance records were created
    db_session = next(get_db())
    attempt = db_session.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    assert attempt is not None
    assert attempt.is_completed is True
