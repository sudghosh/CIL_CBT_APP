from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from ..database.database import get_db
from ..database.models import AllowedEmail, User
from ..auth.auth import verify_admin
from ..utils.error_handler import APIErrorHandler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/admin", tags=["admin"])

class AllowedEmailCreate(BaseModel):
    email: EmailStr

class AllowedEmailResponse(BaseModel):
    allowed_email_id: int
    email: str
    added_by_admin_id: int
    added_at: str

    class Config:
        orm_mode = True

@router.post("/allowed-emails", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def add_allowed_email(
    request: Request,
    email_data: AllowedEmailCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Log the incoming request for debugging
        logger.info(f"Received whitelist request for email: {email_data.email}")
        
        # Check if email already exists
        existing_email = db.query(AllowedEmail).filter(AllowedEmail.email == email_data.email).first()
        if existing_email:
            logger.info(f"Email {email_data.email} is already whitelisted")
            return {"status": "success", "message": f"Email {email_data.email} is already whitelisted"}

        # Create new allowed email entry
        allowed_email = AllowedEmail(
            email=email_data.email,
            added_by_admin_id=current_user.user_id
        )
        db.add(allowed_email)
        db.commit()
        db.refresh(allowed_email)
        
        logger.info(f"Email {email_data.email} whitelisted by admin {current_user.email}")
        return {"status": "success", "message": f"Email {email_data.email} whitelisted successfully"}
    
    except Exception as e:
        logger.error(f"Error adding allowed email: {e}")
        db.rollback()
        raise APIErrorHandler.handle_db_error(e, "adding allowed email")

@router.get("/allowed-emails", response_model=List[AllowedEmailResponse])
@limiter.limit("30/minute")
async def list_allowed_emails(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        allowed_emails = db.query(AllowedEmail).offset(skip).limit(limit).all()
        return allowed_emails
    except Exception as e:
        logger.error(f"Error listing allowed emails: {e}")
        raise APIErrorHandler.handle_db_error(e, "listing allowed emails")
