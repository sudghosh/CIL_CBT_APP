"""
User Question Difficulty Model

This module defines the UserQuestionDifficulty model which stores personalized
difficulty ratings for each user-question combination.
"""

from sqlalchemy import Column, Integer, Float, String, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func

from .database import Base


class UserQuestionDifficulty(Base):
    """
    Stores user-specific difficulty ratings for each question.
    
    This model allows for personalized adaptive testing by maintaining
    separate difficulty ratings for each user-question combination.
    """
    __tablename__ = "user_question_difficulties"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.question_id", ondelete="CASCADE"), nullable=False, index=True)
    
    # User-specific difficulty rating (0-10 scale, same as Question.numeric_difficulty)
    # 0-3: Easy, 4-6: Medium, 7-10: Hard
    numeric_difficulty = Column(Integer, nullable=False, default=5)
    
    # String representation of the difficulty (Easy, Medium, Hard)
    difficulty_level = Column(String, nullable=False, default="Medium")
    
    # Confidence score for this difficulty rating (0-1)
    # Higher confidence means more stable rating
    confidence = Column(Float, nullable=False, default=0.1)
    
    # Number of times the user has seen this question
    attempts = Column(Integer, nullable=False, default=0)
    
    # Number of correct answers for this question by this user
    correct_answers = Column(Integer, nullable=False, default=0)
    
    # Average time taken by the user for this question (in seconds)
    avg_time_seconds = Column(Float, nullable=False, default=0.0)
    
    # Flag indicating if the user is in calibration phase for this question
    is_calibrating = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_attempted_at = Column(DateTime(timezone=True), nullable=True)    # Relationships
    user = relationship("User", back_populates="question_difficulties")
    question = relationship("Question", back_populates="user_difficulties")
      # Ensure each user-question combination is unique
    __table_args__ = (
        UniqueConstraint('user_id', 'question_id', name='_user_question_difficulty_uc'),
    )
    
    @validates('numeric_difficulty')
    def validate_numeric_difficulty(self, key, value):
        """Validate that numeric difficulty is between 0 and 10."""
        if value < 0 or value > 10:
            raise ValueError("Numeric difficulty must be between 0 and 10")
        return value
        
    @validates('difficulty_level')
    def validate_difficulty_level(self, key, value):
        """Validate that difficulty level is one of the allowed values."""
        if value not in ('Easy', 'Medium', 'Hard'):
            raise ValueError("Invalid difficulty level")
        return value
        
    @validates('confidence')
    def validate_confidence(self, key, value):
        """Validate that confidence is between 0 and 1."""
        if value < 0 or value > 1:
            raise ValueError("Confidence must be between 0 and 1")
        return value
