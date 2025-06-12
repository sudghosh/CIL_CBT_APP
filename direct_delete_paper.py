"""
Script to directly delete a paper from the database.
This bypasses the API and deletes directly from PostgreSQL,
which should respect the ON DELETE CASCADE constraints.
"""

import sys
import psycopg2
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection settings - adjust as needed
DB_PARAMS = {
    "host": "localhost",
    "port": "5432",
    "database": "cil_cbt_db", 
    "user": "cildb",
    "password": "cildb123"
}

def delete_paper_direct(paper_id):
    """Delete a paper directly from the database using SQL"""
    try:
        logger.info(f"Connecting to database...")
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
        
        # Verify paper is gone
        cursor.execute("SELECT EXISTS(SELECT 1 FROM papers WHERE paper_id = %s)", (paper_id,))
        paper_exists = cursor.fetchone()[0]
        
        # Verify cascade deletion
        cursor.execute("SELECT COUNT(*) FROM sections WHERE paper_id = %s", (paper_id,))
        sections_remain = cursor.fetchone()[0]
        
        if not paper_exists and sections_remain == 0:
            logger.info(f"✅ Successfully deleted paper '{paper_name}' (ID: {paper_id}) with cascade delete")
            logger.info(f"Successfully deleted {section_count} sections, {subsection_count} subsections, {question_count} questions")
            return True
        else:
            logger.error(f"❌ Deletion verification failed:")
            logger.error(f"Paper exists: {paper_exists}, Sections remaining: {sections_remain}")
            return False
    
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
    """Main function"""
    if len(sys.argv) != 2:
        print("Usage: python direct_delete_paper.py <paper_id>")
        return 1
    
    try:
        paper_id = int(sys.argv[1])
    except ValueError:
        print(f"Invalid paper ID: {sys.argv[1]}")
        return 1
    
    success = delete_paper_direct(paper_id)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
