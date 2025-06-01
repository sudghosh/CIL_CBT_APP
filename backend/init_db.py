import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Define your SQLAlchemy Base for declarative models
Base = declarative_base()

# --- Import your SQLAlchemy models here ---
# Uncomment and adjust these imports as you define your SQLAlchemy models.
# For example:
# from src.models import User, Question, Option, Answer, Exam, UserExam, Score
# Make sure your models inherit from 'Base' (e.g., class User(Base): ...).

# Database connection URL from environment variables
# This should match the DATABASE_URL set in your .env.dev file
# and passed by docker-compose to the backend service.
DATABASE_URL = os.getenv("DATABASE_URL")

# For debugging: retrieve individual components for verification
DEBUG_POSTGRES_USER = os.getenv("POSTGRES_USER")
DEBUG_POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DEBUG_POSTGRES_DB = os.getenv("POSTGRES_DB")

# --- Debugging Output (TEMPORARY - Remove in Production) ---
print("\n--- DEBUG: Environment Variables as seen by init_db.py ---")
print(f"DATABASE_URL: {DATABASE_URL}")
print(f"POSTGRES_USER: {DEBUG_POSTGRES_USER}")
# Be cautious when printing passwords, especially in production logs.
# For development, printing the full password is fine for verification.
print(f"POSTGRES_PASSWORD: {DEBUG_POSTGRES_PASSWORD}")
print(f"POSTGRES_DB: {DEBUG_POSTGRES_DB}")
print("-----------------------------------------------------------\n")
# --- End Debugging Output ---


if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is not set. Exiting.")
    exit(1)

try:
    # Create a SQLAlchemy engine
    engine = create_engine(DATABASE_URL)

    # Create a session local class
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def create_db_and_tables():
        """
        Connects to the database and creates all tables defined in SQLAlchemy models.
        This method is idempotent; it won't recreate tables if they already exist.
        """
        try:
            # Check if the database is reachable by executing a simple query
            with SessionLocal() as session:
                session.execute(text("SELECT 1"))
            print("Database connection successful.")

            # Create all tables defined in Base.metadata.
            # This will create tables if they don't exist based on your imported models.
            Base.metadata.create_all(engine)
            print("Database tables created or already exist (via SQLAlchemy).")

        except Exception as e:
            print(f"Error creating database tables: {e}")
            # Consider more advanced error handling or retries in a production setup.
            raise # Re-raise the exception to indicate failure to Docker Compose

    if __name__ == "__main__":
        print("Running init_db.py...")
        # When run via Docker Compose, env_file handles loading;
        # no need for dotenv.load_dotenv() here.
        create_db_and_tables()
        print("init_db.py execution complete.")

except Exception as e:
    # Catch errors during engine creation (e.g., malformed DATABASE_URL)
    print(f"Failed to initialize database connection: {e}")
    exit(1)