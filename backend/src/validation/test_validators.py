from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

class QuestionOptionResponse(BaseModel):
    option_id: int = Field(gt=0)
    option_text: str = Field(min_length=1, max_length=500)
    option_order: int = Field(ge=0, lt=4)

class ExamQuestionResponse(BaseModel):
    question_id: int = Field(gt=0)
    question_text: str = Field(min_length=10, max_length=2000)
    options: List[QuestionOptionResponse] = Field(min_length=2, max_length=4)
    selected_option_index: Optional[int] = None
    correct_option_index: Optional[int] = None
    is_correct: Optional[bool] = None
    explanation: Optional[str] = Field(None, max_length=1000)

    @field_validator('selected_option_index', 'correct_option_index')
    @classmethod
    def validate_option_indices(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            return AnswerValidation.validate_answer_option(v)
        return v

class ExamAttemptBase(BaseModel):
    status: str = Field(..., description="Test attempt status")
    score: Optional[float] = Field(None, ge=0, le=100)
    weighted_score: Optional[float] = Field(None, ge=0, le=100)
    time_taken_seconds: Optional[int] = Field(None, ge=0, le=3600)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = {"InProgress", "Completed", "Abandoned"}
        if v not in valid_statuses:
            raise ValueError(f"Invalid test status. Must be one of: {', '.join(valid_statuses)}")
        return v

class ExamAttemptValidation:
    """Deprecated: Use TestAttemptBase model instead"""
    @staticmethod
    def validate_attempt_status(status: str, valid_statuses={"InProgress", "Completed", "Abandoned"}):
        if status not in valid_statuses:
            raise ValueError(f"Invalid test status. Must be one of: {', '.join(valid_statuses)}")
        return status
    
    @staticmethod
    def validate_attempt_scores(score: Optional[float] = None, weighted_score: Optional[float] = None):
        if score is not None and (score < 0 or score > 100):
            raise ValueError("Score must be between 0 and 100")
        if weighted_score is not None and (weighted_score < 0 or weighted_score > 100):
            raise ValueError("Weighted score must be between 0 and 100")
        return score, weighted_score
    
    @staticmethod
    def validate_time_taken(time_taken_seconds: int, max_time: int = 3600):
        if time_taken_seconds < 0:
            raise ValueError("Time taken cannot be negative")
        if time_taken_seconds > max_time:
            raise ValueError(f"Time taken cannot exceed {max_time} seconds")
        return time_taken_seconds

class ExamAnswerBase(BaseModel):
    question_id: int = Field(gt=0)
    selected_option_index: Optional[int] = Field(None, ge=0, lt=4)
    time_taken_seconds: int = Field(..., ge=0, le=3600)
    is_marked_for_review: bool = Field(default=False)

class AnswerValidation:
    """Deprecated: Use TestAnswerBase model instead"""
    @staticmethod
    def validate_answer_option(option_index: Optional[int], max_options: int = 4) -> Optional[int]:
        if option_index is not None:
            if not isinstance(option_index, int):
                raise ValueError("Option index must be an integer")
            if option_index < 0 or option_index >= max_options:
                raise ValueError(f"Option index must be between 0 and {max_options-1}")
        return option_index
