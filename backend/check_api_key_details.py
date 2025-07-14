from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from src.database.models import APIKey, APIKeyType

DATABASE_URL = os.environ.get('DATABASE_URL')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = Session()

try:
    # Get all configured API keys
    keys = db.query(APIKey).all()
    print(f"Total API keys found: {len(keys)}")
    
    # Check each key type
    for key_type in APIKeyType:
        key = db.query(APIKey).filter(APIKey.key_type == key_type).first()
        status = "Configured" if key else "Not configured"
        if key:
            # Print first 5 chars of the key to verify it's not empty
            decrypted_key = key.encrypted_key
            prefix = decrypted_key[:5] + "..." if decrypted_key else "None"
            print(f"{key_type.value}: {status} (Key prefix: {prefix})")
        else:
            print(f"{key_type.value}: {status}")
            
    # Check key for OpenRouter specifically
    openrouter_key = db.query(APIKey).filter(APIKey.key_type == APIKeyType.OPENROUTER).first()
    if openrouter_key:
        key_value = openrouter_key.encrypted_key
        key_length = len(key_value) if key_value else 0
        print(f"\nOpenRouter key length: {key_length}")
        print(f"OpenRouter key value type: {type(key_value)}")
        if key_length > 0:
            print(f"OpenRouter key first 10 chars: {key_value[:10]}...")
        
except Exception as e:
    print(f"Error accessing API keys: {e}")
finally:
    db.close()
