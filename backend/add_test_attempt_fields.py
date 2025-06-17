"""
Migration Script for Adding Missing Fields to TestAttempt Table

This script adds the 'test_type' and 'total_allotted_duration_minutes' columns
to the 'test_attempts' table to fix the 500 error in the "/tests/start" endpoint.

Usage:
1. Copy this file to your backend directory
2. Run this script inside the Docker container:
   docker exec -it cil_cbt_app-backend-1 python /app/add_test_attempt_fields.py

For more details, see the documentation in README_TROUBLESHOOTING.md
"""

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment variables or use default"""
    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
    db_host = os.getenv("POSTGRES_HOST", "postgres")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "cil_cbt_db")
    
    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

def run_migration():
    """Execute the migration to add the missing columns"""
    db_url = get_database_url()
    logger.info(f"Connecting to database at {db_url.replace(db_url.split('@')[0], '***:***')}")
    
    try:
        engine = create_engine(db_url)
        conn = engine.connect()
        
        # Check if columns already exist
        check_sql = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'test_attempts'
        AND column_name IN ('test_type', 'total_allotted_duration_minutes');
        """
        
        result = conn.execute(text(check_sql))
        existing_columns = [row[0] for row in result]
        
        # Add test_type column if it doesn't exist
        if 'test_type' not in existing_columns:
            logger.info("Adding 'test_type' column to test_attempts table...")
            conn.execute(text("""
                ALTER TABLE test_attempts
                ADD COLUMN test_type VARCHAR;
            """))
            
            # Populate test_type from TestTemplate (join)
            conn.execute(text("""
                UPDATE test_attempts
                SET test_type = tt.test_type
                FROM test_templates tt
                WHERE test_attempts.test_template_id = tt.template_id;
            """))
            logger.info("'test_type' column added and populated successfully.")
        else:
            logger.info("'test_type' column already exists.")
            
        # Add total_allotted_duration_minutes if it doesn't exist
        if 'total_allotted_duration_minutes' not in existing_columns:
            logger.info("Adding 'total_allotted_duration_minutes' column to test_attempts table...")
            conn.execute(text("""
                ALTER TABLE test_attempts
                ADD COLUMN total_allotted_duration_minutes INTEGER;
            """))
            
            # Populate total_allotted_duration_minutes from duration_minutes
            conn.execute(text("""
                UPDATE test_attempts
                SET total_allotted_duration_minutes = duration_minutes;
            """))
            logger.info("'total_allotted_duration_minutes' column added and populated successfully.")
        else:
            logger.info("'total_allotted_duration_minutes' column already exists.")
            
        conn.commit()
        logger.info("Migration completed successfully!")
        
    except SQLAlchemyError as e:
        logger.error(f"Database error occurred: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise
    finally:
        conn.close()
        engine.dispose()

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        exit(1)
