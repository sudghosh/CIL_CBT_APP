#!/usr/bin/env python3
"""
Performance Data Update Utility - Docker Version

This script updates performance summary data for all existing test attempts.
Run this to populate the performance dashboard with real data.
"""

import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database.models import TestAttempt
from src.tasks.performance_aggregator import performance_aggregation_task

# Database connection - use internal Docker network
DATABASE_URL = "postgresql://cildb:cildb123@cil_hr_postgres:5432/cil_cbt_db"

async def main():
    """Update performance data for all existing test attempts"""
    print("🔄 Starting performance data update...")
    
    # Create database connection
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    try:
        # Get all test attempts
        attempts = db.query(TestAttempt).all()
        print(f"📊 Found {len(attempts)} test attempts to process")
        
        if not attempts:
            print("⚠️  No test attempts found in database")
            return
        
        # Process each attempt
        for i, attempt in enumerate(attempts, 1):
            print(f"🔄 Processing attempt {i}/{len(attempts)}: ID {attempt.attempt_id} (User: {attempt.user_id})")
            
            try:
                await performance_aggregation_task(attempt.attempt_id, db)
                db.commit()
                print(f"✅ Successfully processed attempt {attempt.attempt_id}")
            except Exception as e:
                print(f"❌ Error processing attempt {attempt.attempt_id}: {str(e)}")
                db.rollback()
                continue
        
        print("🎉 Performance data update completed!")
        
    except Exception as e:
        print(f"❌ Error during performance update: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
