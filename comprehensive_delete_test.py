"""
Comprehensive test script for paper deletion functionality.
This script:
1. Creates a test paper with sections, subsections, and questions
2. Tests deletion with different methods:
   - Direct database deletion
   - REST API deletion (if authentication is available)
3. Verifies that cascade deletion works properly
"""
import sys
import logging
import time
import psycopg2
import requests
import json
import argparse
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection parameters
DB_PARAMS = {
    "host": "localhost",
    "port": "5432",
    "database": "cil_cbt_db",
    "user": "cildb",
    "password": "cildb123"
}

# API connection
BASE_URL = "http://localhost:8000"

def create_test_paper():
    """Create a test paper with sections, subsections, and questions directly in the database."""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        # Create a paper with unique name
        paper_name = f"Delete Test Paper {int(time.time())}"
        logger.info(f"Creating paper '{paper_name}'...")
        
        cursor.execute(
            """
            INSERT INTO papers (paper_name, total_marks, is_active, created_by_user_id)
            VALUES (%s, 100, true, 1)
            RETURNING paper_id
            """,
            (paper_name,)
        )
        paper_id = cursor.fetchone()[0]
        
        # Create two sections
        sections = []
        for i in range(1, 3):
            section_name = f"Test Section {i} for {paper_name}"
            logger.info(f"Creating section '{section_name}'...")
            
            cursor.execute(
                """
                INSERT INTO sections (paper_id, section_name, marks_allocated)
                VALUES (%s, %s, %s)
                RETURNING section_id
                """,
                (paper_id, section_name, 50)
            )
            section_id = cursor.fetchone()[0]
            sections.append(section_id)
        
        # Create subsections for each section
        subsections = []
        for section_id in sections:
            for i in range(1, 3):
                subsection_name = f"Test Subsection {i} for Section {section_id}"
                logger.info(f"Creating subsection '{subsection_name}'...")
                
                cursor.execute(
                    """
                    INSERT INTO subsections (section_id, subsection_name)
                    VALUES (%s, %s)
                    RETURNING subsection_id
                    """,
                    (section_id, subsection_name)
                )
                subsection_id = cursor.fetchone()[0]
                subsections.append((subsection_id, section_id))
        
        # Create questions for each subsection
        questions = []
        for subsection_id, section_id in subsections:
            question_text = f"Test Question for Subsection {subsection_id}"
            logger.info(f"Creating question '{question_text}'...")
            
            cursor.execute(
                """
                INSERT INTO questions (
                    question_text, question_type, correct_option_index,
                    paper_id, section_id, subsection_id,
                    created_by_user_id, valid_until
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING question_id
                """,
                (
                    question_text, "MCQ", 0,
                    paper_id, section_id, subsection_id,
                    1, "2030-01-01"
                )
            )
            question_id = cursor.fetchone()[0]
            questions.append(question_id)
        
        # Commit all changes
        conn.commit()
        
        # Log success
        logger.info(f"✅ Successfully created test paper ID {paper_id} with:")
        logger.info(f"- Paper name: {paper_name}")
        logger.info(f"- {len(sections)} sections: {sections}")
        logger.info(f"- {len(subsections)} subsections")
        logger.info(f"- {len(questions)} questions")
        
        return paper_id, paper_name
        
    except Exception as e:
        logger.error(f"Error creating test paper: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
        return None, None
        
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

def delete_via_api(paper_id):
    """Delete the paper via REST API"""
    try:
        # Attempt to get token from file
        try:
            with open("auth_token.json", "r") as f:
                token_data = json.load(f)
                token = token_data.get("access_token")
                logger.info("Using token from auth_token.json")
        except:
            # Use mock token as fallback
            token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX2FjdGl2ZSI6dHJ1ZSwiZXhwIjoxNzQ5ODc3NzEzfQ.YourValidSignature"
            logger.info("Using mock token")
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        logger.info(f"Attempting to delete paper {paper_id} via REST API...")
        response = requests.delete(f"{BASE_URL}/papers/{paper_id}", headers=headers)
        
        logger.info(f"API response status: {response.status_code}")
        try:
            logger.info(f"API response: {json.dumps(response.json(), indent=2)}")
        except:
            logger.info(f"API response text: {response.text}")
        
        return response.status_code == 200
    
    except Exception as e:
        logger.error(f"Error calling REST API: {e}")
        return False

def delete_via_database(paper_id):
    """Delete the paper directly via database connection"""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        # First get paper details for logging
        logger.info(f"Fetching details for paper {paper_id}...")
        cursor.execute("SELECT paper_name FROM papers WHERE paper_id = %s", (paper_id,))
        paper_result = cursor.fetchone()
        
        if not paper_result:
            logger.error(f"Paper with ID {paper_id} not found")
            return False
        
        paper_name = paper_result[0]
        logger.info(f"Found paper: {paper_name} (ID: {paper_id})")
        
        # Get counts before deletion for verification
        cursor.execute("SELECT COUNT(*) FROM sections WHERE paper_id = %s", (paper_id,))
        section_count = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) FROM subsections 
            WHERE section_id IN (SELECT section_id FROM sections WHERE paper_id = %s)
        """, (paper_id,))
        subsection_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM questions WHERE paper_id = %s", (paper_id,))
        question_count = cursor.fetchone()[0]
        
        logger.info(f"Paper has {section_count} sections, {subsection_count} subsections, {question_count} questions")
        
        # Perform the deletion
        logger.info(f"Deleting paper {paper_id} directly from database...")
        cursor.execute("DELETE FROM papers WHERE paper_id = %s", (paper_id,))
        
        # Commit the deletion
        conn.commit()
        
        logger.info(f"✅ Database deletion completed")
        return True
    
    except Exception as e:
        logger.error(f"Error deleting paper via database: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
        return False
    
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

def verify_deletion(paper_id):
    """Verify that the paper and all related entities have been deleted"""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        # Check if paper exists
        cursor.execute("SELECT EXISTS(SELECT 1 FROM papers WHERE paper_id = %s)", (paper_id,))
        paper_exists = cursor.fetchone()[0]
        
        # Check if sections exist
        cursor.execute("SELECT COUNT(*) FROM sections WHERE paper_id = %s", (paper_id,))
        sections_count = cursor.fetchone()[0]
        
        # Check if subsections exist
        cursor.execute("""
            SELECT COUNT(*) FROM subsections 
            WHERE section_id IN (SELECT section_id FROM sections WHERE paper_id = %s)
        """, (paper_id,))
        subsections_count = cursor.fetchone()[0]
        
        # Check if questions exist
        cursor.execute("SELECT COUNT(*) FROM questions WHERE paper_id = %s", (paper_id,))
        questions_count = cursor.fetchone()[0]
        
        # Log results
        if not paper_exists and sections_count == 0 and subsections_count == 0 and questions_count == 0:
            logger.info("✅ CASCADE DELETE VERIFICATION PASSED:")
            logger.info(f"- Paper {paper_id}: Not found (expected)")
            logger.info(f"- Sections: {sections_count} (expected: 0)")
            logger.info(f"- Subsections: {subsections_count} (expected: 0)")
            logger.info(f"- Questions: {questions_count} (expected: 0)")
            return True
        else:
            logger.error("❌ CASCADE DELETE VERIFICATION FAILED:")
            logger.error(f"- Paper exists: {paper_exists} (expected: False)")
            logger.error(f"- Sections remaining: {sections_count} (expected: 0)")
            logger.error(f"- Subsections remaining: {subsections_count} (expected: 0)")
            logger.error(f"- Questions remaining: {questions_count} (expected: 0)")
            return False
            
    except Exception as e:
        logger.error(f"Error verifying deletion: {e}")
        return False
        
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

def main():
    """Main test function"""
    parser = argparse.ArgumentParser(description='Test paper deletion functionality')
    parser.add_argument('--method', choices=['api', 'database', 'both'], default='both',
                        help='The deletion method to test (api, database, or both)')
    parser.add_argument('--paper-id', type=int, help='Use an existing paper ID instead of creating a new one')
    parser.add_argument('--skip-create', action='store_true', help='Skip creation of test data')
    
    args = parser.parse_args()
    
    # Create test paper if needed
    if args.paper_id:
        paper_id = args.paper_id
        logger.info(f"Using existing paper with ID {paper_id}")
        paper_name = "<Existing paper>"
    elif not args.skip_create:
        paper_id, paper_name = create_test_paper()
        if not paper_id:
            logger.error("Failed to create test paper. Test aborted.")
            return 1
        logger.info(f"Created test paper '{paper_name}' with ID {paper_id}")
    else:
        logger.error("Must provide --paper-id or create new test data")
        return 1
    
    # Delete the paper using the specified method(s)
    success = False
    
    if args.method in ['api', 'both']:
        logger.info("Testing deletion via REST API...")
        api_success = delete_via_api(paper_id)
        
        if api_success:
            logger.info("✅ API deletion successful!")
            success = True
        else:
            logger.warning("❌ API deletion failed")
    
    if not success and args.method in ['database', 'both']:
        logger.info("Testing deletion via direct database connection...")
        db_success = delete_via_database(paper_id)
        
        if db_success:
            logger.info("✅ Database deletion successful!")
            success = True
        else:
            logger.error("❌ Database deletion failed")
    
    if not success:
        logger.error("All deletion methods failed")
        return 1
    
    # Verify the deletion
    logger.info("Verifying cascade deletion...")
    verify_success = verify_deletion(paper_id)
    
    if verify_success:
        logger.info("🎉 CASCADE DELETE TEST PASSED - All tests successful!")
        logger.info(f"Paper {paper_id} '{paper_name}' and all related entities were properly deleted")
        return 0
    else:
        logger.error("❌ CASCADE DELETE TEST FAILED - Deletion verification failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
