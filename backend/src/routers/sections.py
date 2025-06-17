from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from ..database.database import get_db
from ..database.models import Section, Subsection
from ..auth.auth import verify_token, verify_admin, User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/sections", tags=["sections"])

class SubsectionBase(BaseModel):
    subsection_name: str
    description: str = None

    class Config:
        from_attributes = True

class SectionCreate(BaseModel):
    paper_id: int
    section_name: str
    marks_allocated: int = None
    description: str = None
    subsections: List[SubsectionBase] = []

    class Config:
        from_attributes = True

class SectionUpdate(BaseModel):
    section_name: str
    marks_allocated: int = None
    description: str = None

    class Config:
        from_attributes = True

class SectionResponse(BaseModel):
    section_id: int
    paper_id: int
    section_name: str
    marks_allocated: int = None
    description: str = None
    subsections: List[dict] = []

    class Config:
        from_attributes = True

@router.get("/", response_model=Dict[str, object])
@limiter.limit("30/minute")
async def get_sections(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paper_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        query = db.query(Section)
        if paper_id:
            query = query.filter(Section.paper_id == paper_id)
        total = query.count()
        sections = query.options(
            joinedload(Section.subsections)
        ).offset((page-1)*page_size).limit(page_size).all()
        response = []
        for section in sections:
            section_dict = {
                "section_id": section.section_id,
                "paper_id": section.paper_id,
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
            response.append(section_dict)
        return {"items": response, "total": total, "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"Error retrieving sections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving sections"
        )

@router.get("/{section_id}", response_model=SectionResponse)
@limiter.limit("30/minute")
async def get_section(
    request: Request,
    section_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        section = db.query(Section).filter(
            Section.section_id == section_id
        ).options(
            joinedload(Section.subsections)
        ).first()
        
        if not section:
            raise HTTPException(status_code=404, detail=f"Section with ID {section_id} not found")
        
        return section
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving section {section_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving section"
        )

@router.post("/", response_model=SectionResponse)
@limiter.limit("10/minute")
async def create_section(
    request: Request,
    section: SectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Create section
        db_section = Section(
            paper_id=section.paper_id,
            section_name=section.section_name,
            marks_allocated=section.marks_allocated,
            description=section.description
        )
        db.add(db_section)
        db.flush()

        # Create subsections if any
        subsections_to_create = []
        for subsection_data in section.subsections:
            subsection = Subsection(
                section_id=db_section.section_id,
                subsection_name=subsection_data.subsection_name,
                description=subsection_data.description
            )
            subsections_to_create.append(subsection)

        # Bulk insert all subsections
        if subsections_to_create:
            db.bulk_save_objects(subsections_to_create)

        # Commit all changes
        db.commit()
        db.refresh(db_section)
        
        # Reload section with eager loading for response
        db_section = db.query(Section).options(
            joinedload(Section.subsections)
        ).filter(Section.section_id == db_section.section_id).first()
        
        return db_section
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating section: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating section"
        )

@router.put("/{section_id}", response_model=SectionResponse)
@limiter.limit("10/minute")
async def update_section(
    request: Request,
    section_id: int,
    section_update: SectionUpdate,
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

@router.delete("/{section_id}")
@limiter.limit("10/minute")
async def delete_section(
    request: Request,
    section_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Check if section exists
        db_section = db.query(Section).filter(Section.section_id == section_id).first()
        if not db_section:
            raise HTTPException(status_code=404, detail=f"Section with ID {section_id} not found")
        
        # Log the deletion operation
        logger.info(f"Deleting section {section_id} with cascading delete for subsections and questions")
        
        # Get subsections to delete (for logging purposes)
        subsections = db.query(Subsection).filter(Subsection.section_id == section_id).all()
        if subsections:
            subsection_ids = [subsection.subsection_id for subsection in subsections]
            logger.info(f"Section {section_id} has {len(subsections)} subsections that will be deleted: {subsection_ids}")
        
        # Delete the section - cascade delete will handle subsections and related questions
        db.delete(db_section)
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

@router.options("/{section_id}", include_in_schema=False)
async def options_section_by_id():
    return {
        "Allow": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@router.options("/{section_id}/subsections/", include_in_schema=False)
async def options_section_subsections():
    return {
        "Allow": "GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@router.get("/{section_id}/subsections/", response_model=List[dict])
@limiter.limit("30/minute")
async def get_section_subsections(
    request: Request,
    section_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Check if section exists
        section = db.query(Section).filter(Section.section_id == section_id).first()
        if not section:
            raise HTTPException(status_code=404, detail=f"Section with ID {section_id} not found")
        
        # Get subsections for the section
        subsections = db.query(Subsection).filter(Subsection.section_id == section_id).all()
        
        # Return serialized subsections
        return [
            {
                "subsection_id": sub.subsection_id,
                "subsection_name": sub.subsection_name,
                "description": sub.description,
                "section_id": sub.section_id
            }
            for sub in subsections
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving subsections for section {section_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving subsections for section {section_id}"
        )
