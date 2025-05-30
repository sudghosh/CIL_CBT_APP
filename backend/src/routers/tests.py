from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field, validator
from datetime import datetime
import random
import logging
from sqlalchemy.exc import IntegrityError

from ..database.database import get_db
from ..database.models import ( 
    TestTemplate, TestTemplateSection, TestAttempt, TestAnswer,
    Question, QuestionOption, User
)
from ..auth.auth import verify_token, verify_admin
from ..utils.error_handler import APIErrorHandler
from ..validation.test_validators import ExamAttemptValidation as TestAttemptValidation, AnswerValidation

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tests", tags=["tests"])

TestStatusEnum = Literal["InProgress", "Completed", "Abandoned"]
TestTypeEnum = Literal["Mock", "Practice", "Regular"]

class TestAnswerDetail(BaseModel):
    question_id: int
    question_text: str
    options: List[str]
    selected_option_index: Optional[int]
    correct_option_index: Optional[int]
    marks: Optional[float]
    time_taken_seconds: int

    class Config:
        from_attributes = True

class TestAnswerResponse(BaseModel):
    attempt_id: int
    test_type: TestTypeEnum
    status: TestStatusEnum
    start_time: datetime
    end_time: Optional[datetime]
    score: Optional[float]
    weighted_score: Optional[float]
    answers: List[TestAnswerDetail]

    class Config:
        from_attributes = True

class TestTemplateBase(BaseModel):
    template_name: str = Field(..., min_length=3, max_length=100)
    test_type: TestTypeEnum

class TestTemplateSectionBase(BaseModel):
    paper_id: int = Field(..., gt=0)
    section_id: Optional[int] = Field(None, gt=0)
    subsection_id: Optional[int] = Field(None, gt=0)
    question_count: int = Field(..., gt=0, le=100)

class TestTemplateResponse(TestTemplateBase):
    template_id: int
    created_by_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TestAnswerSubmit(BaseModel):
    question_id: int = Field(..., gt=0)
    selected_option_index: Optional[int] = Field(None, ge=0, lt=4)
    time_taken_seconds: int = Field(..., ge=0, le=3600)  # Max 1 hour per question
    is_marked_for_review: bool = False

    @validator('time_taken_seconds')
    def validate_time_taken(cls, v):
        if v < 0:
            raise ValueError('Time taken cannot be negative')
        if v > 3600:
            raise ValueError('Time taken cannot exceed 1 hour per question')
        return v

class TestAttemptBase(BaseModel):
    test_template_id: int = Field(..., gt=0)
    duration_minutes: int = Field(..., gt=0, le=360)  # Max 6 hours

class TestAttemptResponse(BaseModel):
    attempt_id: int
    test_type: TestTypeEnum
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: Optional[int]
    total_allotted_duration_minutes: int = Field(..., gt=0, le=360)  # Max 6 hours
    status: TestStatusEnum
    score: Optional[float] = Field(None, ge=0, le=100)
    weighted_score: Optional[float] = Field(None, ge=0, le=100)

    class Config:
        from_attributes = True

    @validator('score', 'weighted_score')
    def validate_score(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Score must be between 0 and 100')
        return v

@router.post("/templates", response_model=TestTemplateResponse)
async def create_test_template(
    template: TestTemplateBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        db_template = TestTemplate(
            template_name=template.template_name,
            test_type=template.test_type,
            created_by_user_id=current_user.user_id
        )
        db.add(db_template)
        db.flush() # Use flush to get the template_id before committing

        for section in template.sections:
            db_section = TestTemplateSection(
                template_id=db_template.template_id,
                paper_id=section.paper_id,
                section_id=section.section_id,
                subsection_id=section.subsection_id,
                question_count=section.question_count
            )
            db.add(db_section)
        
        db.commit()
        db.refresh(db_template)
        return db_template
    
    except Exception as e:
        db.rollback()
        print(f"Error creating test template: {e}") # Basic logging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create test template")

@router.post("/start", response_model=TestAttemptResponse)
async def start_test(
    attempt: TestAttemptBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Get template with sections in a single query
        template = db.query(TestTemplate).options(
            joinedload(TestTemplate.sections)
        ).filter(
            TestTemplate.template_id == attempt.test_template_id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test template not found"
            )

        # Get required number of questions efficiently using subquery
        questions = []
        for section in template.sections:
            section_questions = db.query(Question).filter(
                Question.paper_id == section.paper_id,
                Question.section_id == section.section_id,
                Question.subsection_id == section.subsection_id,
                Question.is_active == True
            ).order_by(
                func.random()
            ).limit(section.question_count).all()

            questions.extend(section_questions)

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not enough active questions available for the test"
            )

        # Create test attempt with transaction
        db_attempt = TestAttempt(
            test_template_id=template.template_id,
            user_id=current_user.user_id,
            duration_minutes=attempt.duration_minutes,
            status="InProgress",
            start_time=datetime.utcnow()
        )
        db.add(db_attempt)
        db.flush()

        # Add all answers in bulk
        answers = [
            TestAnswer(
                attempt_id=db_attempt.attempt_id,
                question_id=q.question_id,
                time_taken_seconds=0
            ) for q in questions
        ]
        db.bulk_save_objects(answers)
        db.commit()

        return db_attempt
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error starting test: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error starting test"
        )

@router.post("/submit/{attempt_id}/answer")
async def submit_answer(
    attempt_id: int,
    answer: TestAnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Get test attempt and verify ownership
        attempt = db.query(TestAttempt).filter(
            TestAttempt.attempt_id == attempt_id,
            TestAttempt.user_id == current_user.user_id
        ).first()
        
        if not attempt:
            raise APIErrorHandler.handle_not_found("Test attempt", attempt_id)
        
        if attempt.status != "InProgress":
            raise APIErrorHandler.handle_validation_error("Test is not in progress")

        # Update or create answer
        test_answer = db.query(TestAnswer).filter(
            TestAnswer.attempt_id == attempt_id,
            TestAnswer.question_id == answer.question_id
        ).first()
        
        if not test_answer:
            raise APIErrorHandler.handle_validation_error("Question not part of this test")

        question = db.query(Question).filter(Question.question_id == answer.question_id).first()
        
        if answer.selected_option_index is not None:
            # Validate option index
            AnswerValidation.validate_answer_option(answer.selected_option_index)
            test_answer.is_correct = (answer.selected_option_index == question.correct_option_index)
        
        # Validate time taken
        test_answer.time_taken_seconds = TestAttemptValidation.validate_time_taken(
            answer.time_taken_seconds
        )
        test_answer.selected_option_index = answer.selected_option_index
        test_answer.is_marked_for_review = answer.is_marked_for_review
        
        db.commit()
        logger.info(f"Answer submitted for question {answer.question_id} in attempt {attempt_id}")
        return {"status": "success"}

    except HTTPException as he:
        raise he
    except ValueError as ve:
        raise APIErrorHandler.handle_validation_error(str(ve))
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting answer: {str(e)}")
        raise APIErrorHandler.handle_db_error(e, "submitting answer")
@router.post("/finish/{attempt_id}")
async def finish_test(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        attempt = db.query(TestAttempt).filter(
            TestAttempt.attempt_id == attempt_id,
            TestAttempt.user_id == current_user.user_id
        ).first()
        
        if not attempt:
            raise APIErrorHandler.handle_not_found("Test attempt", attempt_id)
        
        if attempt.status != "InProgress":
            raise APIErrorHandler.handle_validation_error("Test is not in progress")

        # Calculate scores
        answers = db.query(TestAnswer).filter(TestAnswer.attempt_id == attempt_id).all()
        correct_count = sum(1 for a in answers if a.is_correct)
        total_questions = len(answers)
        
        if total_questions == 0:
            raise APIErrorHandler.handle_validation_error("No answers found for this test attempt")

        # Calculate weighted score (with negative marking of 0.25)
        incorrect_count = sum(1 for a in answers if a.is_correct is False)
        weighted_score = correct_count - (incorrect_count * 0.25)

        raw_score = (correct_count / total_questions) * 100
        weighted_score_percentage = (weighted_score / total_questions) * 100

        # Validate scores
        TestAttemptValidation.validate_attempt_scores(raw_score, weighted_score_percentage)

        # Update attempt
        attempt.status = TestAttemptValidation.validate_attempt_status("Completed")
        attempt.end_time = datetime.utcnow()
        attempt.score = raw_score
        attempt.weighted_score = weighted_score_percentage
        attempt.duration_minutes = int((attempt.end_time - attempt.start_time).total_seconds() / 60)
        
        db.commit()
        db.refresh(attempt)
        
        logger.info(f"Test attempt {attempt_id} completed successfully by user {current_user.user_id}")
        return attempt

    except HTTPException as he:
        # Pass through HTTP exceptions
        raise he
    except ValueError as ve:
        # Handle validation errors
        raise APIErrorHandler.handle_validation_error(str(ve))
    except Exception as e:
        # Handle unexpected errors
        db.rollback()
        logger.error(f"Error finishing test attempt {attempt_id}: {str(e)}")
        raise APIErrorHandler.handle_db_error(e, "finishing test")

@router.get("/templates", response_model=List[TestTemplateResponse])
async def get_test_templates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    templates = db.query(TestTemplate).offset(skip).limit(limit).all()
    return templates

@router.get("/attempts", response_model=List[TestAttemptResponse])
async def get_test_attempts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    attempts = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.user_id
    ).offset(skip).limit(limit).all()
    return attempts

@router.get("/questions/{attempt_id}")
async def get_test_questions(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Verify test attempt belongs to user
        attempt = db.query(TestAttempt).filter(
            TestAttempt.attempt_id == attempt_id,
            TestAttempt.user_id == current_user.user_id
        ).first()
        
        if not attempt:
            raise APIErrorHandler.handle_not_found("Test attempt", attempt_id)

        # Use joinedload to fetch questions and their options efficiently
        answers_with_questions = db.query(TestAnswer).filter(
            TestAnswer.attempt_id == attempt_id
        ).options(
            joinedload(TestAnswer.question).joinedload(Question.options)
        ).all()

        questions = []
        for answer in answers_with_questions:
            question = answer.question
            if question:
                questions.append({
                    "question_id": question.question_id,
                    "question_text": question.question_text,
                    "options": [
                        {
                            "option_id": option.option_id,
                            "option_text": option.option_text,
                            "option_order": option.option_order
                        }
                        for option in question.options
                    ]
                })

        logger.info(f"Retrieved {len(questions)} questions for attempt {attempt_id}")
        return questions

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving questions for attempt {attempt_id}: {str(e)}")
        raise APIErrorHandler.handle_db_error(e, "retrieving test questions")
async def get_test_with_answers(
    attempt_id: int,
    db: Session,
    current_user: User = Depends(verify_token)
):
    # Get test attempt with eager loading of relationships
    attempt = db.query(TestAttempt).options(
        joinedload(TestAttempt.answers).joinedload(TestAnswer.question).joinedload(Question.options)
    ).filter(
        TestAttempt.attempt_id == attempt_id,
        TestAttempt.user_id == current_user.user_id
    ).first()

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test attempt not found"
        )
    return attempt

@router.get("/attempts/{attempt_id}/details", response_model=TestAnswerResponse)
async def get_attempt_details(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        attempt = await get_test_with_answers(attempt_id, db, current_user)
        
        answers = []
        for answer in attempt.answers:
            answers.append({
                "question_id": answer.question.question_id,
                "question_text": answer.question.question_text,
                "options": [opt.option_text for opt in answer.question.options],
                "selected_option_index": answer.selected_option_index,
                "correct_option_index": answer.question.correct_option_index,
                "marks": answer.marks,
                "time_taken_seconds": answer.time_taken_seconds
            })

        return {
            "attempt_id": attempt.attempt_id,
            "test_type": attempt.test_template.test_type,
            "status": attempt.status,
            "start_time": attempt.start_time,
            "end_time": attempt.end_time,
            "score": attempt.score,
            "weighted_score": attempt.weighted_score,
            "answers": answers
        }
    except Exception as e:
        logger.error(f"Error getting attempt details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving test attempt details"
        )
