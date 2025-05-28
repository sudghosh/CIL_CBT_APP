from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database.database import get_db
from ..database.models import Paper, Section, Subsection
from ..auth.auth import verify_token, verify_admin, User
from pydantic import BaseModel

router = APIRouter(prefix="/papers", tags=["papers"])

class SubsectionBase(BaseModel):
    subsection_name: str
    description: str = None

class SectionBase(BaseModel):
    section_name: str
    marks_allocated: int = None
    description: str = None
    subsections: List[SubsectionBase] = []

class PaperCreate(BaseModel):
    paper_name: str
    total_marks: int
    description: str = None
    sections: List[SectionBase] = []

class PaperResponse(BaseModel):
    paper_id: int
    paper_name: str
    total_marks: int
    description: str = None
    is_active: bool
    sections: List[dict] = []

    class Config:
        from_attributes = True

@router.get("/", response_model=List[PaperResponse])
async def get_papers(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    papers = db.query(Paper).filter(Paper.is_active == True).all()
    
    # Add sections and subsections to each paper
    response = []
    for paper in papers:
        sections = db.query(Section).filter(Section.paper_id == paper.paper_id).all()
        paper_dict = {
            "paper_id": paper.paper_id,
            "paper_name": paper.paper_name,
            "total_marks": paper.total_marks,
            "description": paper.description,
            "is_active": paper.is_active,
            "sections": []
        }
        
        for section in sections:
            subsections = db.query(Subsection).filter(
                Subsection.section_id == section.section_id
            ).all()
            section_dict = {
                "section_id": section.section_id,
                "section_name": section.section_name,
                "marks_allocated": section.marks_allocated,
                "description": section.description,
                "subsections": [
                    {
                        "subsection_id": sub.subsection_id,
                        "subsection_name": sub.subsection_name,
                        "description": sub.description
                    }
                    for sub in subsections
                ]
            }
            paper_dict["sections"].append(section_dict)
        
        response.append(paper_dict)
    
    return response

@router.post("/", response_model=PaperResponse)
async def create_paper(
    paper: PaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    db_paper = Paper(
        paper_name=paper.paper_name,
        total_marks=paper.total_marks,
        description=paper.description
    )
    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)

    for section_data in paper.sections:
        section = Section(
            paper_id=db_paper.paper_id,
            section_name=section_data.section_name,
            marks_allocated=section_data.marks_allocated,
            description=section_data.description
        )
        db.add(section)
        db.commit()
        db.refresh(section)

        for subsection_data in section_data.subsections:
            subsection = Subsection(
                section_id=section.section_id,
                subsection_name=subsection_data.subsection_name,
                description=subsection_data.description
            )
            db.add(subsection)
        
        db.commit()

    return db_paper

@router.put("/{paper_id}/activate")
async def activate_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    paper = db.query(Paper).filter(Paper.paper_id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    paper.is_active = True
    db.commit()
    return {"status": "success"}

@router.put("/{paper_id}/deactivate")
async def deactivate_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    paper = db.query(Paper).filter(Paper.paper_id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    paper.is_active = False
    db.commit()
    return {"status": "success"}
