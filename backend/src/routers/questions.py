from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text, or_
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field, validator
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import logging
import time
from datetime import date, datetime
from fastapi.responses import StreamingResponse
from io import StringIO

from ..database.database import get_db
from ..database.models import Question, QuestionOption, User, Paper, Section, Subsection
from ..auth.auth import verify_token, verify_admin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/questions", tags=["questions"])

logger.info("[QUESTIONS ROUTER] questions.py loaded and router registered.")

@router.options("/", include_in_schema=False)
async def options_questions():
    """Handle OPTIONS requests for CORS preflight"""
    return {
        "Allow": "POST, GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PATCH, PUT, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@router.options("/{question_id}", include_in_schema=False)
async def options_question_by_id():
    """Handle OPTIONS requests for specific question endpoints"""
    return {
        "Allow": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

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
    valid_until: date
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class QuestionRead(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    correct_option_index: int
    explanation: Optional[str]
    paper_id: int
    section_id: int
    subsection_id: Optional[int]
    default_difficulty_level: str
    community_difficulty_score: float
    valid_until: date
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    options: Optional[List[Dict]] = None
    paper: Optional[Dict] = None
    section: Optional[Dict] = None
    subsection: Optional[Dict] = None

    class Config:
        orm_mode = True

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
            valid_until=question.valid_until if hasattr(question, 'valid_until') and question.valid_until else date(9999, 12, 31),
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

@router.get("/", response_model=Dict[str, object])
@limiter.limit("30/minute")
async def get_questions(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paper_id: Optional[int] = None,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    logger.info(f"[QUESTIONS ENDPOINT] GET /questions called with page={page}, page_size={page_size}, paper_id={paper_id}, section_id={section_id}")
    start_time = time.time()
    try:
        query = db.query(Question).options(joinedload(Question.options))
        if paper_id:
            query = query.filter(Question.paper_id == paper_id)
        if section_id:
            query = query.filter(Question.section_id == section_id)
        # Only return valid questions
        query = query.filter(Question.valid_until >= date.today())
        total = query.count()
        items = query.offset((page-1)*page_size).limit(5).all()
        logger.info(f"Fetched {len(items)} questions from DB in {time.time() - start_time:.2f}s (total={total})")
        ser_start = time.time()
        serialized = []
        for q in items:
            try:
                options = [
                    QuestionOptionBase(
                        option_text=opt.option_text,
                        option_order=opt.option_order
                    ) for opt in getattr(q, 'options', [])
                ]
                q_dict = {
                    'question_id': q.question_id,
                    'question_text': q.question_text,
                    'question_type': q.question_type,
                    'correct_option_index': q.correct_option_index,
                    'explanation': q.explanation,
                    'paper_id': q.paper_id,
                    'section_id': q.section_id,
                    'subsection_id': q.subsection_id,
                    'default_difficulty_level': q.default_difficulty_level,
                    'community_difficulty_score': q.community_difficulty_score,
                    'valid_until': q.valid_until,
                    'options': [opt.model_dump() for opt in options]
                }
                serialized.append(q_dict)
            except Exception as ser_e:
                logger.error(f"Serialization error for question_id={getattr(q, 'question_id', None)}: {ser_e}")
        logger.info(f"Serialized {len(serialized)} questions in {time.time() - ser_start:.2f}s")
        logger.info(f"Total /questions endpoint time: {time.time() - start_time:.2f}s")
        return {
            "items": serialized,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        import traceback
        logger.error(f"Error fetching questions: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving questions"
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
            Question.valid_until >= date.today()
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
        import traceback
        import os
        start_time = time.time()
        filename = file.filename.lower()
        if filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(file.file)
        else:
            logger.warning(f"Unsupported file type: {filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Please upload a .csv or .xlsx file."
            )

        # --- Flexible header mapping for common CSV formats ---
        for i, col in enumerate(['a', 'b', 'c', 'd']):
            opt_col = f'option_{i}'
            if opt_col not in df.columns:
                for candidate in [
                    f'option_{col}', f'option_{chr(97+i)}', f'option_{chr(65+i)}',
                    f'option_{i}', f'option_{col.upper()}', f'option_{col.lower()}']:
                    if candidate in df.columns:
                        df[opt_col] = df[candidate]
                        break
        for i, col in enumerate(['a', 'b', 'c', 'd']):
            if f'option_{i}' not in df.columns and f'option_{col}' in df.columns:
                df[f'option_{i}'] = df[f'option_{col}']
        if 'correct_option_index' not in df.columns and 'correct_answer_index' in df.columns:
            df['correct_option_index'] = df['correct_answer_index']
        if 'explanation' not in df.columns:
            for col in df.columns:
                if 'explanation' in col:
                    df['explanation'] = df[col]
                    break
        required_columns = [
            'question_text', 'question_type', 'correct_option_index', 'paper_id',
            'option_0', 'option_1', 'option_2', 'option_3'
        ]
        # valid_until is optional in CSV, but will be handled below
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            logger.warning(f"Missing required columns: {missing}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns in upload: {', '.join(missing)}. Please check your CSV headers. Download the latest template from the upload page."
            )

        # Validate that required fields are not null/empty in each row
        for idx, row in df.iterrows():
            for col in required_columns:
                if pd.isnull(row[col]) or (isinstance(row[col], str) and not row[col].strip()):
                    logger.warning(f"Row {idx+1} missing value for required column: {col}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Row {idx+1} is missing a value for required column: {col}. Please check your CSV."
                    )

        options_to_create = []
        questions_created = []
        question_ids = []
        for idx, row in df.iterrows():
            try:
                # Parse valid_until
                valid_until = None
                if 'valid_until' in row and pd.notnull(row['valid_until']) and str(row['valid_until']).strip():
                    try:
                        valid_until = datetime.strptime(str(row['valid_until']).strip(), '%d-%m-%Y').date()
                    except Exception:
                        logger.warning(f"Row {idx+1} has invalid valid_until: {row['valid_until']}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Row {idx+1} has invalid valid_until date. Use DD-MM-YYYY format."
                        )
                else:
                    valid_until = date(9999, 12, 31)
                db_question = Question(
                    question_text=row['question_text'],
                    question_type=row['question_type'],
                    correct_option_index=row['correct_option_index'],
                    explanation=row.get('explanation', None),
                    paper_id=row['paper_id'],
                    section_id=row.get('section_id'),
                    subsection_id=row.get('subsection_id'),
                    default_difficulty_level=row.get('default_difficulty_level', 'Easy'),
                    valid_until=valid_until,
                    created_by_user_id=current_user.user_id
                )
                db.add(db_question)
                db.flush()  # Assigns question_id
                question_ids.append(db_question.question_id)
                for i in range(4):
                    option = QuestionOption(
                        question_id=db_question.question_id,
                        option_text=row[f'option_{i}'],
                        option_order=i
                    )
                    options_to_create.append(option)
                questions_created.append({
                    'question_id': db_question.question_id,
                    'question_text': db_question.question_text
                })
            except HTTPException:
                raise
            except Exception as row_e:
                logger.error(f"Row {idx} failed: {row_e}")
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error in row {idx+1}: {row_e}"
                )
        db.bulk_save_objects(options_to_create)
        try:
            db.commit()
            logger.info(f"Uploaded {len(questions_created)} questions in {time.time() - start_time:.2f}s")
            return {
                "status": "success",
                "message": f"Successfully uploaded {len(questions_created)} questions",
                "question_ids": question_ids,
                "questions": questions_created
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error committing upload: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to commit uploaded questions"
            )
    except HTTPException as he:
        db.rollback()
        logger.error(f"Upload error: {he.detail}")
        raise he
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error uploading questions: {str(e)}\n{traceback.format_exc()}")
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
            Question.valid_until >= date.today()
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

class QuestionUpdate(QuestionBase):
    pass

@router.put("/{question_id}", response_model=QuestionResponse)
@limiter.limit("10/minute")
async def update_question(
    request: Request,
    question_id: int,
    question_update: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        db_question = db.query(Question).filter(Question.question_id == question_id).first()
        if not db_question:
            raise HTTPException(status_code=404, detail="Question not found")
        # Update fields
        db_question.question_text = question_update.question_text
        db_question.question_type = question_update.question_type
        db_question.correct_option_index = question_update.correct_option_index
        db_question.explanation = question_update.explanation
        db_question.paper_id = question_update.paper_id
        db_question.section_id = question_update.section_id
        db_question.subsection_id = question_update.subsection_id
        db_question.default_difficulty_level = question_update.default_difficulty_level
        # Handle valid_until
        if hasattr(question_update, 'valid_until') and question_update.valid_until:
            db_question.valid_until = question_update.valid_until
        else:
            db_question.valid_until = db_question.valid_until or date(9999, 12, 31)
        # Update options
        db.query(QuestionOption).filter(QuestionOption.question_id == question_id).delete()
        db.flush()
        for opt in question_update.options:
            db.add(QuestionOption(
                question_id=question_id,
                option_text=opt.option_text,
                option_order=opt.option_order
            ))
        db.commit()
        db.refresh(db_question)
        # Manually serialize options for response
        options = [
            QuestionOptionBase(
                option_text=opt.option_text,
                option_order=opt.option_order
            ) for opt in db_question.options
        ]
        q_dict = {
            'question_id': db_question.question_id,
            'question_text': db_question.question_text,
            'question_type': db_question.question_type,
            'correct_option_index': db_question.correct_option_index,
            'explanation': db_question.explanation,
            'paper_id': db_question.paper_id,
            'section_id': db_question.section_id,
            'subsection_id': db_question.subsection_id,
            'default_difficulty_level': db_question.default_difficulty_level,
            'community_difficulty_score': db_question.community_difficulty_score,
            'valid_until': db_question.valid_until,
            'options': [opt.model_dump() for opt in options]
        }
        return q_dict
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating question {question_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating question"
        )

@router.get("/admin/search", response_model=List[QuestionRead], dependencies=[Depends(verify_admin)])
@limiter.limit("20/minute")
async def admin_search_questions(
    request: Request,
    db: Session = Depends(get_db),
    query: Optional[str] = Query(None, description="General search term for question text, paper, section, or subsection name"),
    paper_name: Optional[str] = Query(None, description="Partial or full paper name"),
    section_name: Optional[str] = Query(None, description="Partial or full section name"),
    subsection_name: Optional[str] = Query(None, description="Partial or full subsection name"),
    question_type: Optional[str] = Query(None, description="Filter by question type"),
    difficulty_level: Optional[str] = Query(None, description="Filter by difficulty level"),
    include_expired: Optional[bool] = Query(False, description="Set to true to include questions past their validity date"),
    limit: int = Query(20, gt=0, le=100),
    offset: int = Query(0, ge=0)
):
    q = db.query(Question).options(
        joinedload(Question.options),
        joinedload(Question.paper),
        joinedload(Question.section),
        joinedload(Question.subsection)
    )
    if not include_expired:
        q = q.filter(Question.valid_until >= date.today())
    if query:
        q = q.filter(or_(
            Question.question_text.ilike(f"%{query}%"),
            Paper.paper_name.ilike(f"%{query}%"),
            Section.section_name.ilike(f"%{query}%"),
            Subsection.subsection_name.ilike(f"%{query}%")
        ))
    if paper_name:
        q = q.join(Paper).filter(Paper.paper_name.ilike(f"%{paper_name}%"))
    if section_name:
        q = q.join(Section).filter(Section.section_name.ilike(f"%{section_name}%"))
    if subsection_name:
        q = q.join(Subsection).filter(Subsection.subsection_name.ilike(f"%{subsection_name}%"))
    if question_type:
        q = q.filter(Question.question_type == question_type)
    if difficulty_level:
        q = q.filter(Question.default_difficulty_level == difficulty_level)
    results = q.order_by(Question.created_at.desc()).offset(offset).limit(limit).all()
    # Serialize with nested details
    out = []
    for q in results:
        out.append(QuestionRead(
            question_id=q.question_id,
            question_text=q.question_text,
            question_type=q.question_type,
            correct_option_index=q.correct_option_index,
            explanation=q.explanation,
            paper_id=q.paper_id,
            section_id=q.section_id,
            subsection_id=q.subsection_id,
            default_difficulty_level=q.default_difficulty_level,
            community_difficulty_score=q.community_difficulty_score,
            valid_until=q.valid_until,
            created_at=q.created_at,
            updated_at=q.updated_at,
            options=[{
                'option_text': opt.option_text,
                'option_order': opt.option_order
            } for opt in q.options],
            paper={"paper_id": q.paper.paper_id, "paper_name": q.paper.paper_name} if q.paper else None,
            section={"section_id": q.section.section_id, "section_name": q.section.section_name} if q.section else None,
            subsection={"subsection_id": q.subsection.subsection_id, "subsection_name": q.subsection.subsection_name} if q.subsection else None
        ))
    return out

@router.get("/admin/download-all", dependencies=[Depends(verify_admin)])
@limiter.limit("5/minute")
async def download_all_questions(
    request: Request,
    db: Session = Depends(get_db)
):
    questions = db.query(Question).options(
        joinedload(Question.options),
        joinedload(Question.paper),
        joinedload(Question.section),
        joinedload(Question.subsection)
    ).all()
    rows = []
    for q in questions:
        row = {
            'question_id': q.question_id,
            'question_text': q.question_text,
            'question_type': q.question_type,
            'default_difficulty_level': q.default_difficulty_level,
            'correct_option_index': q.correct_option_index,
            'explanation': q.explanation,
            'paper_id': q.paper_id,
            'paper_name': q.paper.paper_name if q.paper else '',
            'section_id': q.section_id,
            'section_name': q.section.section_name if q.section else '',
            'subsection_id': q.subsection_id,
            'subsection_name': q.subsection.subsection_name if q.subsection else '',
            'valid_until': q.valid_until.strftime('%d-%m-%Y') if q.valid_until else '',
            'created_at': q.created_at,
            'updated_at': q.updated_at
        }
        # Add options
        for i in range(4):
            opt = next((o for o in q.options if o.option_order == i), None)
            row[f'option_{i}'] = opt.option_text if opt else ''
        rows.append(row)
    df = pd.DataFrame(rows)
    output = StringIO()
    df.to_csv(output, index=False, encoding='utf-8')
    output.seek(0)
    headers = {
        'Content-Disposition': 'attachment; filename="all_questions.csv"',
        'Content-Type': 'text/csv'
    }
    return StreamingResponse(output, headers=headers, media_type='text/csv')
