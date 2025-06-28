#!/usr/bin/env python3
"""
Script to check current database schema and migration status.
This script connects to the database and examines the current state.
"""

import asyncio
import sys
import os
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Database connection settings for Docker environment
# Try multiple possible database URLs
DATABASE_URLS = [
    "postgresql://cildb:cildb123@cil_hr_postgres:5432/cil_cbt_test",
    "postgresql://cildb:cildb123@postgres:5432/cil_cbt_test",
    "postgresql://cildb:cildb123@cil_cbt_app-postgres-1:5432/cil_cbt_db",
    "postgresql://postgres:postgres@cil_hr_postgres:5432/cil_cbt_test",
]

async def check_database_schema():
    """Check the current database schema and migration status."""
    connected_url = None
    engine = None
    
    # Try to connect with different database URLs
    for DATABASE_URL in DATABASE_URLS:
        try:
            print(f"Trying to connect to: {DATABASE_URL}")
            engine = create_engine(DATABASE_URL.replace('+asyncpg', ''))
            # Test the connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            connected_url = DATABASE_URL
            print(f"✅ Successfully connected!")
            break
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            if engine:
                engine.dispose()
            engine = None
            continue
    
    if not engine:
        print("❌ Could not connect to any database")
        return False
    
    try:
        inspector = inspect(engine)
        
        print("\n=== DATABASE SCHEMA CHECK ===")
        print(f"Connected to: {connected_url}")
        print()
        
        # Check if alembic_version table exists (indicates migration system is set up)
        tables = inspector.get_table_names()
        print(f"Total tables found: {len(tables)}")
        print("Tables:")
        for table in sorted(tables):
            print(f"  - {table}")
        print()
        
        # Check migration version if alembic_version table exists
        if 'alembic_version' in tables:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT version_num FROM alembic_version;"))
                version = result.fetchone()
                if version:
                    print(f"Current migration version: {version[0]}")
                else:
                    print("No migration version found in alembic_version table")
        else:
            print("No alembic_version table found - migrations may not be initialized")
        print()
        
        # Check questions table schema
        if 'questions' in tables:
            columns = inspector.get_columns('questions')
            print("QUESTIONS table schema:")
            difficulty_related = []
            for col in columns:
                print(f"  - {col['name']}: {col['type']} (nullable: {col['nullable']})")
                if 'difficulty' in col['name'].lower():
                    difficulty_related.append(col['name'])
            
            print()
            print(f"Difficulty-related columns found: {difficulty_related}")
            
            # Check if numeric_difficulty column exists
            if 'numeric_difficulty' in difficulty_related:
                print("✅ numeric_difficulty column exists")
            else:
                print("❌ numeric_difficulty column NOT found")
        else:
            print("❌ questions table NOT found")
        print()
        
        # Check user_question_difficulty table
        if 'user_question_difficulty' in tables:
            print("✅ user_question_difficulty table exists")
            columns = inspector.get_columns('user_question_difficulty')
            print("USER_QUESTION_DIFFICULTY table schema:")
            for col in columns:
                print(f"  - {col['name']}: {col['type']} (nullable: {col['nullable']})")
        else:
            print("❌ user_question_difficulty table NOT found")
        print()
        
        # Check for any foreign key constraints
        if 'user_question_difficulty' in tables:
            fks = inspector.get_foreign_keys('user_question_difficulty')
            print("Foreign key constraints in user_question_difficulty:")
            for fk in fks:
                print(f"  - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        
        engine.dispose()
        print("\n=== SCHEMA CHECK COMPLETE ===")
        
    except Exception as e:
        print(f"Error checking database schema: {e}")
        return False
    
    return True

if __name__ == "__main__":
    asyncio.run(check_database_schema())
