from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text, or_
from typing import List, Dict, Optional, Literal, Any, Union
from pydantic import BaseModel, Field, validator
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import numpy as np
import logging
import time
import traceback  # Added explicit import for traceback
from datetime import date, datetime
from fastapi.responses import StreamingResponse
from io import StringIO

# Helper function to safely convert NumPy/pandas data types to Python native types
def safe_convert(value: Any) -> Any:
    """
    Convert NumPy/pandas data types to Python native types to prevent 
    database adapter errors.
    """
    if value is None:
        return None
    
    # Handle numpy integer types
    if hasattr(value, 'dtype') and np.issubdtype(value.dtype, np.integer):
        return int(value)
    
    # Handle numpy float types
    if hasattr(value, 'dtype') and np.issubdtype(value.dtype, np.floating):
        return float(value)
    
    # Handle numpy boolean types
    if hasattr(value, 'dtype') and np.issubdtype(value.dtype, np.bool_):
        return bool(value)
    
    # Handle pandas Timestamp
    if hasattr(value, 'timestamp'):
        return value.to_pydatetime()
    
    # Handle any other numpy type by converting to its native Python equivalent
    if hasattr(value, 'item'):
        try:
            return value.item()
        except:
            pass
    
    # Return as-is if no conversion needed
    return value

from ..database.database import get_db
from ..database.models import Question, QuestionOption, User, Paper, Section, Subsection, TestAnswer
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
        items = query.offset((page-1)*page_size).limit(page_size).all()
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

@router.post("/upload", dependencies=[Depends(verify_admin)])
async def upload_questions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Upload questions from a CSV or Excel file.
    Requires all the columns as per the sample template.
    """
    logger.info(f"[QUESTIONS ENDPOINT] POST /questions/upload called with file: {file.filename}")
    allowed_extensions = ['.csv', '.xlsx', '.xls']
    
    # Check file extension
    file_ext = file.filename.lower().split(".")[-1]
    if f'.{file_ext}' not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Please upload a CSV or Excel file. Got: {file_ext}"
        )
    
    try:
        # Read the content
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Parse CSV/Excel based on extension
        try:
            if file_ext == 'csv':
                df = pd.read_csv(StringIO(content.decode('utf-8')))
            else:  # Excel
                import io
                df = pd.read_excel(io.BytesIO(content))
        except Exception as e:
            logger.error(f"Error parsing file: {e}")
            raise HTTPException(
                status_code=400, 
                detail=f"Error parsing file: {str(e)}"
            )
        
        # Validate required columns
        required_columns = [
            'question_text', 'question_type', 'default_difficulty_level', 
            'paper_id', 'section_id', 'correct_option_index', 
            'option_0', 'option_1'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
          # Check for paper existence first
        unique_paper_ids = df['paper_id'].unique()
        for paper_id in unique_paper_ids:
            # Convert any NumPy data type to Python native type to avoid adapter errors
            python_paper_id = safe_convert(paper_id)
            paper = db.query(Paper).filter(Paper.paper_id == python_paper_id).first()
            if not paper:
                logger.error(f"Paper ID {python_paper_id} referenced in CSV does not exist in database")
                raise HTTPException(
                    status_code=404,
                    detail=f"Paper with ID {python_paper_id} does not exist. Please create it first."
                )
                
        # Process each row
        questions_created = 0
        errors = []

        for index, row in df.iterrows():
            try:
                # Skip empty rows
                if pd.isna(row['question_text']) or str(row['question_text']).strip() == '':
                    continue
                
                # Validate required values are present for this row
                for col in required_columns:
                    if pd.isna(row[col]) or str(row[col]).strip() == '':
                        raise ValueError(f"Row {index+2} missing value for required column: {col}")
                
                # For MCQ, ensure all options are provided
                if row['question_type'] == 'MCQ':
                    # MCQ needs at least option_0, option_1, option_2, option_3
                    for opt_idx in range(4):
                        opt_col = f'option_{opt_idx}'
                        if opt_col not in df.columns or pd.isna(row[opt_col]) or str(row[opt_col]).strip() == '':
                            raise ValueError(f"Row {index+2} missing value for required column for MCQ: {opt_col}")                # Create the question - use safe_convert for all values to handle NumPy data types
                question = Question(
                    question_text=str(row['question_text']),
                    question_type=str(row['question_type']),
                    correct_option_index=safe_convert(row['correct_option_index']),
                    paper_id=safe_convert(row['paper_id']),
                    section_id=safe_convert(row['section_id']),
                    default_difficulty_level=str(row['default_difficulty_level']),
                    created_by_user_id=current_user.user_id
                )                # Add optional fields if present
                if 'subsection_id' in df.columns and not pd.isna(row['subsection_id']):
                    question.subsection_id = safe_convert(row['subsection_id'])  # Convert numpy.int64 to Python int
                
                if 'explanation' in df.columns and not pd.isna(row['explanation']):
                    question.explanation = row['explanation']
                
                if 'valid_until' in df.columns and not pd.isna(row['valid_until']):
                    try:
                        # Parse date in DD-MM-YYYY format
                        date_parts = row['valid_until'].split('-')
                        if len(date_parts) == 3:
                            day, month, year = map(int, date_parts)
                            question.valid_until = date(year, month, day)
                    except Exception as date_error:
                        logger.warning(f"Error parsing valid_until date: {date_error}")
                
                # Add to session
                db.add(question)
                db.flush()  # Get the question_id

                # Create options
                option_count = 2  # Minimum
                if row['question_type'] == 'MCQ':
                    option_count = 4  # MCQs need all 4
                
                options = []
                for i in range(option_count):
                    opt_col = f'option_{i}'
                    if opt_col in df.columns and not pd.isna(row[opt_col]):
                        option = QuestionOption(
                            question_id=question.question_id,
                            option_text=row[opt_col],
                            option_order=i
                        )
                        options.append(option)
                
                db.add_all(options)
                questions_created += 1
                
            except ValueError as ve:
                # Validation error
                errors.append(str(ve))
            except Exception as e:
                # Other error
                errors.append(f"Error in row {index+2}: {str(e)}")
          # Commit if no errors, otherwise rollback
        if errors:
            db.rollback()
            logger.error(f"Errors importing questions: {errors}")
            raise HTTPException(
                status_code=400,
                detail={"message": "Errors importing questions", "errors": errors}
            )
        else:
            db.commit()
            logger.info(f"Successfully imported {questions_created} questions")
            return {"message": f"Successfully imported {questions_created} questions"}
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error processing upload: {e}\n{traceback.format_exc()}")
        db.rollback()
        
        # Check for specific numpy data type errors and provide helpful message
        if "numpy.int64" in str(e) or "can't adapt type" in str(e):
            logger.error("NumPy data type conversion error detected. Enhancing error message.")
            raise HTTPException(
                status_code=500,
                detail="Data type conversion error. This has been fixed in the latest version. Please restart the backend and try again."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing upload: {str(e)}"
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

@router.delete("/{question_id}")
async def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    logger.info(f"[DEBUG][DELETE] Starting delete operation for question ID: {question_id} by admin {current_user.email}")
    try:
        # First check if the question exists
        question = db.query(Question).filter(Question.question_id == question_id).first()
        if not question:
            logger.warning(f"Attempted to delete non-existent question ID: {question_id}")
            raise HTTPException(status_code=404, detail="Question not found")

        # Log related objects to help with debugging
        logger.info(f"[DEBUG][DELETE] Found question with ID: {question_id}, paper_id: {question.paper_id}, section_id: {question.section_id}")
        
        # Count related objects before delete
        options_count = db.query(QuestionOption).filter(QuestionOption.question_id == question_id).count()
        answers_count = db.query(TestAnswer).filter(TestAnswer.question_id == question_id).count()
        
        logger.info(f"[DEBUG][DELETE] Question has {options_count} options and {answers_count} test answers")

        # Explicitly delete the options first to avoid foreign key constraint violations
        if options_count > 0:
            logger.info(f"[DEBUG][DELETE] Deleting {options_count} options for question {question_id}")
            try:
                db.query(QuestionOption).filter(QuestionOption.question_id == question_id).delete()
                logger.info(f"[DEBUG][DELETE] Options for question {question_id} deleted successfully")
            except Exception as options_error:
                logger.error(f"[DEBUG][DELETE] Error deleting options: {options_error}")
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Error deleting question options: {str(options_error)}")

        # Delete related test answers if they exist
        if answers_count > 0:
            logger.info(f"[DEBUG][DELETE] Deleting {answers_count} test answers for question {question_id}")
            try:
                db.query(TestAnswer).filter(TestAnswer.question_id == question_id).delete()
                logger.info(f"[DEBUG][DELETE] Test answers for question {question_id} deleted successfully")
            except Exception as answers_error:
                logger.error(f"[DEBUG][DELETE] Error deleting test answers: {answers_error}")
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Error deleting test answers: {str(answers_error)}")

        # Perform the delete with extra error handling
        try:
            db.delete(question)
            logger.info(f"[DEBUG][DELETE] Question object marked for deletion")
            db.commit()
            logger.info(f"Question {question_id} deleted successfully by admin {current_user.email}")
            return {"status": "success", "message": f"Question {question_id} deleted"}
        except Exception as commit_error:
            logger.error(f"[DEBUG][DELETE] Error during commit: {commit_error}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error committing delete: {str(commit_error)}")

    except HTTPException as e:
        logger.warning(f"[DEBUG][DELETE] HTTP exception during delete: {e.status_code}, {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"[DEBUG][DELETE] Error deleting question {question_id}: {e}\n{traceback.format_exc()}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
