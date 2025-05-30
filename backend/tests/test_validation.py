import pytest
from backend.src.validation.test_validators import (
    QuestionOptionResponse,
    ExamQuestionResponse as TestQuestionResponse,
    ExamAttemptBase as TestAttemptBase,
    ExamAnswerBase as TestAnswerBase,
    AnswerValidation,
    ExamAttemptValidation as TestAttemptValidation,
)

def test_question_option_response_validation():
    # Test valid option
    valid_option = {
        "option_id": 1,
        "option_text": "Valid option text",
        "option_order": 0
    }
    option = QuestionOptionResponse(**valid_option)
    assert option.option_id == 1
    assert option.option_text == "Valid option text"
    assert option.option_order == 0

    # Test invalid option
    with pytest.raises(ValueError):
        QuestionOptionResponse(
            option_id=0,  # Should be > 0
            option_text="",  # Should not be empty
            option_order=4  # Should be < 4
        )

def test_test_question_response_validation():
    valid_options = [
        QuestionOptionResponse(option_id=1, option_text="Option 1", option_order=0),
        QuestionOptionResponse(option_id=2, option_text="Option 2", option_order=1),
    ]
    
    # Test valid question
    valid_question = {
        "question_id": 1,
        "question_text": "Valid question text that is long enough",
        "options": valid_options,
        "selected_option_index": 0,
        "correct_option_index": 1,
        "is_correct": False,
        "explanation": "Test explanation"
    }
    question = TestQuestionResponse(**valid_question)
    assert question.question_id == 1
    assert len(question.options) == 2

    # Test invalid question
    with pytest.raises(ValueError):
        TestQuestionResponse(
            question_id=0,  # Should be > 0
            question_text="Too short",  # Should be longer
            options=[],  # Should have at least 2 options
            selected_option_index=None,
            correct_option_index=None
        )

def test_test_attempt_base_validation():
    # Test valid attempt
    valid_attempt = {
        "status": "InProgress",
        "score": 75.5,
        "weighted_score": 80.0,
        "time_taken_seconds": 1800
    }
    attempt = TestAttemptBase(**valid_attempt)
    assert attempt.status == "InProgress"
    assert attempt.score == 75.5

    # Test invalid attempt
    with pytest.raises(ValueError):
        TestAttemptBase(
            status="Invalid",  # Invalid status
            score=101,  # Score > 100
            time_taken_seconds=-1  # Negative time
        )

def test_test_answer_base_validation():
    # Test valid answer
    valid_answer = {
        "question_id": 1,
        "selected_option_index": 2,
        "time_taken_seconds": 60,
        "is_marked_for_review": True
    }
    answer = TestAnswerBase(**valid_answer)
    assert answer.question_id == 1
    assert answer.selected_option_index == 2

    # Test invalid answer
    with pytest.raises(ValueError):
        TestAnswerBase(
            question_id=0,  # Should be > 0
            selected_option_index=4,  # Should be < 4
            time_taken_seconds=3601  # Exceeds max time
        )

def test_deprecated_validation_methods():
    # Test TestAttemptValidation
    assert TestAttemptValidation.validate_attempt_status("InProgress") == "InProgress"
    with pytest.raises(ValueError):
        TestAttemptValidation.validate_attempt_status("Invalid")

    # Test score validation
    score, weighted = TestAttemptValidation.validate_attempt_scores(75.5, 80.0)
    assert score == 75.5
    assert weighted == 80.0
    with pytest.raises(ValueError):
        TestAttemptValidation.validate_attempt_scores(101, 50)

    # Test time validation
    assert TestAttemptValidation.validate_time_taken(1800) == 1800
    with pytest.raises(ValueError):
        TestAttemptValidation.validate_time_taken(-1)

    # Test AnswerValidation
    assert AnswerValidation.validate_answer_option(2) == 2
    with pytest.raises(ValueError):
        AnswerValidation.validate_answer_option(4)