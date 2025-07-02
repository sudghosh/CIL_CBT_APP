"""
Simple script to add A4F to the APIKeyType enum
"""
import psycopg2
import os

def add_a4f_enum_value():
    try:
        # Connect to database
        conn = psycopg2.connect(
            host='postgres',
            port=5432,
            database='cil_cbt_db',
            user='cildb',
            password='cildb123'
        )
        
        cur = conn.cursor()
        
        # Check if 'a4f' value already exists
        cur.execute("SELECT unnest(enum_range(NULL::apikeytype))")
        current_values = [row[0] for row in cur.fetchall()]
        print(f"Current enum values: {current_values}")
        
        if 'a4f' not in current_values:
            # Add the new enum value
            cur.execute("ALTER TYPE apikeytype ADD VALUE 'a4f'")
            conn.commit()
            print("Successfully added 'a4f' to apikeytype enum")
        else:
            print("'a4f' value already exists in apikeytype enum")
            
        # Verify the change
        cur.execute("SELECT unnest(enum_range(NULL::apikeytype))")
        updated_values = [row[0] for row in cur.fetchall()]
        print(f"Updated enum values: {updated_values}")
        
        cur.close()
        conn.close()
        print("Database connection closed successfully")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_a4f_enum_value()
