import psycopg2

# Connect to the database
try:
    conn = psycopg2.connect(
        host="localhost", 
        database="cil_cbt_db", 
        user="cildb", 
        password="cildb123",
        port=5432
    )
    
    # Create a cursor
    cur = conn.cursor()
    
    try:
        # Add difficulty_level to Question if it doesn't exist
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='questions' 
                    AND column_name='difficulty_level'
                ) THEN
                    ALTER TABLE questions 
                    ADD COLUMN difficulty_level VARCHAR(20) NOT NULL DEFAULT 'Medium';
                    
                    RAISE NOTICE 'Added difficulty_level column to questions table';
                END IF;
            END $$;
        """)
        
        # Add adaptive_strategy_chosen and current_question_index to TestAttempt if they don't exist
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='test_attempts' 
                    AND column_name='adaptive_strategy_chosen'
                ) THEN
                    ALTER TABLE test_attempts 
                    ADD COLUMN adaptive_strategy_chosen VARCHAR(50) NULL;
                    
                    RAISE NOTICE 'Added adaptive_strategy_chosen column to test_attempts table';
                END IF;
                
                IF NOT EXISTS (
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='test_attempts' 
                    AND column_name='current_question_index'
                ) THEN
                    ALTER TABLE test_attempts 
                    ADD COLUMN current_question_index INTEGER NOT NULL DEFAULT 0;
                    
                    RAISE NOTICE 'Added current_question_index column to test_attempts table';
                END IF;
            END $$;
        """)
        
        # Commit the transaction
        conn.commit()
        print('Migration completed successfully!')
        
    except Exception as e:
        # Roll back in case of error
        conn.rollback()
        print(f"Error executing migration: {e}")
    
    # Close the connection
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Database connection error: {e}")
