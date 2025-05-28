from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database.database import get_db
from ..database.models import (
    TestTemplate, TestTemplateSection, TestAttempt, TestAnswer,
    Question, QuestionOption, User
)
from ..auth.auth import verify_token, verify_admin
from pydantic import BaseModel
import random
from datetime import datetime

router = APIRouter(prefix="/tests", tags=["tests"])

class TestTemplateSectionBase(BaseModel):
    paper_id: Optional[int] = None
    section_id: Optional[int] = None
    subsection_id: Optional[int] = None
    question_count: int

class TestTemplateBase(BaseModel):
    template_name: str
    test_type: str
    sections: List[TestTemplateSectionBase]

class TestTemplateResponse(TestTemplateBase):
    template_id: int
    created_by_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TestAnswerSubmit(BaseModel):
    question_id: int
    selected_option_index: Optional[int] = None
    time_taken_seconds: int
    is_marked_for_review: bool = False

class TestAttemptResponse(BaseModel):
    attempt_id: int
    test_type: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: Optional[int]
    total_allotted_duration_minutes: int
    status: str
    score: Optional[float]
    weighted_score: Optional[float]

    class Config:
        from_attributes = True

@router.post("/templates", response_model=TestTemplateResponse)
async def create_test_template(
    template: TestTemplateBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    db_template = TestTemplate(
        template_name=template.template_name,
        test_type=template.test_type,
        created_by_user_id=current_user.user_id
    )
    db.add(db_template)
    db.commit()

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

@router.post("/start", response_model=TestAttemptResponse)
async def start_test(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    template = db.query(TestTemplate).filter(TestTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check if user has an incomplete test
    incomplete_test = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.user_id,
        TestAttempt.status == "InProgress"
    ).first()
    if incomplete_test:
        raise HTTPException(
            status_code=400,
            detail="You have an incomplete test. Please finish or abandon it first."
        )

    # Create test attempt
    test_attempt = TestAttempt(
        user_id=current_user.user_id,
        test_type=template.test_type,
        test_template_id=template.template_id,
        status="InProgress",
        total_allotted_duration_minutes=180  # 3 hours for CIL tests
    )
    db.add(test_attempt)
    db.commit()

    # Select questions based on template sections
    for template_section in template.sections:
        query = db.query(Question).filter(Question.is_active == True)
        if template_section.paper_id:
            query = query.filter(Question.paper_id == template_section.paper_id)
        if template_section.section_id:
            query = query.filter(Question.section_id == template_section.section_id)
        if template_section.subsection_id:
            query = query.filter(Question.subsection_id == template_section.subsection_id)
        
        questions = query.all()
        selected_questions = random.sample(
            questions,
            min(template_section.question_count, len(questions))
        )

        # Create blank answers for selected questions
        for question in selected_questions:
            answer = TestAnswer(
                attempt_id=test_attempt.attempt_id,
                question_id=question.question_id
            )
            db.add(answer)
    
    db.commit()
    db.refresh(test_attempt)
    return test_attempt

@router.post("/submit/{attempt_id}/answer")
async def submit_answer(
    attempt_id: int,
    answer: TestAnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Get test attempt and verify ownership
    attempt = db.query(TestAttempt).filter(
        TestAttempt.attempt_id == attempt_id,
        TestAttempt.user_id == current_user.user_id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")
    
    if attempt.status != "InProgress":
        raise HTTPException(status_code=400, detail="Test is not in progress")

    # Update or create answer
    test_answer = db.query(TestAnswer).filter(
        TestAnswer.attempt_id == attempt_id,
        TestAnswer.question_id == answer.question_id
    ).first()
    
    if not test_answer:
        raise HTTPException(status_code=404, detail="Question not part of this test")

    question = db.query(Question).filter(Question.question_id == answer.question_id).first()
    
    test_answer.selected_option_index = answer.selected_option_index
    test_answer.time_taken_seconds = answer.time_taken_seconds
    test_answer.is_marked_for_review = answer.is_marked_for_review
    
    if answer.selected_option_index is not None:
        test_answer.is_correct = (answer.selected_option_index == question.correct_option_index)
    
    db.commit()
    return {"status": "success"}

@router.post("/finish/{attempt_id}")
async def finish_test(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.attempt_id == attempt_id,
        TestAttempt.user_id == current_user.user_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")
    
    if attempt.status != "InProgress":
        raise HTTPException(status_code=400, detail="Test is not in progress")

    # Calculate scores
    answers = db.query(TestAnswer).filter(TestAnswer.attempt_id == attempt_id).all()
    correct_count = sum(1 for a in answers if a.is_correct)
    total_questions = len(answers)
    
    # Calculate weighted score (with negative marking of 0.25)
    incorrect_count = sum(1 for a in answers if a.is_correct is False)
    weighted_score = correct_count - (incorrect_count * 0.25)

    # Update attempt
    attempt.status = "Completed"
    attempt.end_time = datetime.utcnow()
    attempt.score = (correct_count / total_questions) * 100
    attempt.weighted_score = (weighted_score / total_questions) * 100
    attempt.duration_minutes = int((attempt.end_time - attempt.start_time).total_seconds() / 60)
    
    db.commit()
    db.refresh(attempt)
    return attempt

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
    # Verify test attempt belongs to user
    attempt = db.query(TestAttempt).filter(
        TestAttempt.attempt_id == attempt_id,
        TestAttempt.user_id == current_user.user_id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")

    # Get answers (which link to questions) for this attempt
    answers = db.query(TestAnswer).filter(
        TestAnswer.attempt_id == attempt_id
    ).all()

    questions = []
    for answer in answers:
        question = db.query(Question).filter(
            Question.question_id == answer.question_id
        ).first()
        if question:
            # Get options for this question
            options = db.query(QuestionOption).filter(
                QuestionOption.question_id == question.question_id
            ).order_by(QuestionOption.option_order).all()
            
            # Convert to dict and remove sensitive data
            question_dict = {
                "question_id": question.question_id,
                "question_text": question.question_text,
                "options": [
                    {
                        "option_id": opt.option_id,
                        "option_text": opt.option_text,
                        "option_order": opt.option_order
                    }
                    for opt in options
                ]
            }
            questions.append(question_dict)

    return questions

@router.get("/attempts/{attempt_id}/details")
async def get_attempt_details(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Verify test attempt belongs to user
    attempt = db.query(TestAttempt).filter(
        TestAttempt.attempt_id == attempt_id,
        TestAttempt.user_id == current_user.user_id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")

    # Only allow viewing details of completed tests
    if attempt.status != "Completed":
        raise HTTPException(
            status_code=400,
            detail="Can only view details of completed tests"
        )

    # Get answers with questions for this attempt
    answers = db.query(TestAnswer).filter(
        TestAnswer.attempt_id == attempt_id
    ).all()

    questions = []
    for answer in answers:
        question = db.query(Question).filter(
            Question.question_id == answer.question_id
        ).first()
        if question:
            options = db.query(QuestionOption).filter(
                QuestionOption.question_id == question.question_id
            ).order_by(QuestionOption.option_order).all()
            
            questions.append({
                "question_id": question.question_id,
                "question_text": question.question_text,
                "selected_option_index": answer.selected_option_index,
                "correct_option_index": question.correct_option_index,
                "is_correct": answer.is_correct,
                "explanation": question.explanation,
                "options": [
                    {
                        "option_id": opt.option_id,
                        "option_text": opt.option_text,
                        "option_order": opt.option_order
                    }
                    for opt in options
                ]
            })

    return {"questions": questions}
