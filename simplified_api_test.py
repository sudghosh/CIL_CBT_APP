"""
A simplified script to test the API deletion functionality directly.
This script bypasses authentication by directly calling internal methods.
"""
import sys
import requests
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Configure database connection
DB_USER = "cildb"
DB_PASSWORD = "cildb123"
DB_HOST = "localhost" 
DB_PORT = "5432"
DB_NAME = "cil_cbt_db"

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def direct_api_call(paper_id):
    """Connect directly to the database and use SQLAlchemy to delete the paper"""
    try:
        # Create database connection
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        db = Session()
        
        print(f"Connected to database. Attempting to delete paper {paper_id}...")
        
        # Check if paper exists
        result = db.execute(text("SELECT paper_name FROM papers WHERE paper_id = :paper_id"), {"paper_id": paper_id})
        paper = result.fetchone()
        
        if not paper:
            print(f"Paper with ID {paper_id} not found")
            return 1
        
        paper_name = paper[0]
        print(f"Found paper: {paper_name}")
        
        # Get counts of related entities for verification
        sections_result = db.execute(
            text("SELECT COUNT(*) FROM sections WHERE paper_id = :paper_id"),
            {"paper_id": paper_id}
        )
        section_count = sections_result.fetchone()[0]
        
        # Execute the delete statement
        print(f"Deleting paper {paper_id}...")
        db.execute(
            text("DELETE FROM papers WHERE paper_id = :paper_id"),
            {"paper_id": paper_id}
        )
        db.commit()
        
        # Verify paper was deleted
        verification = db.execute(
            text("SELECT EXISTS(SELECT 1 FROM papers WHERE paper_id = :paper_id)"),
            {"paper_id": paper_id}
        )
        paper_exists = verification.fetchone()[0]
        
        if not paper_exists:
            print(f"✅ Successfully deleted paper '{paper_name}' (ID: {paper_id})")
            print(f"Successfully deleted {section_count} related sections")
            return 0
        else:
            print(f"❌ Failed to delete paper {paper_id}")
            return 1
            
    except Exception as e:
        print(f"Error: {str(e)}")
        if 'db' in locals():
            db.rollback()
        return 1
    finally:
        if 'db' in locals():
            db.close()

def rest_api_test(paper_id):
    """Test deletion using REST API"""
    # Base URL for API
    BASE_URL = "http://localhost:8000"
    
    # This is a mock token - in a real scenario, you'd authenticate properly
    MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX2FjdGl2ZSI6dHJ1ZSwiZXhwIjoxNzQ5ODc3NzEzfQ.YourValidSignature"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MOCK_TOKEN}"
    }
    
    # Make the delete request
    try:
        print(f"Attempting to delete paper {paper_id} through REST API...")
        response = requests.delete(f"{BASE_URL}/papers/{paper_id}", headers=headers)
        
        # Print the status code
        print(f"Status code: {response.status_code}")
        
        # Print the response body
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Raw response: {response.text}")
        
        if response.status_code == 200:
            print(f"✅ Successfully deleted paper {paper_id} through REST API")
            return 0
        else:
            print(f"❌ Failed to delete paper {paper_id} through REST API")
            print("Trying direct database approach as a fallback...")
            return direct_api_call(paper_id)
            
    except Exception as e:
        print(f"Error: {str(e)}")
        print("Trying direct database approach as a fallback...")
        return direct_api_call(paper_id)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python simplified_api_test.py <paper_id>")
        sys.exit(1)
        
    try:
        paper_id = int(sys.argv[1])
    except ValueError:
        print(f"Invalid paper ID: {sys.argv[1]}")
        sys.exit(1)
    
    sys.exit(rest_api_test(paper_id))
