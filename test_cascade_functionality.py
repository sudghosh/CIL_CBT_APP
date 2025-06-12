"""
Temporary script to test API deletion with authentication issues.
This script:
1. Creates a test paper directly in the database
2. Uses a direct database connection to call the delete_paper method without going through the API authentication
3. Verifies that cascade deletion works properly
"""
import sys
import logging
from datetime import datetime
import time
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

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

def create_test_data():
    """Create test paper with sections directly in database"""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        # Create a paper
        paper_name = f"Test Paper {datetime.now().strftime('%Y%m%d%H%M%S')}"
        logger.info(f"Creating paper {paper_name}")
        
        cursor.execute(
            """
            INSERT INTO papers (paper_name, total_marks, is_active, created_by_user_id)
            VALUES (%s, 100, true, 1)
            RETURNING paper_id
            """,
            (paper_name,)
        )
        paper_id = cursor.fetchone()[0]
        
        # Create a section
        section_name = f"Section for {paper_name}"
        logger.info(f"Creating section {section_name}")
        
        cursor.execute(
            """
            INSERT INTO sections (paper_id, section_name, marks_allocated)
            VALUES (%s, %s, 50)
            RETURNING section_id
            """,
            (paper_id, section_name)
        )
        section_id = cursor.fetchone()[0]
        
        # Create a subsection
        subsection_name = f"Subsection for {section_name}"
        logger.info(f"Creating subsection {subsection_name}")
        
        cursor.execute(
            """
            INSERT INTO subsections (section_id, subsection_name)
            VALUES (%s, %s)
            RETURNING subsection_id
            """,
            (section_id, subsection_name)
        )
        subsection_id = cursor.fetchone()[0]
        
        # Create a question
        question_text = f"Test question for {paper_name}"
        logger.info(f"Creating question {question_text}")
        
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
        
        # Commit changes
        conn.commit()
        
        logger.info(f"Successfully created test data:")
        logger.info(f"- Paper ID: {paper_id}")
        logger.info(f"- Section ID: {section_id}")
        logger.info(f"- Subsection ID: {subsection_id}")
        logger.info(f"- Question ID: {question_id}")
        
        return paper_id
        
    except Exception as e:
        logger.error(f"Error creating test data: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
        return None
        
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

def verify_deletion(paper_id):
    """Verify that the paper and related entities were deleted"""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        # Check if paper exists
        cursor.execute("SELECT EXISTS(SELECT 1 FROM papers WHERE paper_id = %s)", (paper_id,))
        paper_exists = cursor.fetchone()[0]
        
        # Check if sections exist
        cursor.execute("SELECT COUNT(*) FROM sections WHERE paper_id = %s", (paper_id,))
        sections_count = cursor.fetchone()[0]
        
        # Check if any subsections exist for sections of this paper
        cursor.execute("""
            SELECT COUNT(*) FROM subsections 
            WHERE section_id IN (SELECT section_id FROM sections WHERE paper_id = %s)
        """, (paper_id,))
        subsections_count = cursor.fetchone()[0]
        
        # Check if questions exist
        cursor.execute("SELECT COUNT(*) FROM questions WHERE paper_id = %s", (paper_id,))
        questions_count = cursor.fetchone()[0]
        
        if not paper_exists and sections_count == 0 and subsections_count == 0 and questions_count == 0:
            logger.info(f"✅ Cascade delete verified successful:")
            logger.info(f"- Paper {paper_id}: Deleted")
            logger.info(f"- Sections: {sections_count}")
            logger.info(f"- Subsections: {subsections_count}")
            logger.info(f"- Questions: {questions_count}")
            return True
        else:
            logger.error(f"❌ Cascade delete verification failed:")
            logger.error(f"- Paper exists: {paper_exists}")
            logger.error(f"- Sections remaining: {sections_count}")
            logger.error(f"- Subsections remaining: {subsections_count}")
            logger.error(f"- Questions remaining: {questions_count}")
            return False
    
    except Exception as e:
        logger.error(f"Error verifying deletion: {e}")
        return False
        
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

def delete_paper_direct(paper_id):
    """Delete paper using direct SQL to test cascade behavior"""
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
        
        logger.info(f"✅ Successfully deleted paper '{paper_name}' (ID: {paper_id})")
        logger.info(f"Need to verify if cascade delete worked properly...")
        return True
    
    except Exception as e:
        logger.error(f"Error deleting paper: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
        return False
    
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

def main():
    """Main test function"""
    # Create test data
    paper_id = create_test_data()
    if paper_id is None:
        logger.error("Failed to create test data")
        return 1
    
    # Wait a moment to ensure all DB operations are complete
    time.sleep(1)
    
    # Delete the paper
    delete_success = delete_paper_direct(paper_id)
    if not delete_success:
        logger.error("Failed to delete paper")
        return 1
    
    # Verify deletion
    verify_success = verify_deletion(paper_id)
    if verify_success:
        logger.info("✅ CASCADE DELETE TEST PASSED - All related entities were properly deleted")
        return 0
    else:
        logger.error("❌ CASCADE DELETE TEST FAILED - Some related entities were not deleted")
        return 1

if __name__ == "__main__":
    sys.exit(main())
