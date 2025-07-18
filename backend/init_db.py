import os
import logging
from sqlalchemy import text

# Import Base, engine, and SessionLocal from the project's database module
from src.database.database import Base, engine, SessionLocal, create_db_and_tables

# Import all SQLAlchemy models to ensure they're discovered by Base.metadata.create_all()
from src.database.models import (
    User, AllowedEmail, Paper, Section, Subsection, Question, 
    QuestionOption, TestTemplate, TestTemplateSection, TestAttempt, TestAnswer
)

# Import the seed function for sample application data
from src.database.seed_data import seed_database as seed_sample_application_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection URL from environment variables
# This should match the DATABASE_URL set in your .env.dev file
# and passed by docker-compose to the backend service.
DATABASE_URL = os.getenv("DATABASE_URL")
ENV = os.getenv("ENV", "development")  # Default to development if not set
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "binty.ghosh@gmail.com")
ADMIN_GOOGLE_ID = os.getenv("ADMIN_GOOGLE_ID", "admin-dev-google-id-123456")

# For debugging: retrieve individual components for verification
DEBUG_POSTGRES_USER = os.getenv("POSTGRES_USER")
DEBUG_POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DEBUG_POSTGRES_DB = os.getenv("POSTGRES_DB")

# --- Debugging Output (TEMPORARY - Remove in Production) ---
logger.info("\n--- Environment Variables as seen by init_db.py ---")
logger.info(f"DATABASE_URL: {DATABASE_URL}")
logger.info(f"POSTGRES_USER: {DEBUG_POSTGRES_USER}")
# Be cautious when printing passwords, especially in production logs
if DEBUG_POSTGRES_PASSWORD:
    masked_password = DEBUG_POSTGRES_PASSWORD[:2] + "*" * (len(DEBUG_POSTGRES_PASSWORD) - 4) + DEBUG_POSTGRES_PASSWORD[-2:]
    logger.info(f"POSTGRES_PASSWORD: {masked_password}")
logger.info(f"POSTGRES_DB: {DEBUG_POSTGRES_DB}")
logger.info("-----------------------------------------------------------\n")
# --- End Debugging Output ---


if not DATABASE_URL:
    logger.error("Error: DATABASE_URL environment variable is not set. Exiting.")
    exit(1)

def seed_initial_user_data():
    """
    Seeds the initial admin user and allowed email.
    This function is idempotent - it won't create duplicates if run multiple times.
    """
    try:
        db = SessionLocal()
        
        logger.info(f"Checking if admin user already exists: {ADMIN_EMAIL}")
        existing_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing_user:
            logger.info(f"Admin user already exists with ID: {existing_user.user_id}")
            user_id = existing_user.user_id
        else:
            new_user = User(
                google_id=ADMIN_GOOGLE_ID,
                email=ADMIN_EMAIL,
                first_name="Admin",
                last_name="User",
                role="Admin",
                is_active=True
            )
            db.add(new_user)
            db.flush()
            user_id = new_user.user_id
            logger.info(f"Created new admin user with ID: {user_id}")
        existing_email = db.query(AllowedEmail).filter(AllowedEmail.email == ADMIN_EMAIL).first()
        if existing_email:
            logger.info(f"Admin email already whitelisted: {ADMIN_EMAIL}")
        else:
            allowed_email = AllowedEmail(
                email=ADMIN_EMAIL,
                added_by_admin_id=user_id
            )
            db.add(allowed_email)
            logger.info(f"Whitelisted admin email: {ADMIN_EMAIL}")
        db.commit()
        logger.info("Successfully seeded initial user data")
        
    except Exception as e:
        logger.error(f"Error seeding initial user data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Running init_db.py...")
    
    try:
        logger.info(f"Detected ENV: {ENV}")
        # Step 1: Create database tables
        create_db_and_tables()
        logger.info("Database tables created successfully")
        # Step 2: Seed initial user data (admin user and whitelist)
        seed_initial_user_data()
        logger.info("Initial user data seeded successfully")
        # Step 3: Conditionally seed sample application data
        if ENV == "development":
            seed_sample_application_data()
            logger.info("Sample application data seeded successfully")
        else:
            logger.info("Skipping sample application data seeding in production mode")
        logger.info("Database initialization completed successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        exit(1)