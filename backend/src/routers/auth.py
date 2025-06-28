from fastapi import APIRouter, Depends, HTTPException, status, Request, Request
from sqlalchemy.orm import Session
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from ..database.database import get_db
from ..database.models import User, AllowedEmail
from ..auth.auth import create_access_token, verify_token, verify_admin
from datetime import timedelta, datetime
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

class GoogleTokenInfo(BaseModel):
    token: str

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
async def google_auth_callback(token_info: GoogleTokenInfo, request: Request, db: Session = Depends(get_db)):
    try:
        # Print debug information
        print(f"Received token info: {token_info}")
        print(f"Using client ID: {GOOGLE_CLIENT_ID}")

        # Verify the Google token
        try:
            idinfo = id_token.verify_oauth2_token(
                token_info.token,
                requests.Request(),
                GOOGLE_CLIENT_ID
            )
            print("Google token verified successfully.")
        except ValueError as e:
            print(f"Token verification failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
        except Exception as e:
            print(f"An unexpected error occurred during token verification: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred during token verification"
            )

        # Get user information from the verified token
        email = idinfo.get('email')
        if not email:
            print("Email not found in token.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not found in token"
            )
        print(f"Email extracted from token: {email}")
        google_id = idinfo.get('sub', '')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')

        # CRITICAL STEP 1: Check if email is whitelisted
        allowed_email = db.query(AllowedEmail).filter(AllowedEmail.email == email).first()
        if not allowed_email:
            print(f"Email {email} not in whitelist")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your email is not authorized for this application. Please contact an administrator."
            )

        print(f"Email {email} found in whitelist. Proceeding with authentication.")

        # STEP 2: Check if user already exists in the database
        user = db.query(User).filter(User.email == email).first()
        
        # Handle existing user
        if user:
            print(f"Existing user found: {user.email} with role: {user.role}")
            # Update user details if needed but keep the existing role
            user.google_id = google_id
            user.first_name = first_name
            user.last_name = last_name
            # Important: do not change the role of existing users
            db.commit()
            db.refresh(user)
            print(f"User details updated for {user.email}")
        # Handle new user with whitelisted email
        else:
            print(f"Creating new user for whitelisted email: {email}")
            user = User(
                email=email,
                google_id=google_id,
                first_name=first_name,
                last_name=last_name,
                role="User",  # Default role is "User" for new users
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"New user created with email: {email} and role: {user.role}")

        # STEP 3: Generate Authentication Token with user role included
        try:
            access_token_expires = timedelta(minutes=30)
            # Include the user role in the token payload
            access_token = create_access_token(
                data={
                    "sub": email,
                    "role": user.role,  # Include role in token for authorization
                    "user_id": user.user_id
                },
                expires_delta=access_token_expires
            )
            print(f"Access token created successfully for {email} with role: {user.role}")
        except Exception as e:
            print(f"Error creating access token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error creating access token"
            )


        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise # Re-raise HTTPException
    except Exception as e:
        print(f"An unhandled error occurred during Google authentication: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during authentication"
        )

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(verify_token)):
    return current_user

# Special development mode endpoint for local testing
# This should only be used in development environment
@router.post("/dev-login")
async def dev_login(db: Session = Depends(get_db)):
    # Check if we're in development mode (could be checked via environment variable)
    # For security, ensure this endpoint is disabled in production
    if os.getenv("ENV") != "development" and os.getenv("ENV") != "dev":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development login is only available in development environment"
        )
    
    # Use the email of the user who has performance data for easier testing
    dev_email = "binty.ghosh@gmail.com"
    
    try:
        # Check if dev user exists, create if not
        user = db.query(User).filter(User.email == dev_email).first()
        if not user:
            user = User(
                email=dev_email,
                google_id="dev-google-id",
                first_name="Development",
                last_name="User",
                role="Admin", 
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Development user created with email: {dev_email}")
            
            # Add to whitelist
            allowed_email = db.query(AllowedEmail).filter(AllowedEmail.email == dev_email).first()
            if not allowed_email:
                allowed_email = AllowedEmail(
                    email=dev_email,
                    added_by_admin_id=user.user_id
                )
                db.add(allowed_email)
                db.commit()
                print(f"Development email {dev_email} added to whitelist.")
        else:
            print(f"Using existing development user: {dev_email}")        # Create a special development token with very long expiration
        access_token_expires = timedelta(days=30)  # 30 days for dev
        access_token = create_access_token(
            data={
                "sub": dev_email,
                "role": user.role,  # Include role in token for authorization
                "user_id": user.user_id
            },
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Error in development login: {str(e)}")
        db.rollback()  # Ensure we don't leave transactions hanging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Development login failed: {str(e)}"
        )

@router.get("/dev-validate")
async def dev_validate(db: Session = Depends(get_db)):
    """
    A simple endpoint to validate dev mode is working.
    This is helpful for troubleshooting development authentication.
    """
    # Only allowed in development
    if os.getenv("ENV") != "development" and os.getenv("ENV") != "dev":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development validation is only available in development environment"
        )
    
    # Return development environment information
    return {
        "status": "active", 
        "mode": "development",
        "dev_email": "dev@example.com",
        "timestamp": str(datetime.now())
    }

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
    if data["role"] not in ["Admin", "User"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = data["role"]
    db.commit()
    return {"status": "success"}
