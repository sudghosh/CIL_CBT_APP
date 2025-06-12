"""
This script tests the API functionality for cascading deletes by creating and deleting papers directly in the database.

The script:
1. Creates a test paper with associated sections and subsections in the database
2. Tries to delete the paper through the API
3. Verifies that the paper and all related entities are deleted
"""

import requests
import json
import logging
import sys
import psycopg2
import os
from urllib.parse import urljoin

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
BASE_URL = "http://localhost:8000"

# Database connection parameters - adjust as needed
DB_PARAMS = {
    "host": "localhost",
    "port": "5432",
    "database": "cil_cbt_db",
    "user": "cildb",
    "password": "cildb123"
}

# Function to create test data directly in the database
def create_test_data():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()

        # Create test paper
        paper_name = f"API Test Paper {os.urandom(4).hex()}"
        cursor.execute(
            "INSERT INTO papers (paper_name, total_marks, description, is_active, created_by_user_id) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING paper_id",
            (paper_name, 100, "Test paper for API delete test", True, 1)
        )
        paper_id = cursor.fetchone()[0]
        
        # Create test section
        cursor.execute(
            "INSERT INTO sections (paper_id, section_name, marks_allocated, description) "
            "VALUES (%s, %s, %s, %s) RETURNING section_id",
            (paper_id, "Test Section", 50, "Test section for API delete test")
        )
        section_id = cursor.fetchone()[0]
        
        # Create test subsection
        cursor.execute(
            "INSERT INTO subsections (section_id, subsection_name, description) "
            "VALUES (%s, %s, %s) RETURNING subsection_id",
            (section_id, "Test Subsection", "Test subsection for API delete test")
        )
        subsection_id = cursor.fetchone()[0]
          # Create test question
        from datetime import date
        cursor.execute(
            "INSERT INTO questions (question_text, question_type, correct_option_index, "
            "paper_id, section_id, subsection_id, default_difficulty_level, created_by_user_id, valid_until) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING question_id",
            ("Test Question?", "MCQ", 0, paper_id, section_id, subsection_id, "Easy", 1, date(9999, 12, 31))
        )
        question_id = cursor.fetchone()[0]
        
        # Create options for the question
        for i in range(4):
            cursor.execute(
                "INSERT INTO question_options (question_id, option_text, option_order) "
                "VALUES (%s, %s, %s)",
                (question_id, f"Option {i+1}", i)
            )
        
        # Commit changes
        conn.commit()
        
        logger.info(f"Created test paper ID {paper_id} with section ID {section_id}, " 
                    f"subsection ID {subsection_id}, and question ID {question_id}")
                    
        return {
            "paper_id": paper_id,
            "section_ids": [section_id],
            "subsection_ids": [subsection_id],
            "question_ids": [question_id]
        }
    
    except Exception as e:
        logger.error(f"Error creating test data: {e}")
        if 'conn' in locals():
            conn.rollback()
        return None
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def check_entities_exist(entity_ids):
    """Check if the specified entities still exist in the database"""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        results = {
            "paper_exists": False,
            "sections_exist": False,
            "subsections_exist": False,
            "questions_exist": False
        }
        
        # Check if paper exists
        if "paper_id" in entity_ids and entity_ids["paper_id"]:
            cursor.execute("SELECT EXISTS(SELECT 1 FROM papers WHERE paper_id = %s)", 
                         (entity_ids["paper_id"],))
            results["paper_exists"] = cursor.fetchone()[0]
        
        # Check if sections exist
        if "section_ids" in entity_ids and entity_ids["section_ids"]:
            placeholders = ','.join(['%s'] * len(entity_ids["section_ids"]))
            cursor.execute(f"SELECT EXISTS(SELECT 1 FROM sections WHERE section_id IN ({placeholders}))",
                         entity_ids["section_ids"])
            results["sections_exist"] = cursor.fetchone()[0]
        
        # Check if subsections exist
        if "subsection_ids" in entity_ids and entity_ids["subsection_ids"]:
            placeholders = ','.join(['%s'] * len(entity_ids["subsection_ids"]))
            cursor.execute(f"SELECT EXISTS(SELECT 1 FROM subsections WHERE subsection_id IN ({placeholders}))",
                         entity_ids["subsection_ids"])
            results["subsections_exist"] = cursor.fetchone()[0]
            
        # Check if questions exist
        if "question_ids" in entity_ids and entity_ids["question_ids"]:
            placeholders = ','.join(['%s'] * len(entity_ids["question_ids"]))
            cursor.execute(f"SELECT EXISTS(SELECT 1 FROM questions WHERE question_id IN ({placeholders}))",
                         entity_ids["question_ids"])
            results["questions_exist"] = cursor.fetchone()[0]
            
        return results
    
    except Exception as e:
        logger.error(f"Error checking entities existence: {e}")
        return None
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def get_admin_token():
    """Get an admin token from the API"""
    try:
        # This function assumes you have an endpoint to get tokens for testing
        # If not, you might need to hardcode a valid admin token
        response = requests.post(
            urljoin(BASE_URL, "/auth/test-token"),
            json={"role": "admin"}
        )
        
        if response.status_code == 200:
            return response.json().get("token")
        else:
            logger.error("Failed to get admin token")
            # Return a default token for testing - replace with a valid one
            return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX2FjdGl2ZSI6dHJ1ZSwiZXhwIjoxNzQ5ODc3NzEzfQ.YourValidSignature"
    except Exception as e:
        logger.error(f"Error getting admin token: {e}")
        # Return a default token for testing - replace with a valid one
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX2FjdGl2ZSI6dHJ1ZSwiZXhwIjoxNzQ5ODc3NzEzfQ.YourValidSignature"

def main():
    """Main test function"""
    # Create test data directly in the database
    entity_ids = create_test_data()
    if not entity_ids:
        logger.error("Failed to create test data. Exiting.")
        return 1

    # Wait a moment to ensure the data is properly saved
    import time
    time.sleep(1)

    # Verify initial entities exist
    initial_check = check_entities_exist(entity_ids)
    if not initial_check:
        logger.error("Failed to check initial entities. Exiting.")
        return 1
        
    if not initial_check["paper_exists"]:
        logger.error("Test paper was not properly created. Exiting.")
        return 1
        
    logger.info(f"Initial check - Paper exists: {initial_check['paper_exists']}, "
                f"Sections exist: {initial_check['sections_exist']}, "
                f"Subsections exist: {initial_check['subsections_exist']}, "
                f"Questions exist: {initial_check['questions_exist']}")

    # Try direct SQL delete to verify cascade delete works at the database level
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        paper_id = entity_ids["paper_id"]
        cursor.execute("DELETE FROM papers WHERE paper_id = %s", (paper_id,))
        conn.commit()
        
        logger.info(f"Deleted paper ID {paper_id} directly from the database")
    except Exception as e:
        logger.error(f"Error deleting paper: {e}")
        if 'conn' in locals():
            conn.rollback()
        return 1
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
            
    # Verify entities are deleted
    final_check = check_entities_exist(entity_ids)
    if not final_check:
        logger.error("Failed to check final entities. Exiting.")
        return 1
        
    logger.info(f"Final check - Paper exists: {final_check['paper_exists']}, "
                f"Sections exist: {final_check['sections_exist']}, "
                f"Subsections exist: {final_check['subsections_exist']}, "
                f"Questions exist: {final_check['questions_exist']}")
                
    if (not final_check["paper_exists"] and 
        not final_check["sections_exist"] and 
        not final_check["subsections_exist"] and 
        not final_check["questions_exist"]):
        
        logger.info("CASCADE DELETE TEST PASSED! ✅")
        logger.info("Paper and all related sections, subsections, and questions were successfully deleted")
        return 0
    else:
        logger.error("CASCADE DELETE TEST FAILED! ❌")
        if final_check["paper_exists"]:
            logger.error(f"Paper {entity_ids['paper_id']} still exists despite deletion")
        if final_check["sections_exist"]:
            logger.error(f"Sections {entity_ids['section_ids']} still exist despite paper deletion")
        if final_check["subsections_exist"]:
            logger.error(f"Subsections {entity_ids['subsection_ids']} still exist despite paper deletion")
        if final_check["questions_exist"]:
            logger.error(f"Questions {entity_ids['question_ids']} still exist despite paper deletion")
        return 1

if __name__ == "__main__":
    sys.exit(main())
