"""
Test the cascade delete functionality directly using SQL.
"""
import os
import sys
import psycopg2
import logging
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('sql_test')

def main():    # Connect to the database
    try:
        # Get database connection parameters from environment or use defaults
        db_host = os.environ.get('POSTGRES_HOST', 'postgres')
        db_name = os.environ.get('POSTGRES_DB', 'cil_cbt_db')
        db_user = os.environ.get('POSTGRES_USER', 'cildb')
        db_password = os.environ.get('POSTGRES_PASSWORD', 'cildb123')
        
        logger.info(f"Connecting to database at {db_host}/{db_name} as {db_user}")
        conn = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_password
        )
        conn.autocommit = True
        logger.info("Connected to the database")
        
        # Create a cursor
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
        
        # Create a test paper if needed
        cursor.execute("""
            SELECT p.paper_id, p.paper_name, 
                   (SELECT COUNT(*) FROM sections WHERE paper_id = p.paper_id) as section_count,
                   (SELECT COUNT(*) FROM questions WHERE paper_id = p.paper_id) as question_count
            FROM papers p
            WHERE (SELECT COUNT(*) FROM sections WHERE paper_id = p.paper_id) > 0
            LIMIT 1
        """)
        paper = cursor.fetchone()
        
        if paper:
            paper_id, paper_name, section_count, question_count = paper
            logger.info(f"Found paper '{paper_name}' (ID: {paper_id}) with {section_count} sections and {question_count} questions")
        else:
            # Create a test paper
            logger.info("No paper with sections found. Creating a test paper...")
            
            # Insert a paper
            test_paper_name = f"Test Paper for Deletion {int(time.time())}"
            cursor.execute(
                "INSERT INTO papers (paper_name, total_marks, description, is_active, created_by_user_id) VALUES (%s, %s, %s, %s, %s) RETURNING paper_id",
                (test_paper_name, 100, "Test paper for cascade deletion", True, 1)
            )
            paper_id = cursor.fetchone()[0]
            paper_name = test_paper_name
            
            # Insert a section
            cursor.execute(
                "INSERT INTO sections (paper_id, section_name, marks_allocated, description) VALUES (%s, %s, %s, %s) RETURNING section_id",
                (paper_id, "Test Section", 50, "Test section for cascade deletion")
            )
            section_id = cursor.fetchone()[0]
            
            # Insert a subsection
            cursor.execute(
                "INSERT INTO subsections (section_id, subsection_name, description) VALUES (%s, %s, %s) RETURNING subsection_id",
                (section_id, "Test Subsection", "Test subsection for cascade deletion")
            )
            subsection_id = cursor.fetchone()[0]
            
            # Insert a question
            cursor.execute(
                """
                INSERT INTO questions (question_text, question_type, correct_option_index, paper_id, section_id, subsection_id, default_difficulty_level, created_by_user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING question_id
                """,
                ("Test question for cascade deletion?", "MCQ", 0, paper_id, section_id, subsection_id, "Easy", 1)
            )
            question_id = cursor.fetchone()[0]
            
            # Insert question options
            for i in range(4):
                cursor.execute(
                    "INSERT INTO question_options (question_id, option_text, option_order) VALUES (%s, %s, %s)",
                    (question_id, f"Option {i+1}", i)
                )
            
            logger.info(f"Created test paper '{paper_name}' (ID: {paper_id})")
        
        # Get counts after creating test data
        cursor.execute("SELECT COUNT(*) FROM sections WHERE paper_id = %s", (paper_id,))
        paper_sections = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM questions WHERE paper_id = %s", (paper_id,))
        paper_questions = cursor.fetchone()[0]
        
        logger.info(f"Paper {paper_id} has {paper_sections} sections and {paper_questions} questions")
        
        # Now delete the paper and see if cascade deletion works
        logger.info(f"Deleting paper {paper_id}...")
        cursor.execute("DELETE FROM papers WHERE paper_id = %s", (paper_id,))
        
        # Check if the paper was deleted
        cursor.execute("SELECT COUNT(*) FROM papers WHERE paper_id = %s", (paper_id,))
        paper_exists = cursor.fetchone()[0]
        
        # Check if the sections were deleted
        cursor.execute("SELECT COUNT(*) FROM sections WHERE paper_id = %s", (paper_id,))
        sections_exist = cursor.fetchone()[0]
        
        # Check if the questions were deleted
        cursor.execute("SELECT COUNT(*) FROM questions WHERE paper_id = %s", (paper_id,))
        questions_exist = cursor.fetchone()[0]
        
        # Get counts after deletion
        cursor.execute("SELECT COUNT(*) FROM papers")
        paper_count_after = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sections")
        section_count_after = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM subsections")
        subsection_count_after = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM questions")
        question_count_after = cursor.fetchone()[0]
        
        logger.info(f"After deletion - Papers: {paper_count_after}, Sections: {section_count_after}, Subsections: {subsection_count_after}, Questions: {question_count_after}")
        
        # Verify the cascade deletion worked
        if not paper_exists and not sections_exist and not questions_exist:
            logger.info("CASCADE DELETE TEST PASSED! ✅")
            logger.info(f"Deleted counts - Papers: {paper_count_before - paper_count_after}, "
                        f"Sections: {section_count_before - section_count_after}, "
                        f"Subsections: {subsection_count_before - subsection_count_after}, "
                        f"Questions: {question_count_before - question_count_after}")
        else:
            logger.error("CASCADE DELETE TEST FAILED! ❌")
            if paper_exists:
                logger.error(f"Paper {paper_id} still exists!")
            if sections_exist:
                logger.error(f"Sections for paper {paper_id} still exist!")
            if questions_exist:
                logger.error(f"Questions for paper {paper_id} still exist!")
        
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
            logger.info("Database connection closed")

if __name__ == "__main__":
    main()
