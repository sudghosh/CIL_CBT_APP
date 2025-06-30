"""
Update calibration status for existing users based on new threshold.

This script updates the calibration status for existing user-question pairs
to use the new, more practical threshold of 3 attempts instead of 5.
"""

import os
import sys
import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

# Import models
from src.database.models import UserQuestionDifficulty

# Database connection
DATABASE_URL = "postgresql://cildb:cildb@cil_hr_postgres:5432/cil_cbt_db"

def update_calibration_status():
    """Update calibration status for existing user-question pairs."""
    
    print("🔄 Starting calibration status update...")
    
    # Create database connection
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    try:
        # Get all user-question pairs that should be calibrated with new threshold
        # (attempts >= 3 but still marked as calibrating)
        candidates = db.query(UserQuestionDifficulty).filter(
            UserQuestionDifficulty.attempts >= 3,
            UserQuestionDifficulty.is_calibrating == True
        ).all()
        
        print(f"📊 Found {len(candidates)} user-question pairs that need calibration status update")
        
        if not candidates:
            print("✅ No updates needed - all calibration statuses are already correct")
            return
        
        # Update each candidate
        updated_count = 0
        for candidate in candidates:
            candidate.is_calibrating = False
            updated_count += 1
            print(f"✅ Updated calibration for user {candidate.user_id}, question {candidate.question_id} (attempts: {candidate.attempts})")
        
        # Commit all changes
        db.commit()
        print(f"🎉 Successfully updated calibration status for {updated_count} user-question pairs!")
        
        # Show summary of calibration status by user
        print("\n📈 Updated calibration summary by user:")
        result = db.execute(text("""
            SELECT 
                user_id,
                COUNT(*) as total_questions,
                COUNT(CASE WHEN is_calibrating = false THEN 1 END) as calibrated_questions,
                (COUNT(*) >= 8 AND COUNT(CASE WHEN is_calibrating = false THEN 1 END) >= 3) as is_calibrated
            FROM user_question_difficulties 
            GROUP BY user_id 
            ORDER BY user_id
        """))
        
        for row in result:
            status = "✅ CALIBRATED" if row.is_calibrated else "🔄 CALIBRATING"
            print(f"  User {row.user_id}: {row.calibrated_questions}/{row.total_questions} questions calibrated - {status}")
        
    except Exception as e:
        print(f"❌ Error during calibration update: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_calibration_status()
