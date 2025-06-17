from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database.database import get_db
from ..database.models import (
    User, Question, TestAttempt, TestAnswer, 
    UserPerformanceProfile, UserOverallSummary, UserTopicSummary,
    Paper, Section, Subsection
)
from ..auth.auth import verify_token
from ..utils.error_handler import APIErrorHandler

# Configure logging
import logging
logger = logging.getLogger(__name__)

# Create limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/user-performance", tags=["user-performance"])

class ProfileResponse(BaseModel):
    profile_id: int
    paper_id: Optional[int] = None
    section_id: Optional[int] = None
    subsection_id: Optional[int] = None
    paper_name: Optional[str] = None
    section_name: Optional[str] = None
    subsection_name: Optional[str] = None
    correct_easy_count: int
    incorrect_easy_count: int
    correct_medium_count: int
    incorrect_medium_count: int  
    correct_hard_count: int
    incorrect_hard_count: int
    total_questions_attempted: int
    total_time_spent_seconds: int
    accuracy_easy: float = 0.0
    accuracy_medium: float = 0.0
    accuracy_hard: float = 0.0
    accuracy_overall: float = 0.0
    last_updated: datetime
    
    class Config:
        from_attributes = True

class OverallSummaryResponse(BaseModel):
    total_tests_completed: int
    total_questions_answered: int
    overall_accuracy_percentage: float
    avg_score_completed_tests: float
    avg_time_per_question_overall: float
    last_updated: datetime
    
    class Config:
        from_attributes = True

class TopicSummaryResponse(BaseModel):
    summary_id: int
    paper_id: Optional[int] = None
    section_id: Optional[int] = None
    subsection_id: Optional[int] = None
    paper_name: Optional[str] = None
    section_name: Optional[str] = None
    subsection_name: Optional[str] = None
    total_questions_answered_in_topic: int
    accuracy_easy_topic: float
    accuracy_medium_topic: float
    accuracy_hard_topic: float  
    avg_time_per_question_topic: float
    last_updated: datetime
    
    class Config:
        from_attributes = True

class PerformanceDashboardResponse(BaseModel):
    overall_summary: OverallSummaryResponse
    topic_summaries: List[TopicSummaryResponse] = []
    
    class Config:
        from_attributes = True

@router.get("/dashboard", response_model=PerformanceDashboardResponse)
@limiter.limit("30/minute")
async def get_performance_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """Get the user's performance dashboard including overall summary and topic summaries"""
    try:
        # Get overall summary
        overall_summary = db.query(UserOverallSummary).filter(
            UserOverallSummary.user_id == current_user.user_id
        ).first()
        
        if not overall_summary:
            # Create a new empty summary if none exists
            overall_summary = UserOverallSummary(
                user_id=current_user.user_id
            )
            db.add(overall_summary)
            db.commit()
            db.refresh(overall_summary)
        
        # Get topic summaries with paper/section/subsection names
        topic_summaries_query = db.query(
            UserTopicSummary,
            Paper.paper_name,
            Section.section_name,
            Subsection.subsection_name
        ).outerjoin(
            Paper, UserTopicSummary.paper_id == Paper.paper_id
        ).outerjoin(
            Section, UserTopicSummary.section_id == Section.section_id
        ).outerjoin(
            Subsection, UserTopicSummary.subsection_id == Subsection.subsection_id
        ).filter(
            UserTopicSummary.user_id == current_user.user_id
        ).all()
        
        # Format topic summaries with names
        topic_summaries = []
        for summary, paper_name, section_name, subsection_name in topic_summaries_query:
            topic_summary = {
                "summary_id": summary.summary_id,
                "paper_id": summary.paper_id,
                "section_id": summary.section_id,
                "subsection_id": summary.subsection_id,
                "paper_name": paper_name,
                "section_name": section_name,
                "subsection_name": subsection_name,
                "total_questions_answered_in_topic": summary.total_questions_answered_in_topic,
                "accuracy_easy_topic": summary.accuracy_easy_topic,
                "accuracy_medium_topic": summary.accuracy_medium_topic,
                "accuracy_hard_topic": summary.accuracy_hard_topic,
                "avg_time_per_question_topic": summary.avg_time_per_question_topic,
                "last_updated": summary.last_updated
            }
            topic_summaries.append(topic_summary)
        
        return {
            "overall_summary": overall_summary,
            "topic_summaries": topic_summaries
        }
    
    except Exception as e:
        logger.error(f"Error getting performance dashboard: {str(e)}")
        raise APIErrorHandler.handle_db_error(e, "retrieving performance dashboard")

@router.get("/profiles", response_model=List[ProfileResponse])
@limiter.limit("30/minute")
async def get_user_performance_profiles(
    request: Request,
    paper_id: Optional[int] = None,
    section_id: Optional[int] = None,
    subsection_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """Get the user's performance profiles with optional filtering by paper, section, or subsection"""
    try:
        # Base query for performance profiles with related entity names
        query = db.query(
            UserPerformanceProfile,
            Paper.paper_name,
            Section.section_name,
            Subsection.subsection_name
        ).outerjoin(
            Paper, UserPerformanceProfile.paper_id == Paper.paper_id
        ).outerjoin(
            Section, UserPerformanceProfile.section_id == Section.section_id
        ).outerjoin(
            Subsection, UserPerformanceProfile.subsection_id == Subsection.subsection_id
        ).filter(
            UserPerformanceProfile.user_id == current_user.user_id
        )
        
        # Apply filters if provided
        if paper_id is not None:
            query = query.filter(UserPerformanceProfile.paper_id == paper_id)
        
        if section_id is not None:
            query = query.filter(UserPerformanceProfile.section_id == section_id)
            
        if subsection_id is not None:
            query = query.filter(UserPerformanceProfile.subsection_id == subsection_id)
        
        # Execute query
        results = query.all()
        
        # Format results with calculated accuracy values
        profiles = []
        for profile, paper_name, section_name, subsection_name in results:
            # Calculate accuracy percentages
            accuracy_easy = 0.0
            if (profile.correct_easy_count + profile.incorrect_easy_count) > 0:
                accuracy_easy = profile.correct_easy_count / (profile.correct_easy_count + profile.incorrect_easy_count) * 100
                
            accuracy_medium = 0.0
            if (profile.correct_medium_count + profile.incorrect_medium_count) > 0:
                accuracy_medium = profile.correct_medium_count / (profile.correct_medium_count + profile.incorrect_medium_count) * 100
            
            accuracy_hard = 0.0
            if (profile.correct_hard_count + profile.incorrect_hard_count) > 0:
                accuracy_hard = profile.correct_hard_count / (profile.correct_hard_count + profile.incorrect_hard_count) * 100
                
            # Calculate overall accuracy
            total_correct = profile.correct_easy_count + profile.correct_medium_count + profile.correct_hard_count
            accuracy_overall = 0.0
            if profile.total_questions_attempted > 0:
                accuracy_overall = (total_correct / profile.total_questions_attempted) * 100
            
            profile_data = {
                "profile_id": profile.profile_id,
                "paper_id": profile.paper_id,
                "section_id": profile.section_id,
                "subsection_id": profile.subsection_id,
                "paper_name": paper_name,
                "section_name": section_name,
                "subsection_name": subsection_name,
                "correct_easy_count": profile.correct_easy_count,
                "incorrect_easy_count": profile.incorrect_easy_count,
                "correct_medium_count": profile.correct_medium_count,
                "incorrect_medium_count": profile.incorrect_medium_count,
                "correct_hard_count": profile.correct_hard_count,
                "incorrect_hard_count": profile.incorrect_hard_count,
                "total_questions_attempted": profile.total_questions_attempted,
                "total_time_spent_seconds": profile.total_time_spent_seconds,
                "accuracy_easy": round(accuracy_easy, 1),
                "accuracy_medium": round(accuracy_medium, 1),
                "accuracy_hard": round(accuracy_hard, 1),
                "accuracy_overall": round(accuracy_overall, 1),
                "last_updated": profile.last_updated
            }
            profiles.append(profile_data)
        
        return profiles
    
    except Exception as e:
        logger.error(f"Error retrieving performance profiles: {str(e)}")
        raise APIErrorHandler.handle_db_error(e, "retrieving performance profiles")
