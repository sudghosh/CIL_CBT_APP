"""
User Calibration Endpoints

This module provides endpoints for managing and checking the calibration status
of users for adaptive tests.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Dict, List, Any, Optional
import logging

from ..database.database import get_db
from ..database.models import (
    User, UserQuestionDifficulty, Question
)
from ..auth.auth import verify_token
from ..utils.error_handler import APIErrorHandler

router = APIRouter(
    prefix="/calibration",
    tags=["calibration"],
    dependencies=[Depends(APIErrorHandler)],
)

logger = logging.getLogger(__name__)

@router.get("/status")
async def get_calibration_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Get the calibration status for a user.
    
    Returns information about:
    - Total questions attempted
    - Number of calibrated questions
    - Number of questions still in calibration
    - Calibration progress percentage
    - Overall calibration status
    """
    
    try:
        # Count total user-question pairs
        total_user_questions = db.query(func.count(UserQuestionDifficulty.id)).filter(
            UserQuestionDifficulty.user_id == current_user.user_id
        ).scalar() or 0
        
        # Count calibrated user-question pairs
        calibrated_questions = db.query(func.count(UserQuestionDifficulty.id)).filter(
            UserQuestionDifficulty.user_id == current_user.user_id,
            UserQuestionDifficulty.is_calibrating == False
        ).scalar() or 0
        
        # Count questions still in calibration
        calibrating_questions = total_user_questions - calibrated_questions
        
        # Calculate calibration progress
        calibration_progress = (calibrated_questions / total_user_questions * 100) if total_user_questions > 0 else 0
        
        # Determine overall status
        # Reduced threshold: 8+ total questions and 3+ calibrated questions (more practical)
        is_calibrated = total_user_questions >= 8 and calibrated_questions >= 3
        calibration_status = "calibrated" if is_calibrated else "calibrating"
        
        return {
            "total_questions_attempted": total_user_questions,
            "calibrated_questions": calibrated_questions,
            "calibrating_questions": calibrating_questions,
            "calibration_progress_percentage": round(calibration_progress, 2),
            "calibration_status": calibration_status,
            "is_calibrated": is_calibrated
        }
    except Exception as e:
        logger.error(f"Error getting calibration status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting calibration status: {str(e)}"
        )

@router.get("/details")
async def get_calibration_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Get detailed information about a user's calibration status,
    including a breakdown of performance by difficulty level.
    """
    
    try:
        # Get all user questions
        user_questions = db.query(UserQuestionDifficulty).filter(
            UserQuestionDifficulty.user_id == current_user.user_id
        ).all()
        
        # Sort by difficulty level
        easy_questions = [q for q in user_questions if q.difficulty_level == "Easy"]
        medium_questions = [q for q in user_questions if q.difficulty_level == "Medium"]
        hard_questions = [q for q in user_questions if q.difficulty_level == "Hard"]
        
        # Calculate performance metrics for each difficulty level
        def calculate_metrics(questions):
            total = len(questions)
            if total == 0:
                return {
                    "total": 0,
                    "calibrated": 0,
                    "accuracy": 0,
                    "avg_time_seconds": 0,
                    "calibration_progress": 0
                }
            
            calibrated = sum(1 for q in questions if not q.is_calibrating)
            accuracy = sum(q.correct_answers / q.attempts if q.attempts > 0 else 0 for q in questions) / total
            avg_time = sum(q.avg_time_seconds for q in questions if q.avg_time_seconds is not None) / total
            calibration_progress = (calibrated / total * 100) if total > 0 else 0
            
            return {
                "total": total,
                "calibrated": calibrated,
                "accuracy": round(accuracy * 100, 2),
                "avg_time_seconds": round(avg_time, 2),
                "calibration_progress": round(calibration_progress, 2)
            }
        
        # Get the most recently attempted questions for context
        recent_questions = db.query(UserQuestionDifficulty).filter(
            UserQuestionDifficulty.user_id == current_user.user_id
        ).order_by(desc(UserQuestionDifficulty.last_attempted_at)).limit(5).all()
        
        recent_question_info = []
        for uq in recent_questions:
            question = db.query(Question).filter(Question.question_id == uq.question_id).first()
            if question:
                recent_question_info.append({
                    "question_id": uq.question_id,
                    "difficulty_level": uq.difficulty_level,
                    "is_calibrating": uq.is_calibrating,
                    "attempts": uq.attempts,
                    "correct_answers": uq.correct_answers,
                    "accuracy": round((uq.correct_answers / uq.attempts * 100) if uq.attempts > 0 else 0, 2),
                    "last_attempted_at": uq.last_attempted_at
                })
        
        return {
            "overall_metrics": calculate_metrics(user_questions),
            "difficulty_metrics": {
                "easy": calculate_metrics(easy_questions),
                "medium": calculate_metrics(medium_questions),
                "hard": calculate_metrics(hard_questions)
            },
            "recent_questions": recent_question_info,
            "is_calibrated": len(user_questions) >= 8 and sum(1 for q in user_questions if not q.is_calibrating) >= 3
        }
    except Exception as e:
        logger.error(f"Error getting calibration details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting calibration details: {str(e)}"
        )

@router.post("/reset")
async def reset_calibration(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Reset a user's calibration status for all questions.
    This will mark all questions as calibrating again.
    """
    
    try:
        # Update all user's question difficulties to reset calibration
        db.query(UserQuestionDifficulty).filter(
            UserQuestionDifficulty.user_id == current_user.user_id
        ).update({
            "is_calibrating": True,
            "confidence": 0.1  # Reset confidence to initial value
        })
        
        db.commit()
        
        return {
            "message": "Calibration has been reset successfully",
            "reset_questions_count": db.query(UserQuestionDifficulty).filter(
                UserQuestionDifficulty.user_id == current_user.user_id,
                UserQuestionDifficulty.is_calibrating == True
            ).count()
        }
    except Exception as e:
        logger.error(f"Error resetting calibration: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting calibration: {str(e)}"
        )
