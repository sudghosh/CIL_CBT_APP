from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
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

class SectionUpdate(BaseModel):
    section_name: str
    marks_allocated: int = None
    description: str = None

class SubsectionUpdate(BaseModel):
    subsection_name: str
    description: str = None

def serialize_paper(paper):
    return {
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

@router.get("", response_model=List[PaperResponse])
@router.get("/", response_model=List[PaperResponse])
@limiter.limit("30/minute")
async def get_papers(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Show all papers to admins, only active to others
        is_admin = getattr(current_user, "is_admin", None)
        if is_admin is None:
            is_admin = getattr(current_user, "role", "").lower() == "admin"
        query = db.query(Paper).options(
            joinedload(Paper.sections).joinedload(Section.subsections)
        )
        if not is_admin:
            query = query.filter(Paper.is_active == True)
        papers = query.all()
        return [serialize_paper(paper) for paper in papers]
    except Exception as e:
        logger.error(f"Error retrieving papers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving papers"
        )

@router.options("/", include_in_schema=False)
async def options_papers():
    """Handle OPTIONS requests for CORS preflight"""
    return {
        "Allow": "POST, GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PATCH, PUT, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@router.post("/", response_model=PaperResponse)
@router.post("", response_model=PaperResponse)
@limiter.limit("10/minute")
async def create_paper(
    request: Request,
    paper: PaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        logger.info(f"Creating paper with data: {paper}")
        if not paper.paper_name or not paper.paper_name.strip():
            logger.error("Paper name is missing or empty")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
                detail="Paper name is required and cannot be empty"
            )
        db_paper = Paper(
            paper_name=paper.paper_name,
            total_marks=paper.total_marks,
            description=paper.description,
            created_by_user_id=current_user.user_id,
            is_active=True
        )
        db.add(db_paper)
        try:
            db.flush()
        except IntegrityError as e:
            db.rollback()
            logger.error(f"IntegrityError: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Paper name already exists. Please use a unique name."
            )
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
            db.flush()
            subsections = [
                Subsection(
                    section_id=section.section_id,
                    subsection_name=sub.subsection_name,
                    description=sub.description
                )
                for sub in section_data.subsections
            ]
            subsections_to_create.extend(subsections)
        if subsections_to_create:
            db.bulk_save_objects(subsections_to_create)
        try:
            db.commit()
            db_paper = db.query(Paper).options(
                joinedload(Paper.sections).joinedload(Section.subsections)
            ).filter(Paper.paper_id == db_paper.paper_id).first()
            return serialize_paper(db_paper)
        except Exception as e:
            db.rollback()
            logger.error(f"Error committing paper creation: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create paper"
            )
    except HTTPException as e:
        logger.error(f"HTTPException in create_paper: {e.detail}")
        raise
    except Exception as e:
        import traceback
        logger.error(f"Exception in create_paper: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
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

@router.get("/{paper_id}", response_model=PaperResponse)
@limiter.limit("30/minute")
async def get_paper(
    request: Request,
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        paper = db.query(Paper).filter(
            Paper.paper_id == paper_id
        ).options(
            joinedload(Paper.sections).joinedload(Section.subsections)
        ).first()
        
        if not paper:
            raise HTTPException(status_code=404, detail=f"Paper with ID {paper_id} not found")
        
        return serialize_paper(paper)
    except Exception as e:
        logger.error(f"Error retrieving paper {paper_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving paper"
        )

@router.put("/{paper_id}", response_model=PaperResponse)
@limiter.limit("10/minute")
async def update_paper(
    request: Request,
    paper_id: int,
    paper_update: PaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        db_paper = db.query(Paper).filter(Paper.paper_id == paper_id).first()
        if not db_paper:
            raise HTTPException(status_code=404, detail=f"Paper with ID {paper_id} not found")
        
        db_paper.paper_name = paper_update.paper_name
        db_paper.total_marks = paper_update.total_marks
        db_paper.description = paper_update.description
        
        db.commit()
        db.refresh(db_paper)
        
        updated_paper = db.query(Paper).options(
            joinedload(Paper.sections).joinedload(Section.subsections)
        ).filter(Paper.paper_id == paper_id).first()
        
        return serialize_paper(updated_paper)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating paper {paper_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating paper"
        )

@router.delete("/{paper_id}")
@limiter.limit("10/minute")
async def delete_paper(
    request: Request,
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Check if paper exists
        db_paper = db.query(Paper).filter(Paper.paper_id == paper_id).first()
        if not db_paper:
            raise HTTPException(status_code=404, detail=f"Paper with ID {paper_id} not found")
        
        # Check if paper has sections
        sections = db.query(Section).filter(Section.paper_id == paper_id).all()
        if sections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete paper with existing sections. Delete sections first."
            )
        
        # Delete the paper
        db.delete(db_paper)
        db.commit()
        
        return {"status": "success", "message": f"Paper with ID {paper_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting paper {paper_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting paper"
        )

@router.options("/{paper_id}", include_in_schema=False)
async def options_paper_by_id():
    """Handle OPTIONS requests for specific paper endpoints"""
    return {
        "Allow": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@router.delete("/sections/{section_id}")
@limiter.limit("10/minute")
async def delete_section(
    request: Request,
    section_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        section = db.query(Section).filter(Section.section_id == section_id).first()
        if not section:
            raise HTTPException(status_code=404, detail=f"Section with ID {section_id} not found")
        # Check if section has subsections
        subsections = db.query(Subsection).filter(Subsection.section_id == section_id).all()
        if subsections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete section with existing subsections. Delete subsections first."
            )
        db.delete(section)
        db.commit()
        return {"status": "success", "message": f"Section with ID {section_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting section {section_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting section"
        )

@router.delete("/subsections/{subsection_id}")
@limiter.limit("10/minute")
async def delete_subsection(
    request: Request,
    subsection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        subsection = db.query(Subsection).filter(Subsection.subsection_id == subsection_id).first()
        if not subsection:
            raise HTTPException(status_code=404, detail=f"Subsection with ID {subsection_id} not found")
        db.delete(subsection)
        db.commit()
        return {"status": "success", "message": f"Subsection with ID {subsection_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting subsection {subsection_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting subsection"
        )

@router.put("/sections/{section_id}")
@limiter.limit("10/minute")
async def update_section(
    request: Request,
    section_id: int,
    section_update: SectionUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Check if section exists
        db_section = db.query(Section).filter(Section.section_id == section_id).first()
        if not db_section:
            raise HTTPException(status_code=404, detail=f"Section with ID {section_id} not found")
        # Update section fields
        db_section.section_name = section_update.section_name
        db_section.marks_allocated = section_update.marks_allocated
        db_section.description = section_update.description
        db.commit()
        db.refresh(db_section)
        # Get the updated section with eager loading
        updated_section = db.query(Section).options(
            joinedload(Section.subsections)
        ).filter(Section.section_id == section_id).first()
        # Serialize subsections to dicts for response
        return {
            "section_id": updated_section.section_id,
            "paper_id": updated_section.paper_id,
            "section_name": updated_section.section_name,
            "marks_allocated": updated_section.marks_allocated,
            "description": updated_section.description,
            "subsections": [
                {
                    "subsection_id": sub.subsection_id,
                    "subsection_name": sub.subsection_name,
                    "description": sub.description
                }
                for sub in updated_section.subsections
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating section {section_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating section"
        )

@router.put("/subsections/{subsection_id}")
@limiter.limit("10/minute")
async def update_subsection(
    request: Request,
    subsection_id: int,
    subsection_update: SubsectionUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        subsection = db.query(Subsection).filter(Subsection.subsection_id == subsection_id).first()
        if not subsection:
            logger.error(f"Subsection with ID {subsection_id} not found for update.")
            raise HTTPException(status_code=404, detail=f"Subsection with ID {subsection_id} not found")
        subsection.subsection_name = subsection_update.subsection_name
        subsection.description = subsection_update.description
        db.commit()
        db.refresh(subsection)
        return {
            "subsection_id": subsection.subsection_id,
            "subsection_name": subsection.subsection_name,
            "description": subsection.description
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating subsection {subsection_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating subsection: {str(e)}"
        )

@router.options("/sections/{section_id}", include_in_schema=False)
async def options_section_by_id():
    return {
        "Allow": "PUT, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PUT, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@router.options("/subsections/{subsection_id}", include_in_schema=False)
async def options_subsection_by_id():
    return {
        "Allow": "PUT, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PUT, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }
