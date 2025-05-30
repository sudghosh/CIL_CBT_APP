from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field, validator
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import logging

from ..database.database import get_db
from ..database.models import Question, QuestionOption, User, Paper, Section, Subsection
from ..auth.auth import verify_token, verify_admin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/questions", tags=["questions"])

# Define valid question types and difficulty levels
QuestionTypeEnum = Literal["MCQ", "True/False"]
DifficultyLevelEnum = Literal["Easy", "Medium", "Hard"]

class QuestionOptionBase(BaseModel):
    option_text: str = Field(..., min_length=1, max_length=500)
    option_order: int = Field(..., ge=0, lt=4)
    
    @validator('option_text')
    def validate_option_text(cls, v):
        if not v.strip():
            raise ValueError('Option text cannot be empty or just whitespace')
        return v.strip()

class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=10, max_length=2000)
    question_type: str = Field(..., pattern='^(MCQ|True/False)$')
    correct_option_index: int = Field(..., ge=0, lt=4)
    explanation: Optional[str] = Field(None, max_length=1000)
    paper_id: int = Field(..., gt=0)
    section_id: int = Field(..., gt=0)
    subsection_id: Optional[int] = Field(None, gt=0)
    default_difficulty_level: str = Field("Easy", pattern='^(Easy|Medium|Hard)$')
    options: List[QuestionOptionBase] = Field(..., min_items=2, max_items=4)

    @validator('question_text')
    def validate_question_text(cls, v):
        if not v.strip():
            raise ValueError('Question text cannot be empty or just whitespace')
        return v.strip()

    @validator('options')
    def validate_options(cls, v):
        if len({opt.option_order for opt in v}) != len(v):
            raise ValueError('Option orders must be unique')
        return v

class QuestionResponse(QuestionBase):
    question_id: int
    community_difficulty_score: float = Field(ge=0.0, le=1.0)
    is_active: bool

    class Config:
        from_attributes = True

@limiter.limit("20/minute")
@router.post("/", response_model=QuestionResponse)
async def create_question(
    request: Request,
    question: QuestionBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Validate paper, section, subsection with a single query using joins
        query = db.query(Paper).filter(Paper.paper_id == question.paper_id)
        if question.section_id:
            query = query.join(Section).filter(
                Section.section_id == question.section_id
            )
        if question.subsection_id:
            query = query.join(Subsection).filter(
                Subsection.subsection_id == question.subsection_id
            )
        
        result = query.first()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid paper, section, or subsection combination"
            )

        # Create question with options in a transaction
        db_question = Question(
            question_text=question.question_text,
            question_type=question.question_type,
            correct_option_index=question.correct_option_index,
            explanation=question.explanation,
            paper_id=question.paper_id,
            section_id=question.section_id,
            subsection_id=question.subsection_id,
            default_difficulty_level=question.default_difficulty_level,
            is_active=True,
            created_by_user_id=current_user.user_id,
        )
        db.add(db_question)
        db.flush()  # Get question_id before adding options

        # Create options
        question_options = [
            QuestionOption(
                question_id=db_question.question_id,
                option_text=opt.option_text,
                option_order=opt.option_order
            )
            for opt in question.options
        ]
        db.bulk_save_objects(question_options)
        
        try:
            db.commit()
            return db_question
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating question: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create question"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{question_id}", response_model=QuestionResponse)
@limiter.limit("30/minute")
async def get_question(
    request: Request,
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Use eager loading to avoid N+1
        question = db.query(Question).options(
            joinedload(Question.options)
        ).filter(
            Question.question_id == question_id,
            Question.is_active == True
        ).first()

        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        return question
    except Exception as e:
        logger.error(f"Error retrieving question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving question"
        )

@router.post("/upload")
@limiter.limit("10/minute")
async def upload_questions(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Read Excel file
        df = pd.read_excel(file.file)
        
        # Start transaction
        questions_to_create = []
        options_to_create = []

        # Process questions in batch
        for _, row in df.iterrows():
            db_question = Question(
                question_text=row['question_text'],
                correct_option_index=row['correct_option_index'],
                paper_id=row['paper_id'],
                section_id=row.get('section_id'),
                subsection_id=row.get('subsection_id'),
                is_active=True,
                created_by_user_id=current_user.user_id
            )
            questions_to_create.append(db_question)
            
            # Add options for this question
            for i in range(4):
                option = QuestionOption(
                    question=db_question,
                    option_text=row[f'option_{i}'],
                    option_index=i
                )
                options_to_create.append(option)

        # Bulk insert questions and options
        db.bulk_save_objects(questions_to_create)
        db.bulk_save_objects(options_to_create)
        db.commit()

        return {
            "message": f"Successfully uploaded {len(questions_to_create)} questions"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading questions: {str(e)}"
        )

@router.get("/search")
@limiter.limit("20/minute")
async def search_questions(
    request: Request,
    query: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Use FTS if available or pattern matching for search
        questions = db.query(Question).options(
            joinedload(Question.options)
        ).filter(
            Question.question_text.ilike(f"%{query}%"),
            Question.is_active == True
        ).order_by(
            Question.created_at.desc()
        ).limit(20).all()

        return questions
    except Exception as e:
        logger.error(f"Error searching questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error searching questions"
        )
