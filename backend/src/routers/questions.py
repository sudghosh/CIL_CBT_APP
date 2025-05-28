from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database.database import get_db
from ..database.models import Question, QuestionOption, Paper, Section, Subsection
from ..auth.auth import verify_token, verify_admin, User
import pandas as pd
import io
from pydantic import BaseModel

router = APIRouter(prefix="/questions", tags=["questions"])

class QuestionOptionBase(BaseModel):
    option_text: str
    option_order: int

class QuestionBase(BaseModel):
    question_text: str
    question_type: str
    correct_option_index: int
    explanation: Optional[str] = None
    paper_id: int
    section_id: int
    subsection_id: Optional[int] = None
    default_difficulty_level: str = "Easy"
    options: List[QuestionOptionBase]

class QuestionResponse(QuestionBase):
    question_id: int
    community_difficulty_score: float
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/", response_model=QuestionResponse)
async def create_question(
    question: QuestionBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    db_question = Question(
        question_text=question.question_text,
        question_type=question.question_type,
        correct_option_index=question.correct_option_index,
        explanation=question.explanation,
        paper_id=question.paper_id,
        section_id=question.section_id,
        subsection_id=question.subsection_id,
        default_difficulty_level=question.default_difficulty_level
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)

    for option in question.options:
        db_option = QuestionOption(
            question_id=db_question.question_id,
            option_text=option.option_text,
            option_order=option.option_order
        )
        db.add(db_option)
    
    db.commit()
    db.refresh(db_question)
    return db_question

@router.post("/upload")
async def upload_questions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(
            status_code=400,
            detail="File must be a CSV or Excel file"
        )
    
    content = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        questions_added = 0
        for _, row in df.iterrows():
            # Get or create paper
            paper = db.query(Paper).filter(Paper.paper_name == row['paper_name']).first()
            if not paper:
                paper = Paper(paper_name=row['paper_name'], total_marks=100)
                db.add(paper)
                db.commit()
            
            # Get or create section
            section = db.query(Section).filter(
                Section.paper_id == paper.paper_id,
                Section.section_name == row['section_name']
            ).first()
            if not section:
                section = Section(
                    paper_id=paper.paper_id,
                    section_name=row['section_name']
                )
                db.add(section)
                db.commit()

            # Create question
            question = Question(
                question_text=row['question_text'],
                question_type='MCQ',
                correct_option_index=row['correct_option_index'],
                explanation=row.get('explanation'),
                paper_id=paper.paper_id,
                section_id=section.section_id,
                default_difficulty_level=row.get('difficulty', 'Easy')
            )
            db.add(question)
            db.commit()

            # Add options
            for i in range(4):
                option = QuestionOption(
                    question_id=question.question_id,
                    option_text=row[f'option_{i+1}'],
                    option_order=i
                )
                db.add(option)
            
            questions_added += 1
            
        db.commit()
        return {"status": "success", "questions_added": questions_added}
    
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error processing file: {str(e)}"
        )

@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    question = db.query(Question).filter(Question.question_id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.get("/", response_model=List[QuestionResponse])
async def get_questions(
    skip: int = 0,
    limit: int = 100,
    paper_id: Optional[int] = None,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    query = db.query(Question)
    if paper_id:
        query = query.filter(Question.paper_id == paper_id)
    if section_id:
        query = query.filter(Question.section_id == section_id)
    
    questions = query.offset(skip).limit(limit).all()
    return questions
