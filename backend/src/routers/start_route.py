from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
import random
import logging
from datetime import datetime, date
import traceback

from ..database.database import get_db
from ..database.models import (
    TestTemplate, TestTemplateSection, TestAttempt, TestAnswer,
    Question, User, Paper, Section
)
from ..auth.auth import verify_token

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tests", tags=["tests"])

@router.post("/start")
async def start_test(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Start a new test based on a template. This handles both regular and adaptive tests.
    """
    try:
        # Parse request body
        body = await request.json()
        
        # Extract required fields
        template_id = body.get("test_template_id")
        duration_minutes = body.get("duration_minutes", 60)
        
        # Extract optional adaptive test parameters
        is_adaptive = body.get("is_adaptive", False)
        adaptive_strategy = body.get("adaptive_strategy")
        max_questions = body.get("max_questions")
        
        logger.info(f"Starting test with template_id={template_id}, duration={duration_minutes}, " +
                   f"is_adaptive={is_adaptive}, strategy={adaptive_strategy}, max_questions={max_questions}")
        
        # Validate required fields
        if not template_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="test_template_id is required"
            )
        
        # Get the template
        template = db.query(TestTemplate).filter(
            TestTemplate.template_id == template_id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Test template with ID {template_id} not found"
            )
        
        # Get template sections
        sections = db.query(TestTemplateSection).filter(
            TestTemplateSection.template_id == template_id
        ).all()
        
        if not sections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Test template has no sections"
            )
        
        # Collect questions for this test
        questions = []
        logger.debug(f"Finding questions for {len(sections)} sections")
        
        for section in sections:
            # Query for valid questions
            query = db.query(Question).filter(
                Question.paper_id == section.paper_id,
                Question.valid_until >= date.today()
            )
            
            # Filter by section if provided
            if section.section_id_ref:
                query = query.filter(Question.section_id == section.section_id_ref)
                
            # Filter by subsection if provided
            if section.subsection_id:
                query = query.filter(Question.subsection_id == section.subsection_id)
            
            # Get question count
            available_count = query.count()
            logger.debug(f"Found {available_count} available questions for section {section.section_id_ref}")
            
            # Apply random order and limit
            section_questions = query.order_by(func.random()).limit(section.question_count).all()
            
            # If we couldn't get enough questions, log a warning
            if len(section_questions) < section.question_count:
                logger.warning(f"Could only find {len(section_questions)} of {section.question_count} " +
                              f"requested questions for section {section.section_id_ref}")
                
            questions.extend(section_questions)
        
        # Create test attempt
        db_attempt = TestAttempt(
            test_template_id=template_id,
            user_id=current_user.user_id,
            start_time=datetime.now(),
            duration_minutes=duration_minutes,
            status="InProgress",
            test_type=template.test_type,
            total_allotted_duration_minutes=duration_minutes
        )
        
        # Handle adaptive test fields if present
        if is_adaptive:
            db_attempt.is_adaptive = True
            
            # Set max_questions if provided AND the column exists in the database
            try:
                if max_questions is not None and max_questions > 0:
                    logger.info(f"Setting max_questions to {max_questions}")
                    db_attempt.max_questions = max_questions
            except Exception as e:
                # If setting max_questions fails, log it but continue - the column might not exist
                logger.warning(f"Could not set max_questions: {e}. The column might not exist.")
            
            # Choose adaptive strategy
            if adaptive_strategy:
                db_attempt.adaptive_strategy_chosen = adaptive_strategy
            else:
                # Default to random strategy
                db_attempt.adaptive_strategy_chosen = random.choice(['hard_to_easy', 'easy_to_hard'])
                
            logger.info(f"Using adaptive strategy: {db_attempt.adaptive_strategy_chosen}")
        
        # Save attempt to get ID
        db.add(db_attempt)
        db.flush()
        
        # Create answer entries for all questions
        answers = [
            TestAnswer(
                attempt_id=db_attempt.attempt_id,
                question_id=q.question_id,
                time_taken_seconds=0
            ) for q in questions
        ]
        
        db.bulk_save_objects(answers)
        db.commit()
        
        # Refresh to get all fields
        db.refresh(db_attempt)
        
        logger.info(f"Test attempt created: id={db_attempt.attempt_id}, " +
                  f"questions={len(questions)}, type={db_attempt.test_type}")
                  
        return db_attempt
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the full exception for debugging
        db.rollback()
        logger.error(f"Error starting test: {str(e)}")
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred when starting the test."
        )
