"""
Migration script to add the max_questions column to the test_attempts table
"""

import sys
import os
from sqlalchemy import create_engine, Column, Integer, MetaData, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import text

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not found, using environment variables directly")

# Database configuration - Read directly from .env file
DATABASE_URL = os.environ.get("DATABASE_URL")

# If DATABASE_URL not found in environment, use default values
if not DATABASE_URL:
    try:
        # Read from .env file
        with open('.env', 'r') as f:
            for line in f:
                if line.strip().startswith('DATABASE_URL='):
                    DATABASE_URL = line.strip().split('=', 1)[1]
                    print(f"Found DATABASE_URL in .env file")
                    break
    except Exception as e:
        print(f"Error reading .env file: {e}")
        
    # If still not found, use default values
    if not DATABASE_URL:
        print("WARNING: DATABASE_URL not found in environment or .env file. Using default values.")
        DB_USER = "postgres"
        DB_PASSWORD = "postgres"
        DB_HOST = "localhost"
        DB_PORT = "5432"
        DB_NAME = "cil_cbt_db"
        DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"Using database URL: {DATABASE_URL.split('@')[0].split('://')[0]}://*****@{DATABASE_URL.split('@')[1]}")

def run_migration():
    """Run the migration to add the max_questions column to test_attempts table"""
    print("Starting migration to add max_questions column to test_attempts table")
    
    try:
        # Connect to the database
        engine = create_engine(DATABASE_URL)
        metadata = MetaData()
        
        # Check if the column already exists
        with engine.connect() as connection:
            # Check if column exists
            check_column_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'test_attempts' 
                  AND column_name = 'max_questions';
            """)
            
            result = connection.execute(check_column_query)
            column_exists = result.fetchone() is not None
            
            if column_exists:
                print("Column max_questions already exists in test_attempts table. No changes needed.")
                return
            
            # Add the column
            print("Adding max_questions column to test_attempts table...")
            add_column_query = text("""
                ALTER TABLE test_attempts
                ADD COLUMN max_questions INTEGER;
            """)
            
            connection.execute(add_column_query)
            
            # Add comment to describe the column's purpose
            comment_query = text("""
                COMMENT ON COLUMN test_attempts.max_questions 
                IS 'Maximum number of questions for adaptive tests';
            """)
            
            connection.execute(comment_query)
            
            print("Successfully added max_questions column to test_attempts table")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
    print("Migration completed successfully!")
