from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..database.models import User, AllowedEmail

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # Extended to 8 hours from 30 minutes

oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl="https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl="https://oauth2.googleapis.com/token"
)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Verify and validate a JWT token for authentication.
    
    This function:
    1. Decodes and validates the JWT token
    2. Extracts claims (email, role, user_id)
    3. Verifies the user exists in the database
    4. Ensures the user account is active
    5. Verifies role consistency between token and database
    
    Returns the authenticated User object if successful.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Log the token validation attempt
    print(f"Token verification started at {datetime.utcnow()}")
    
    try:
        # Handle possible token format issues
        if not token or token.count('.') != 2:
            print("Invalid token format - not enough segments")
            raise credentials_exception
            
        # Decode and validate the token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError as e:
            print(f"JWT error during token verification: {str(e)}")
            raise credentials_exception
        
        # Extract claims from payload
        email: str = payload.get("sub")
        user_role: str = payload.get("role")
        user_id: int = payload.get("user_id")
        
        # Basic validation of required claims
        if email is None:
            print("Token missing 'sub' claim (email)")
            raise credentials_exception
            
        print(f"Token verification successful for email: {email}")
        
    except JWTError as e:
        print(f"JWT error during token verification: {str(e)}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error during token verification: {str(e)}")
        raise credentials_exception
    
    try:
        # Verify user exists in database
        user = db.query(User).filter(User.email == email).first()
        
        # Handle invalid user
        if user is None:
            print(f"User not found in database: {email}")
            raise credentials_exception
            
        # Check if user account is active
        if not user.is_active:
            print(f"Inactive user attempted access: {email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is inactive"
            )
            
        # Ensure token role matches database role if role changed since token was issued
        if user_role != user.role:
            # The role in the database is the source of truth
            print(f"Warning: Token role ({user_role}) doesn't match database role ({user.role}) for user {email}")
            # We could either reject the token or update the user's role in memory
            # For now, we accept the token but use the database role
        
        print(f"User authenticated successfully: {email}, role: {user.role}")
        return user
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"Database error during user verification: {str(e)}")
        raise credentials_exception

def verify_admin(current_user: User = Depends(verify_token)):
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def check_email_whitelist(email: str, db: Session) -> bool:
    allowed_email = db.query(AllowedEmail).filter(AllowedEmail.email == email).first()
    return allowed_email is not None

def verify_premium(current_user: User = Depends(verify_token)):
    """
    Verify that a user can access premium visualization features.
    
    Note: This function doesn't restrict access to premium features as 
    the 'premium' aspect refers to enhanced visualizations available to all users,
    not paid/restricted features.
    """
    # All users can access premium visualizations
    return True
