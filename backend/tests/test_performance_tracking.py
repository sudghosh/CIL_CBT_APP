"""
Test script to verify user performance tracking and aggregation features.
"""
import pytest
import sys
import os
import logging
import json
import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the parent directory and src directory to the path so we can import our models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.src.main import app
from backend.src.database.models import (
    User, Question, TestAttempt, TestAnswer, UserPerformanceProfile,
    UserOverallSummary, UserTopicSummary
)
from backend.src.database.database import get_db
from backend.src.tasks.performance_aggregator import performance_aggregation_task

# Test client
client = TestClient(app)

@pytest.fixture
def test_user_and_token(client, db: Session):
    """Create a test user and return user object and valid token."""
    # Create a test user
    user_data = {
        "email": "perftest@example.com",
        "password": "testpassword123",
        "full_name": "Performance Test User"
    }
    response = client.post("/users/", json=user_data)
    assert response.status_code == 201
    
    # Get the user from DB
    user = db.query(User).filter(User.email == user_data["email"]).first()
    
    # Login to get token
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    return {"user": user, "token": token}

@pytest.fixture
def completed_test_data(db: Session, test_user_and_token):
    """Create sample test data with performance records."""
    user = test_user_and_token["user"]
    
    # Create questions with topics and difficulty levels
    questions = []
    topics = ["Mathematics", "Science", "History", "English"]
    difficulty_levels = ["Easy", "Medium", "Hard"]
    
    for i in range(20):
        topic = topics[i % len(topics)]
        difficulty = difficulty_levels[i % len(difficulty_levels)]
        question = Question(
            question_text=f"Test Question {i+1}",
            topic=topic,
            subtopic=f"{topic} Subtopic {i//4 + 1}",
            difficulty_level=difficulty,
        )
        db.add(question)
        questions.append(question)
    
    db.flush()
    
    # Create a test attempt
    test_attempt = TestAttempt(
        user_id=user.id,
        start_time=datetime.datetime.now() - datetime.timedelta(hours=1),
        end_time=datetime.datetime.now() - datetime.timedelta(minutes=30),
        is_completed=True
    )
    db.add(test_attempt)
    db.flush()
    
    # Create test answers (some correct, some incorrect)
    for i, question in enumerate(questions):
        is_correct = i % 2 == 0  # Alternate correct/incorrect
        test_answer = TestAnswer(
            test_attempt_id=test_attempt.id,
            question_id=question.id,
            is_correct=is_correct
        )
        db.add(test_answer)
        
        # Create performance profile record
        profile = UserPerformanceProfile(
            user_id=user.id,
            test_attempt_id=test_attempt.id,
            question_id=question.id,
            topic=question.topic,
            subtopic=question.subtopic,
            difficulty_level=question.difficulty_level,
            correct=is_correct,
            response_time_seconds=random.randint(10, 60),
            created_at=datetime.datetime.now()
        )
        db.add(profile)
    
    db.commit()
    
    return {
        "user": user,
        "test_attempt": test_attempt,
        "questions": questions
    }

def test_performance_aggregation(db: Session, completed_test_data):
    """Test that performance aggregation correctly calculates user statistics."""
    # Run the aggregation task
    bg_tasks = BackgroundTasks()
    performance_aggregation_task(completed_test_data["user"].id, db, bg_tasks)
    
    # Check overall summary
    overall_summary = db.query(UserOverallSummary).filter(
        UserOverallSummary.user_id == completed_test_data["user"].id
    ).first()
    
    assert overall_summary is not None
    assert overall_summary.total_tests_taken == 1
    assert overall_summary.total_questions_attempted == len(completed_test_data["questions"])
    assert overall_summary.total_correct_answers == len(completed_test_data["questions"]) // 2  # Half are correct
    assert 0 <= overall_summary.avg_score_percentage <= 100
    
    # Check topic summaries
    topic_summaries = db.query(UserTopicSummary).filter(
        UserTopicSummary.user_id == completed_test_data["user"].id
    ).all()
    
    assert len(topic_summaries) > 0
    
    # Verify each topic has correct data
    topics = set(q.topic for q in completed_test_data["questions"])
    tracked_topics = set(ts.topic for ts in topic_summaries)
    assert topics == tracked_topics

def test_get_user_performance_endpoints(client, test_user_and_token, completed_test_data):
    """Test the performance dashboard API endpoints."""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Test overall performance endpoint
    response = client.get(
        "/performance/overall",
        headers=headers
    )
    
    assert response.status_code == 200
    overall_data = response.json()
    assert "total_tests_taken" in overall_data
    assert "avg_score_percentage" in overall_data
    
    # Test topic performance endpoint
    response = client.get(
        "/performance/topics",
        headers=headers
    )
    
    assert response.status_code == 200
    topic_data = response.json()
    assert isinstance(topic_data, list)
    if len(topic_data) > 0:
        assert "topic" in topic_data[0]
        assert "accuracy_percentage" in topic_data[0]

def test_user_performance_tracking(client, test_user_and_token, db: Session):
    """Test that performance is tracked when completing a test."""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    user = test_user_and_token["user"]
    
    # Create a test paper with questions
    paper_response = client.post(
        "/papers/",
        headers=headers,
        json={
            "paper_name": "Performance Test Paper",
            "description": "Test Paper for Performance Tracking"
        }
    )
    paper_id = paper_response.json()["paper_id"]
    
    # Add questions to the paper
    for i in range(5):
        question_response = client.post(
            "/questions/",
            headers=headers,
            json={
                "paper_id": paper_id,
                "question_text": f"Performance Test Question {i+1}",
                "topic": "Test Topic",
                "difficulty_level": "Medium",
                "options": [
                    {"option_text": "Option A", "is_correct": i == 0},
                    {"option_text": "Option B", "is_correct": i == 1},
                    {"option_text": "Option C", "is_correct": i == 2},
                    {"option_text": "Option D", "is_correct": i == 3}
                ]
            }
        )
    
    # Start a test
    start_response = client.post(
        "/tests/start",
        headers=headers,
        json={"paper_id": paper_id}
    )
    
    attempt_id = start_response.json()["attempt_id"]
    
    # Answer each question
    for i in range(5):
        # Get the next question
        next_response = client.get(
            f"/tests/{attempt_id}/next_question",
            headers=headers
        )
        
        question_id = next_response.json()["question"]["id"]
        options = next_response.json()["options"]
        
        # Select the correct answer half the time
        selected_option = next((o for o in options if o["is_correct"]), options[0])
        if i % 2 == 1:  # Make some answers incorrect
            selected_option = next((o for o in options if not o["is_correct"]), options[-1])
        
        # Submit the answer
        client.post(
            f"/tests/{attempt_id}/answer",
            headers=headers,
            json={
                "question_id": question_id,
                "selected_option_id": selected_option["id"]
            }
        )
    
    # Finish the test
    finish_response = client.post(
        f"/tests/{attempt_id}/finish",
        headers=headers
    )
    
    assert finish_response.status_code == 200
    
    # Check that performance profiles were created
    profiles = db.query(UserPerformanceProfile).filter(
        UserPerformanceProfile.user_id == user.id,
        UserPerformanceProfile.test_attempt_id == attempt_id
    ).all()
    
    assert len(profiles) == 5  # One for each question
    
    # Check that overall summary exists
    # Wait a moment for background task to complete
    import time
    time.sleep(1)
    
    overall_summary = db.query(UserOverallSummary).filter(
        UserOverallSummary.user_id == user.id
    ).first()
    
    assert overall_summary is not None
    assert overall_summary.total_questions_attempted >= 5
