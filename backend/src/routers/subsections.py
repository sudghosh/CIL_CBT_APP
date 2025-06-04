from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from ..database.database import get_db
from ..database.models import Subsection
from ..auth.auth import verify_token, verify_admin, User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/subsections", tags=["subsections"])

class SubsectionCreate(BaseModel):
    section_id: int
    subsection_name: str
    description: str = None

    class Config:
        from_attributes = True

class SubsectionUpdate(BaseModel):
    subsection_name: str
    description: str = None

    class Config:
        from_attributes = True

class SubsectionResponse(BaseModel):
    subsection_id: int
    section_id: int
    subsection_name: str
    description: str = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[SubsectionResponse])
@limiter.limit("30/minute")
async def get_subsections(
    request: Request,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Start with base query
        query = db.query(Subsection)
        
        # Apply section_id filter if provided
        if section_id:
            query = query.filter(Subsection.section_id == section_id)
        
        # Execute query
        subsections = query.all()
        
        return subsections
    except Exception as e:
        logger.error(f"Error retrieving subsections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving subsections"
        )

@router.get("/{subsection_id}", response_model=SubsectionResponse)
@limiter.limit("30/minute")
async def get_subsection(
    request: Request,
    subsection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        subsection = db.query(Subsection).filter(
            Subsection.subsection_id == subsection_id
        ).first()
        
        if not subsection:
            raise HTTPException(status_code=404, detail=f"Subsection with ID {subsection_id} not found")
        
        return subsection
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving subsection {subsection_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving subsection"
        )

@router.post("/", response_model=SubsectionResponse)
@limiter.limit("10/minute")
async def create_subsection(
    request: Request,
    subsection: SubsectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Create subsection
        db_subsection = Subsection(
            section_id=subsection.section_id,
            subsection_name=subsection.subsection_name,
            description=subsection.description
        )
        db.add(db_subsection)
        db.commit()
        db.refresh(db_subsection)
        
        return db_subsection
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating subsection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating subsection"
        )

@router.put("/{subsection_id}", response_model=SubsectionResponse)
@limiter.limit("10/minute")
async def update_subsection(
    request: Request,
    subsection_id: int,
    subsection_update: SubsectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Check if subsection exists
        db_subsection = db.query(Subsection).filter(Subsection.subsection_id == subsection_id).first()
        if not db_subsection:
            raise HTTPException(status_code=404, detail=f"Subsection with ID {subsection_id} not found")
        
        # Update subsection fields
        db_subsection.subsection_name = subsection_update.subsection_name
        db_subsection.description = subsection_update.description
        
        db.commit()
        db.refresh(db_subsection)
        
        return db_subsection
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating subsection {subsection_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating subsection"
        )

@router.delete("/{subsection_id}")
@limiter.limit("10/minute")
async def delete_subsection(
    request: Request,
    subsection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Check if subsection exists
        db_subsection = db.query(Subsection).filter(Subsection.subsection_id == subsection_id).first()
        if not db_subsection:
            raise HTTPException(status_code=404, detail=f"Subsection with ID {subsection_id} not found")
        
        # Delete the subsection
        db.delete(db_subsection)
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
