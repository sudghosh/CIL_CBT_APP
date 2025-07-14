from sqlalchemy import create_engine, text
import os

# Get database URL from environment in the container
DATABASE_URL = os.environ.get('DATABASE_URL')
print(f"Using database URL: {DATABASE_URL.split('@')[0].split('://')[0]}://*****@{DATABASE_URL.split('@')[1]}")

# Run the migration
print("Starting migration to add max_questions column to test_attempts table")

try:
    # Connect to the database
    engine = create_engine(DATABASE_URL)
    
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
        else:
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
            
    print("Migration completed successfully!")
            
except Exception as e:
    print(f"Error during migration: {e}")
    exit(1)
