import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy_utils import database_exists, create_database, drop_database
import os
import logging
import time
from typing import Generator, Dict, Any
import jwt
from datetime import datetime, timedelta

from backend.src.main import app
from backend.src.database.database import get_db
from backend.src.database.models import Base
from backend.src.auth.auth import create_access_token

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test database URL - Use environment variables or default values
DB_HOST = os.getenv('TEST_DB_HOST', 'localhost')
DB_PORT = os.getenv('TEST_DB_PORT', '5432')
DB_USER = os.getenv('TEST_DB_USER', 'cildb')
DB_PASS = os.getenv('TEST_DB_PASS', 'cildb123')
DB_NAME = os.getenv('TEST_DB_NAME', 'cil_cbt_db_test')

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create test database and tables, teardown after tests"""
    retries = 3
    retry_delay = 2  # seconds
    last_error = None
    
    for attempt in range(retries):
        try:
            # Create test database if it doesn't exist
            if database_exists(SQLALCHEMY_DATABASE_URL):
                logger.info(f"Dropping existing test database: {DB_NAME}")
                drop_database(SQLALCHEMY_DATABASE_URL)
            
            logger.info(f"Creating test database: {DB_NAME} (attempt {attempt + 1}/{retries})")
            create_database(SQLALCHEMY_DATABASE_URL)
            
            # Create test engine with optimized settings
            engine = create_engine(
                SQLALCHEMY_DATABASE_URL,
                connect_args={
                    "connect_timeout": 10,
                    "application_name": "cil_cbt_test_suite"
                },
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10
            )
            
            # Create all tables
            logger.info("Creating database tables")
            Base.metadata.create_all(bind=engine)
            
            yield engine
            
            break  # Success - exit retry loop
            
        except Exception as e:
            last_error = e
            logger.error(f"Database setup attempt {attempt + 1} failed: {str(e)}")
            if attempt < retries - 1:  # Don't sleep on last attempt
                time.sleep(retry_delay)
    else:
        logger.error(f"All database setup attempts failed. Last error: {last_error}")
        raise last_error
    
    # Cleanup
    try:
        logger.info(f"Cleaning up test database: {DB_NAME}")
        drop_database(SQLALCHEMY_DATABASE_URL)
    except Exception as e:
        logger.error(f"Error cleaning up test database: {str(e)}")

@pytest.fixture(scope="function")
def db_session(setup_test_database):
    """Create a fresh database session for each test"""
    # Create connection and start transaction
    connection = setup_test_database.connect()
    
    # Begin a nested transaction (using SAVEPOINT)
    transaction = connection.begin_nested()
    
    # Configure Session for test
    TestingSessionLocal = sessionmaker(
        bind=connection,
        autocommit=False,
        autoflush=False
    )
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()

@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    """Create a test client using the test database"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db_session) -> Dict[str, Any]:
    """Create a test user and return user data with auth token"""
    user_data = {
        "email": "test@example.com",
        "is_active": True,
        "is_admin": False
    }
    access_token = create_access_token(data={"sub": user_data["email"]})
    user_data["token"] = f"Bearer {access_token}"
    return user_data

@pytest.fixture(scope="function")
def authorized_client(client, test_user) -> Generator:
    """Return an authorized client for testing protected endpoints"""
    client.headers = {
        **client.headers,
        "Authorization": test_user["token"]
    }
    yield client
