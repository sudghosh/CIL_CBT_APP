"""
Script to fix cascade delete issues for papers, sections, subsections, and questions.

This script:
1. Adds ON DELETE CASCADE constraints to all required foreign keys
2. Verifies the constraints were added correctly
"""

from sqlalchemy import create_engine, text
import os
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get database URL from environment variable or use default for Docker setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cildb:cildb123@postgres:5432/cil_cbt_db")

# List of constraints that need to be added or updated
constraints_to_fix = [
    # Section constraints - paper_id reference
    ("sections", "paper_id", "papers", "paper_id", "sections_paper_id_fkey"),
    
    # Subsection constraints - section_id reference
    ("subsections", "section_id", "sections", "section_id", "subsections_section_id_fkey"),
    
    # Question constraints
    ("questions", "paper_id", "papers", "paper_id", "questions_paper_id_fkey"),
    ("questions", "section_id", "sections", "section_id", "questions_section_id_fkey"),
    ("questions", "subsection_id", "subsections", "subsection_id", "questions_subsection_id_fkey"),
    
    # Question options constraint
    ("question_options", "question_id", "questions", "question_id", "question_options_question_id_fkey"),
    
    # Test answers constraint
    ("test_answers", "question_id", "questions", "question_id", "test_answers_question_id_fkey"),
]

def main():
    """Main function to run the migration"""
    try:
        # Create SQLAlchemy engine
        logger.info(f"Connecting to database: {DATABASE_URL.split('@')[1]}")
        engine = create_engine(DATABASE_URL)
        
        # Execute migration
        with engine.connect() as conn:
            transaction = conn.begin()
            try:
                # First drop existing constraints if they exist
                for table_name, column_name, ref_table, ref_column, constraint_name in constraints_to_fix:
                    logger.info(f"Dropping constraint {constraint_name} if it exists...")
                    drop_stmt = text(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {constraint_name};")
                    conn.execute(drop_stmt)
                
                # Add each constraint with CASCADE option
                for table_name, column_name, ref_table, ref_column, constraint_name in constraints_to_fix:
                    logger.info(f"Adding CASCADE constraint {constraint_name}...")
                    add_stmt = text(f"ALTER TABLE {table_name} ADD CONSTRAINT {constraint_name} "
                                   f"FOREIGN KEY ({column_name}) REFERENCES {ref_table}({ref_column}) ON DELETE CASCADE;")
                    conn.execute(add_stmt)
                
                # Commit all changes
                transaction.commit()
                logger.info("All constraints have been updated successfully!")
                
            except Exception as e:
                transaction.rollback()
                logger.error(f"Error adding constraints: {str(e)}")
                return False
        
        # Verify constraints
        with engine.connect() as conn:
            logger.info("Verifying CASCADE constraints...")
            verify_stmt = text("""
                SELECT tc.table_name, tc.constraint_name, rc.delete_rule
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.referential_constraints AS rc
                    ON tc.constraint_name = rc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND (tc.table_name = 'sections' 
                        OR tc.table_name = 'subsections'
                        OR tc.table_name = 'questions'
                        OR tc.table_name = 'question_options'
                        OR tc.table_name = 'test_answers')
                ORDER BY tc.table_name;
            """)
            result = conn.execute(verify_stmt)
            
            # Check all constraints
            all_ok = True
            for row in result:
                table_name = row[0]
                constraint_name = row[1]
                delete_rule = row[2]
                
                if delete_rule != "CASCADE":
                    logger.error(f"Constraint {constraint_name} on {table_name} has rule {delete_rule}, not CASCADE")
                    all_ok = False
                else:
                    logger.info(f"✓ {table_name}.{constraint_name}: {delete_rule}")
            
            if all_ok:
                logger.info("✅ All foreign key constraints are correctly set to CASCADE!")
                return True
            else:
                logger.error("❌ Some constraints are not set to CASCADE.")
                return False
                
    except Exception as e:
        logger.error(f"Migration error: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
