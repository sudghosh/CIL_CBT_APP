from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from ..database.database import get_db
from ..database.models import Paper, Section, Subsection
from ..auth.auth import verify_token, verify_admin, User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/papers", tags=["papers"])

class SubsectionBase(BaseModel):
    subsection_name: str
    description: str = None

    class Config:
        from_attributes = True

class SectionBase(BaseModel):
    section_name: str
    marks_allocated: int = None
    description: str = None
    subsections: List[SubsectionBase] = []

    class Config:
        from_attributes = True

class PaperCreate(BaseModel):
    paper_name: str
    total_marks: int
    description: str = None
    sections: List[SectionBase] = []

    class Config:
        from_attributes = True

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
@limiter.limit("30/minute")
async def get_papers(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Use eager loading to avoid N+1 queries
        papers = db.query(Paper).filter(
            Paper.is_active == True
        ).options(
            joinedload(Paper.sections).joinedload(Section.subsections)
        ).all()
        
        # Transform the data for response
        response = []
        for paper in papers:
            paper_dict = {
                "paper_id": paper.paper_id,
                "paper_name": paper.paper_name,
                "total_marks": paper.total_marks,
                "description": paper.description,
                "is_active": paper.is_active,
                "sections": [
                    {
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
                            for sub in section.subsections
                        ]
                    }
                    for section in paper.sections
                ]
            }
            response.append(paper_dict)
        
        return response
    except Exception as e:
        logger.error(f"Error retrieving papers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving papers"
        )

@router.post("/", response_model=PaperResponse)
@limiter.limit("10/minute")
async def create_paper(
    request: Request,
    paper: PaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Create paper
        db_paper = Paper(
            paper_name=paper.paper_name,
            total_marks=paper.total_marks,
            description=paper.description,
            created_by_user_id=current_user.user_id,
            is_active=True
        )
        db.add(db_paper)
        db.flush()

        # Create sections with subsections
        sections_to_create = []
        subsections_to_create = []

        for section_data in paper.sections:
            section = Section(
                paper_id=db_paper.paper_id,
                section_name=section_data.section_name,
                marks_allocated=section_data.marks_allocated,
                description=section_data.description
            )
            sections_to_create.append(section)
            db.add(section)
            db.flush()  # Get section_id

            # Add subsections if any
            subsections = [
                Subsection(
                    section_id=section.section_id,
                    subsection_name=sub.subsection_name,
                    description=sub.description
                )
                for sub in section_data.subsections
            ]
            subsections_to_create.extend(subsections)

        # Bulk insert all records
        if subsections_to_create:
            db.bulk_save_objects(subsections_to_create)

        # Commit all changes
        try:
            db.commit()
            # Refresh paper with eager loading for response
            db_paper = db.query(Paper).options(
                joinedload(Paper.sections).joinedload(Section.subsections)
            ).filter(Paper.paper_id == db_paper.paper_id).first()
            return db_paper
        except Exception as e:
            db.rollback()
            logger.error(f"Error committing paper creation: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create paper"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_paper: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

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
