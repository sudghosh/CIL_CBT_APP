from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
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

@router.options("/allowed-emails", include_in_schema=False)
async def options_allowed_emails():
    """Handle OPTIONS requests for CORS preflight for allowed-emails endpoint"""
    return {
        "Allow": "POST, GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@router.options("/allowed-emails/{allowed_email_id}", include_in_schema=False)
async def options_allowed_email_by_id():
    """Handle OPTIONS requests for specific allowed email endpoints"""
    return {
        "Allow": "DELETE, OPTIONS",
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

class AllowedEmailCreate(BaseModel):
    email: EmailStr

class AllowedEmailResponse(BaseModel):
    allowed_email_id: int
    email: str
    added_by_admin_id: Optional[int] = None  # Allow None for existing NULL values
    added_at: datetime

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
        
        # Additional email validation (EmailStr from pydantic does basic validation)
        if not "@" in email_data.email or not "." in email_data.email:
            logger.warning(f"Invalid email format received: {email_data.email}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid email format: {email_data.email}. Please provide a valid email address."
            )
            
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
    
    except HTTPException as e:
        # Re-raise HTTP exceptions to maintain their status codes and details
        raise e
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
        logger.info(f"Fetching allowed emails with skip={skip} and limit={limit}")
        allowed_emails = db.query(AllowedEmail).offset(skip).limit(limit).all()
        logger.info(f"Found {len(allowed_emails)} allowed emails")
        
        # For debugging purposes
        for email in allowed_emails:
            logger.debug(f"Email ID: {email.allowed_email_id}, Email: {email.email}, Added by: {email.added_by_admin_id}, Added at: {email.added_at}")
        
        return allowed_emails
    except Exception as e:
        logger.error(f"Error listing allowed emails: {e}")
        # Print full exception details for better debugging
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise APIErrorHandler.handle_db_error(e, "listing allowed emails")

@router.delete("/allowed-emails/{allowed_email_id}", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def delete_allowed_email(
    request: Request,
    allowed_email_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Check if email exists
        allowed_email = db.query(AllowedEmail).filter(AllowedEmail.allowed_email_id == allowed_email_id).first()
        if not allowed_email:
            logger.warning(f"Attempted to delete non-existent allowed email ID: {allowed_email_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Allowed email with ID {allowed_email_id} not found"
            )

        # Delete the email
        db.delete(allowed_email)
        db.commit()
        
        logger.info(f"Email {allowed_email.email} removed from whitelist by admin {current_user.email}")
        return {"status": "success", "message": f"Email {allowed_email.email} removed from whitelist successfully"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting allowed email: {e}")
        db.rollback()
        raise APIErrorHandler.handle_db_error(e, "deleting allowed email")
