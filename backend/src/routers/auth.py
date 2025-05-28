from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import requests
from ..database.database import get_db
from ..database.models import User, AllowedEmail
from ..auth.auth import verify_token, verify_admin, create_access_token
from datetime import timedelta
from pydantic import BaseModel
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter(prefix="/auth", tags=["auth"])

# Load Google Client ID from environment
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    google_id: str

class UserResponse(UserBase):
    user_id: int
    role: str
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/google-callback")
async def google_auth_callback(token_info: dict, db: Session = Depends(get_db)):
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            token_info.get("token"), 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        email = idinfo['email']
        google_id = idinfo['sub']
        
        # Check if email is whitelisted
        allowed_email = db.query(AllowedEmail).filter(AllowedEmail.email == email).first()
        if not allowed_email:
            # If no allowed emails exist yet (first user), make this user an admin
            if db.query(AllowedEmail).count() == 0:
                user = User(
                    email=email,
                    google_id=google_id,
                    first_name=idinfo.get('given_name'),
                    last_name=idinfo.get('family_name'),
                    role="Admin",
                    is_active=True
                )
                db.add(user)
                allowed_email = AllowedEmail(
                    email=email,
                    added_by_admin_id=1  # First user will have ID 1
                )
                db.add(allowed_email)
                db.commit()
                db.refresh(user)
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Email not whitelisted"
                )

        # Get or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                google_id=google_id,
                first_name=idinfo.get('given_name'),
                last_name=idinfo.get('family_name'),
                role="RegularUser"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": email},
            expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(verify_token)):
    return current_user

@router.get("/users", response_model=list[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/whitelist-email")
async def whitelist_email(
    email: str,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    allowed_email = AllowedEmail(
        email=email,
        added_by_admin_id=current_user.user_id
    )
    db.add(allowed_email)
    db.commit()
    db.refresh(allowed_email)
    return {"status": "success", "message": f"Email {email} whitelisted successfully"}

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    data: dict,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = data["is_active"]
    db.commit()
    return {"status": "success"}

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    data: dict,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    if data["role"] not in ["Admin", "RegularUser"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = data["role"]
    db.commit()
    return {"status": "success"}
