from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_***REMOVED*** = os.getenv(
    "***REMOVED***",
    "postgresql://postgres:postgres@localhost:5432/cil_cbt"
)

engine = create_engine(SQLALCHEMY_***REMOVED***)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
