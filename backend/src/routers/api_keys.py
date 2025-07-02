"""
API Key Management Endpoints (Admin Only)
-----------------------------------------
Provides secure CRUD endpoints for managing encrypted API keys.
Only accessible to admin users. Uses SQLAlchemy models and Fernet encryption.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime
from ..database import get_db
from ..database.models import APIKey, APIKeyType, User
from ..auth.auth import verify_admin

router = APIRouter(
    prefix="/admin/api-keys",
    tags=["API Keys (Admin)"]
)

# --- Pydantic Schemas ---

class APIKeyBase(BaseModel):
    key_type: APIKeyType
    description: Optional[str] = None

class APIKeyCreate(APIKeyBase):
    key: str = Field(..., min_length=1)

class APIKeyUpdate(BaseModel):
    key: Optional[str] = None
    description: Optional[str] = None

class APIKeyOut(APIKeyBase):
    id: int
    created_by_admin_id: int
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
    
    @validator('created_at', 'updated_at', pre=True)
    def datetime_to_str(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v

class APIKeyValue(BaseModel):
    key: str

# --- OPTIONS Handlers for CORS ---

@router.options("/", include_in_schema=False)
async def options_api_keys():
    """Handle OPTIONS requests for CORS preflight for API keys list/create endpoints"""
    return {}

@router.options("/{key_id}", include_in_schema=False)
async def options_api_key_by_id():
    """Handle OPTIONS requests for specific API key endpoints"""
    return {}

@router.options("/{key_id}/key", include_in_schema=False)
async def options_api_key_value():
    """Handle OPTIONS requests for API key value endpoints"""
    return {}

@router.options("/type/{key_type}/key", include_in_schema=False)
async def options_api_key_by_type():
    """Handle OPTIONS requests for API key by type endpoints"""
    return {}

# --- CRUD Endpoints ---

@router.get("/", response_model=List[APIKeyOut])
def list_api_keys(db: Session = Depends(get_db), admin: User = Depends(verify_admin)):
    return db.query(APIKey).all()

@router.post("/", response_model=APIKeyOut, status_code=status.HTTP_201_CREATED)
def create_api_key(data: APIKeyCreate, db: Session = Depends(get_db), admin: User = Depends(verify_admin)):
    # Only one key per type (enforced by unique constraint)
    if db.query(APIKey).filter_by(key_type=data.key_type).first():
        raise HTTPException(status_code=400, detail="API key for this type already exists.")
    api_key = APIKey(
        key_type=data.key_type,
        encrypted_key=data.key,
        description=data.description,
        created_by_admin_id=admin.user_id
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key

@router.get("/{key_id}", response_model=APIKeyOut)
def get_api_key(key_id: int, db: Session = Depends(get_db), admin: User = Depends(verify_admin)):
    api_key = db.query(APIKey).filter_by(id=key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found.")
    return api_key

@router.put("/{key_id}", response_model=APIKeyOut)
def update_api_key(key_id: int, data: APIKeyUpdate, db: Session = Depends(get_db), admin: User = Depends(verify_admin)):
    api_key = db.query(APIKey).filter_by(id=key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found.")
    if data.key is not None:
        api_key.encrypted_key = data.key
    if data.description is not None:
        api_key.description = data.description
    db.commit()
    db.refresh(api_key)
    return api_key

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api_key(key_id: int, db: Session = Depends(get_db), admin: User = Depends(verify_admin)):
    api_key = db.query(APIKey).filter_by(id=key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found.")
    db.delete(api_key)
    db.commit()
    return None

@router.get("/{key_id}/key", response_model=APIKeyValue)
def get_api_key_value(key_id: int, db: Session = Depends(get_db), admin: User = Depends(verify_admin)):
    """Retrieve the decrypted API key value for actual use."""
    api_key = db.query(APIKey).filter_by(id=key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found.")
    
    # Return the decrypted key
    decrypted_key = api_key.encrypted_key  # This will be automatically decrypted by the EncryptedField
    return APIKeyValue(key=decrypted_key)

@router.get("/type/{key_type}/key", response_model=APIKeyValue)
def get_api_key_by_type(key_type: APIKeyType, db: Session = Depends(get_db), admin: User = Depends(verify_admin)):
    """Retrieve the decrypted API key value by type for actual use."""
    api_key = db.query(APIKey).filter_by(key_type=key_type).first()
    if not api_key:
        raise HTTPException(status_code=404, detail=f"No API key found for type: {key_type}")
    
    # Return the decrypted key
    decrypted_key = api_key.encrypted_key  # This will be automatically decrypted by the EncryptedField
    return APIKeyValue(key=decrypted_key)
