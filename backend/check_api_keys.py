from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database.models import APIKey, APIKeyType
import os

DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = Session()

try:
    keys = db.query(APIKey).all()
    print(f"Total API keys found: {len(keys)}")
    for key_type in APIKeyType:
        key = db.query(APIKey).filter(APIKey.key_type == key_type).first()
        print(f"{key_type.value}: {'Configured' if key else 'Not configured'}")
finally:
    db.close()
