"""
Direct alembic migration script that doesn't rely on command-    # Import now after ensuring packages are installed
    from sqlalchemy import create_engine, inspect, Table, Column, Integer, String, MetaData, ForeignKey, text
    from alembic import command
    from alembic.config import Config
    from alembic.migration import MigrationContext
    from alembic.operations import Operationsools.
This script directly uses the alembic Python API to:
1. Create a migration
2. Apply the migration
"""
import os
import sys
import time
import importlib.util
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('migration')

def ensure_package_installed(package_name):
    """Ensure that a Python package is installed."""
    try:
        importlib.import_module(package_name)
        logger.info(f"{package_name} is already installed.")
        return True
    except ImportError:
        logger.info(f"Installing {package_name}...")
        import subprocess
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
            logger.info(f"Successfully installed {package_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to install {package_name}: {e}")
            return False

def find_base_models():
    """Find the SQLAlchemy Base in the project."""
    possible_locations = [
        '/app/src/database/models.py',
        '/app/database/models.py',
        '/app/models.py'
    ]
    
    for location in possible_locations:
        if os.path.exists(location):
            logger.info(f"Found models at {location}")
            try:
                spec = importlib.util.spec_from_file_location("models", location)
                models = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(models)
                
                # Check if models has Base
                if hasattr(models, 'Base'):
                    logger.info("Found SQLAlchemy Base in models module")
                    return models.Base
            except Exception as e:
                logger.error(f"Error importing models from {location}: {e}")
    
    logger.error("Could not find SQLAlchemy Base in any expected location")
    return None

def perform_migration():
    """Perform database migration using SQLAlchemy and alembic."""
    # Ensure required packages
    for package in ['sqlalchemy', 'alembic', 'psycopg2-binary']:
        if not ensure_package_installed(package):
            return False
      # Import now after ensuring packages are installed
    from sqlalchemy import create_engine, inspect, Table, Column, Integer, String, MetaData, ForeignKey, text
    from alembic import command
    from alembic.config import Config
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    
    try:
        # Database connection
        db_host = os.environ.get('POSTGRES_HOST', 'cil_hr_postgres')  # Use container name as host
        db_port = os.environ.get('POSTGRES_PORT', '5432')
        db_name = os.environ.get('POSTGRES_DB', 'cil_cbt_db')
        db_user = os.environ.get('POSTGRES_USER', 'cildb')
        db_password = os.environ.get('POSTGRES_PASSWORD', 'password')
        
        db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        logger.info(f"Connecting to database at {db_host}:{db_port}/{db_name}")
        
        engine = create_engine(db_url)        # Test the connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            logger.info(f"Connected to PostgreSQL {version}")
        
        # Get metadata from Base if possible, or create it manually
        metadata = MetaData()
        inspector = inspect(engine)
          # Apply the cascade delete constraint directly using raw SQL
        with engine.begin() as conn:
            # Apply cascade delete to sections table
            logger.info("Modifying sections table foreign key constraint...")
            conn.execute(text("ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_paper_id_fkey;"))
            conn.execute(text("ALTER TABLE sections ADD CONSTRAINT sections_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers(paper_id) ON DELETE CASCADE;"))
            
            # Apply cascade delete to subsections table
            logger.info("Modifying subsections table foreign key constraint...")
            conn.execute(text("ALTER TABLE subsections DROP CONSTRAINT IF EXISTS subsections_section_id_fkey;"))
            conn.execute(text("ALTER TABLE subsections ADD CONSTRAINT subsections_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE;"))
            
            # Apply cascade delete to questions table for section_id
            logger.info("Modifying questions table section_id foreign key constraint...")
            conn.execute(text("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_section_id_fkey;"))
            conn.execute(text("ALTER TABLE questions ADD CONSTRAINT questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE;"))
            
            # Apply cascade delete to questions table for paper_id
            logger.info("Modifying questions table paper_id foreign key constraint...")
            conn.execute(text("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_paper_id_fkey;"))
            conn.execute(text("ALTER TABLE questions ADD CONSTRAINT questions_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers(paper_id) ON DELETE CASCADE;"))
            
            # Apply cascade delete to questions table for subsection_id
            logger.info("Modifying questions table subsection_id foreign key constraint...")
            conn.execute(text("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_subsection_id_fkey;"))
            conn.execute(text("ALTER TABLE questions ADD CONSTRAINT questions_subsection_id_fkey FOREIGN KEY (subsection_id) REFERENCES subsections(subsection_id) ON DELETE CASCADE;"))
            
            # Apply cascade delete to question_options table
            logger.info("Modifying question_options table foreign key constraint...")
            conn.execute(text("ALTER TABLE question_options DROP CONSTRAINT IF EXISTS question_options_question_id_fkey;"))
            conn.execute(text("ALTER TABLE question_options ADD CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE;"))
            
            # Apply cascade delete to test_answers table
            logger.info("Modifying test_answers table foreign key constraint...")
            conn.execute(text("ALTER TABLE test_answers DROP CONSTRAINT IF EXISTS test_answers_question_id_fkey;"))
            conn.execute(text("ALTER TABLE test_answers ADD CONSTRAINT test_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE;"))
        
        logger.info("Database migration completed successfully!")
        logger.info("CASCADE DELETE constraints have been applied to all relevant tables")
        return True
        
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        return False

if __name__ == "__main__":
    success = perform_migration()
    sys.exit(0 if success else 1)
