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
    
    # Check for difficulty_level column in questions table
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='questions' 
        AND column_name='difficulty_level'
    """)
    result = cur.fetchone()
    print('Difficulty level column exists in questions table:', result is not None)
    
    # Check for adaptive_strategy_chosen column in test_attempts table
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='test_attempts' 
        AND column_name='adaptive_strategy_chosen'
    """)
    result = cur.fetchone()
    print('Adaptive strategy column exists in test_attempts table:', result is not None)
    
    # Check for user_performance_profiles table
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name='user_performance_profiles'
    """)
    result = cur.fetchone()
    print('user_performance_profiles table exists:', result is not None)
    
    # Close the connection
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Database connection error: {e}")
