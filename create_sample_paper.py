"""
Script to create a sample paper with ID 1 for testing purposes.
This resolves the foreign key constraint issue when uploading sample questions.
"""
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
import os
import sys
import datetime

# Add the backend directory to Python path if not already there
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

try:
    from src.models import Paper
    from src.database import Base, engine, SessionLocal
except ImportError:
    print("Error: Could not import the required modules from the backend.")
    print("Make sure you're running this script from the root directory of the CIL_CBT_App.")
    sys.exit(1)

def create_sample_paper():
    """Create a sample paper with ID 1 if it doesn't exist"""
    db = SessionLocal()
    try:
        # Check if paper with ID 1 exists
        paper = db.query(Paper).filter(Paper.paper_id == 1).first()
        
        if not paper:
            print("Creating sample paper with ID 1...")
            # Create a sample paper
            sample_paper = Paper(
                paper_id=1,  # Force ID to be 1
                title="Sample Test Paper",
                description="This is a sample paper for testing question uploads",
                time_limit_minutes=60,
                passing_percentage=60,
                is_active=True,
                created_by_user_id=1,  # Assuming admin user has ID 1
                created_at=datetime.datetime.now(),
                updated_at=datetime.datetime.now()
            )
            db.add(sample_paper)
            db.commit()
            print("Sample paper created successfully!")
        else:
            print("Paper with ID 1 already exists.")
            
    except Exception as e:
        db.rollback()
        print(f"Error creating sample paper: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_paper()
