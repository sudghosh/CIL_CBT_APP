"""
Local version of test script to verify cascading delete functionality for papers, sections, subsections, and questions.

This version uses a direct connection to the local database instead of going through the container.

Run this script after applying the database migrations to verify that the cascade delete fix works correctly.
"""
import sys
import time
import logging
import os
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Use local database connection - adjust these as needed for local setup
LOCAL_DB_USER = "postgres"
LOCAL_DB_PASSWORD = "postgres"  # Replace with your local postgres password
LOCAL_DB_HOST = "localhost"
LOCAL_DB_PORT = "5432"
LOCAL_DB_NAME = "cil_cbt_app"

# Create SQLAlchemy engine and session
DATABASE_URL = f"postgresql://{LOCAL_DB_USER}:{LOCAL_DB_PASSWORD}@{LOCAL_DB_HOST}:{LOCAL_DB_PORT}/{LOCAL_DB_NAME}"

try:
    # Create the engine
    engine = create_engine(DATABASE_URL)
    
    # Create a session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Try a connection
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        logger.info("Database connection successful")
except Exception as e:
    logger.error(f"Error connecting to database: {e}")
    sys.exit(1)

# Get SQLAlchemy Base from our models module
Base = declarative_base()

def test_direct_sql_cascade_delete():
    """
    Test that deleting a paper using direct SQL queries will cascade to sections, subsections, and questions
    """
    try:
        # Connect directly using psycopg2 for raw SQL operations
        conn = psycopg2.connect(
            host=LOCAL_DB_HOST,
            port=LOCAL_DB_PORT,
            database=LOCAL_DB_NAME,
            user=LOCAL_DB_USER,
            password=LOCAL_DB_PASSWORD
        )
        conn.autocommit = False
        cursor = conn.cursor()
        
        # Get counts before deletion
        cursor.execute("SELECT COUNT(*) FROM papers")
        paper_count_before = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sections")
        section_count_before = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM subsections")
        subsection_count_before = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM questions")
        question_count_before = cursor.fetchone()[0]
        
        # Get a paper that has sections, subsections, and questions
        cursor.execute("""
            SELECT p.paper_id, p.paper_name, 
                   COUNT(DISTINCT s.section_id) as section_count, 
                   COUNT(DISTINCT sub.subsection_id) as subsection_count,
                   COUNT(DISTINCT q.question_id) as question_count
            FROM papers p
            LEFT JOIN sections s ON s.paper_id = p.paper_id
            LEFT JOIN subsections sub ON sub.section_id = s.section_id
            LEFT JOIN questions q ON q.paper_id = p.paper_id
            GROUP BY p.paper_id, p.paper_name
            HAVING COUNT(DISTINCT s.section_id) > 0 
               AND COUNT(DISTINCT sub.subsection_id) > 0
               AND COUNT(DISTINCT q.question_id) > 0
            ORDER BY question_count DESC
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        
        if not result:
            logger.warning("No paper found with sections, subsections, and questions")
            logger.info("Creating test data for deletion test...")
            
            # Create test data - a paper with section, subsection, and question
            test_paper_name = f"Test Paper for Deletion {int(time.time())}"
            
            # Create paper
            cursor.execute(
                "INSERT INTO papers (paper_name, total_marks, description, is_active, created_by_user_id) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING paper_id",
                (test_paper_name, 100, "Test paper for cascade deletion", True, 1)
            )
            paper_id = cursor.fetchone()[0]
            
            # Create section
            cursor.execute(
                "INSERT INTO sections (paper_id, section_name, marks_allocated, description) "
                "VALUES (%s, %s, %s, %s) RETURNING section_id",
                (paper_id, "Test Section", 50, "Test section for cascade deletion")
            )
            section_id = cursor.fetchone()[0]
            
            # Create subsection
            cursor.execute(
                "INSERT INTO subsections (section_id, subsection_name, description) "
                "VALUES (%s, %s, %s) RETURNING subsection_id",
                (section_id, "Test Subsection", "Test subsection for cascade deletion")
            )
            subsection_id = cursor.fetchone()[0]
            
            # Create question
            cursor.execute(
                "INSERT INTO questions (question_text, question_type, correct_option_index, "
                "paper_id, section_id, subsection_id, default_difficulty_level, created_by_user_id) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING question_id",
                ("Test Question?", "MCQ", 0, paper_id, section_id, subsection_id, "Easy", 1)
            )
            question_id = cursor.fetchone()[0]
            
            # Create options
            for i in range(4):
                cursor.execute(
                    "INSERT INTO question_options (question_id, option_text, option_order) "
                    "VALUES (%s, %s, %s)",
                    (question_id, f"Option {i+1}", i)
                )
                
            # Commit the test data
            conn.commit()
            
            # Store the created paper_id
            paper_name = test_paper_name
            section_count = 1
            subsection_count = 1
            question_count = 1
            
            logger.info(f"Created test paper '{paper_name}' (ID: {paper_id}) with "
                       f"{section_count} section, {subsection_count} subsection, {question_count} question")
        else:
            paper_id, paper_name, section_count, subsection_count, question_count = result
            logger.info(f"Found paper '{paper_name}' (ID: {paper_id}) with {section_count} sections, "
                      f"{subsection_count} subsections, {question_count} questions")
        
        # Get details of sections, subsections, and questions that will be deleted
        cursor.execute("SELECT section_id FROM sections WHERE paper_id = %s", (paper_id,))
        section_ids = [row[0] for row in cursor.fetchall()]
        
        section_ids_str = ','.join(str(id) for id in section_ids) if section_ids else 'NULL'
        cursor.execute(f"SELECT subsection_id FROM subsections WHERE section_id IN ({section_ids_str})")
        subsection_ids = [row[0] for row in cursor.fetchall()]
        
        cursor.execute("SELECT question_id FROM questions WHERE paper_id = %s", (paper_id,))
        question_ids = [row[0] for row in cursor.fetchall()]
        
        logger.info(f"Preparing to delete paper ID {paper_id}...")
        logger.info(f"This will delete {len(section_ids)} sections: {section_ids}")
        logger.info(f"This will delete {len(subsection_ids)} subsections: {subsection_ids}")
        logger.info(f"This will delete {len(question_ids)} questions: {question_ids}")
        
        # Delete the paper - if cascade constraints are working, this will delete everything
        cursor.execute("DELETE FROM papers WHERE paper_id = %s", (paper_id,))
        conn.commit()
        
        # Check if paper was deleted
        cursor.execute("SELECT EXISTS(SELECT 1 FROM papers WHERE paper_id = %s)", (paper_id,))
        paper_exists = cursor.fetchone()[0]
        
        # Check if sections were deleted
        if section_ids:
            section_ids_str = ','.join(str(id) for id in section_ids)
            cursor.execute(f"SELECT EXISTS(SELECT 1 FROM sections WHERE section_id IN ({section_ids_str}))")
            sections_exist = cursor.fetchone()[0]
        else:
            sections_exist = False
        
        # Check if subsections were deleted
        if subsection_ids:
            subsection_ids_str = ','.join(str(id) for id in subsection_ids)
            cursor.execute(f"SELECT EXISTS(SELECT 1 FROM subsections WHERE subsection_id IN ({subsection_ids_str}))")
            subsections_exist = cursor.fetchone()[0]
        else:
            subsections_exist = False
        
        # Check if questions were deleted
        if question_ids:
            question_ids_str = ','.join(str(id) for id in question_ids)
            cursor.execute(f"SELECT EXISTS(SELECT 1 FROM questions WHERE question_id IN ({question_ids_str}))")
            questions_exist = cursor.fetchone()[0]
        else:
            questions_exist = False
        
        # Get counts after deletion
        cursor.execute("SELECT COUNT(*) FROM papers")
        paper_count_after = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sections")
        section_count_after = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM subsections")
        subsection_count_after = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM questions")
        question_count_after = cursor.fetchone()[0]
        
        logger.info(f"After deletion - Papers: {paper_count_after} (-{paper_count_before - paper_count_after}), "
                  f"Sections: {section_count_after} (-{section_count_before - section_count_after}), "
                  f"Subsections: {subsection_count_after} (-{subsection_count_before - subsection_count_after}), "
                  f"Questions: {question_count_after} (-{question_count_before - question_count_after})")
        
        # Log results
        if not paper_exists and not sections_exist and not subsections_exist and not questions_exist:
            logger.info("CASCADE DELETE TEST PASSED! ✅")
            logger.info(f"Paper {paper_id} and all related sections, subsections, and questions were deleted successfully")
            return True
        else:
            logger.error("CASCADE DELETE TEST FAILED! ❌")
            if paper_exists:
                logger.error(f"Paper {paper_id} still exists!")
            if sections_exist:
                logger.error(f"Some sections in {section_ids} still exist!")
            if subsections_exist:
                logger.error(f"Some subsections in {subsection_ids} still exist!")
            if questions_exist:
                logger.error(f"Some questions in {question_ids} still exist!")
            return False
            
    except Exception as e:
        logger.error(f"Error during direct SQL cascade delete test: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
        return False
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    success = test_direct_sql_cascade_delete()
    sys.exit(0 if success else 1)
