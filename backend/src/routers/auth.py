from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from ..database.database import get_db
from ..database.models import User, AllowedEmail
from ..auth.auth import create_access_token, verify_token, verify_admin
from datetime import timedelta
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


        # Check if this is the first user (will become admin)
        try:
            is_first_user = db.query(User).count() == 0
            print(f"Is first user: {is_first_user}")
        except Exception as e:
            print(f"Error checking for first user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error checking user count in database"
            )

        # If not first user, check whitelist
        if not is_first_user:
            try:
                allowed_email = db.query(AllowedEmail).filter(AllowedEmail.email == email).first()
                if not allowed_email:
                    print(f"Email {email} not in whitelist")
                    # Special case: add binty.ghosh@gmail.com to whitelist if not exists
                    if email == "binty.ghosh@gmail.com":
                        # Add to whitelist
                        admin_user = db.query(User).filter(User.role == "Admin").first()
                        if admin_user:
                            allowed_email = AllowedEmail(
                                email=email,
                                added_by_admin_id=admin_user.user_id
                            )
                            db.add(allowed_email)
                            db.commit()
                            print(f"Email {email} added to whitelist for admin {admin_user.user_id}")
                        else:
                             print(f"Could not find admin user to whitelist {email}")
                             # Decide how to handle this case - maybe raise an error or log a warning
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Email not whitelisted"
                        )
                else:
                    print(f"Email {email} found in whitelist.")
            except HTTPException:
                 raise # Re-raise the HTTPException
            except Exception as e:
                print(f"Error checking or adding email to whitelist: {str(e)}")
                db.rollback() # Rollback the transaction in case of error
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error processing email whitelist"
                )


        # Get or create user
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    google_id=idinfo.get('sub', ''), # Use .get for safety
                    first_name=idinfo.get('given_name', ''),
                    last_name=idinfo.get('family_name', ''),
                    role="Admin" if is_first_user else "RegularUser",
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"User created with email: {email}")

                # If this is the first user, add their email to whitelist
                if is_first_user:
                    allowed_email = AllowedEmail(
                        email=email,
                        added_by_admin_id=user.user_id
                    )
                    db.add(allowed_email)
                    db.commit()
                    print(f"First user email {email} added to whitelist.")

            else:
                print(f"User found with email: {email}")

        except Exception as e:
            print(f"Error getting or creating user: {str(e)}")
            db.rollback() # Rollback the transaction in case of error
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing user data"
            )


        # Create access token
        try:
            access_token_expires = timedelta(minutes=30)
            access_token = create_access_token(
                data={"sub": email},
                expires_delta=access_token_expires
            )
            print("Access token created successfully.")
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
