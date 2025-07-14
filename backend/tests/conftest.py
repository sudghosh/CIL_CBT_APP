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

# Configure test database connection BEFORE importing main app
# This ensures TestClient uses the correct database URL
DB_HOST = os.getenv('TEST_DB_HOST', 'cil_hr_postgres')  # Use container name instead of localhost
DB_PORT = os.getenv('TEST_DB_PORT', '5432')
DB_USER = os.getenv('TEST_DB_USER', 'cildb')
DB_PASS = os.getenv('TEST_DB_PASS', 'cildb123')
DB_NAME = os.getenv('TEST_DB_NAME', 'cil_cbt_db_test')

# Set DATABASE_URL for TestClient to use the same database as tests
TEST_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

# Now import main app - it will use the DATABASE_URL we just set
from src.main import app
from src.database.database import get_db
from src.database.models import Base
from src.auth.auth import create_access_token

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use the same database URL that we set for the main app
SQLALCHEMY_DATABASE_URL = TEST_DATABASE_URL

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
    from src.database.models import User, AllowedEmail
    
    # Create test user in database
    user_email = "test@example.com"
    
    # Check if user already exists
    existing_user = db_session.query(User).filter(User.email == user_email).first()
    if existing_user:
        user = existing_user
    else:
        # Create user in database
        user = User(
            google_id=f"test-google-id-{user_email}",
            email=user_email,
            first_name="Test",
            last_name="User",
            role="User",  # Regular user role
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    
    # Add email to whitelist if not already there
    existing_whitelist = db_session.query(AllowedEmail).filter(AllowedEmail.email == user_email).first()
    if not existing_whitelist:
        allowed_email = AllowedEmail(
            email=user_email,
            added_by_admin_id=None  # Will be set when admin user is created
        )
        db_session.add(allowed_email)
        db_session.commit()
    
    # Create JWT token with proper claims
    access_token = create_access_token(data={
        "sub": user.email,
        "role": user.role,
        "user_id": user.user_id
    })
    
    user_data = {
        "email": user.email,
        "is_active": user.is_active,
        "is_admin": False,
        "role": user.role,
        "user_id": user.user_id,
        "token": f"Bearer {access_token}"
    }
    return user_data

@pytest.fixture(scope="function")
def authorized_client(client, test_user) -> Generator:
    """Return an authorized client for testing protected endpoints"""
    client.headers = {
        **client.headers,
        "Authorization": test_user["token"]
    }
    yield client

@pytest.fixture(scope="function")
def admin_user(db_session) -> Dict[str, Any]:
    """Create an admin user and return user data with auth token"""
    from src.database.models import User, AllowedEmail
    
    # Create admin user in database
    admin_email = "admin@example.com"
    
    # Check if admin user already exists
    existing_admin = db_session.query(User).filter(User.email == admin_email).first()
    if existing_admin:
        admin_user = existing_admin
    else:
        # Create admin user in database
        admin_user = User(
            google_id=f"admin-google-id-{admin_email}",
            email=admin_email,
            first_name="Admin",
            last_name="User",
            role="Admin",  # Admin role
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)
    
    # Add admin email to whitelist if not already there
    existing_whitelist = db_session.query(AllowedEmail).filter(AllowedEmail.email == admin_email).first()
    if not existing_whitelist:
        allowed_email = AllowedEmail(
            email=admin_email,
            added_by_admin_id=admin_user.user_id
        )
        db_session.add(allowed_email)
        db_session.commit()
    
    # Update test user whitelist to reference this admin if needed
    test_user_email = "test@example.com"
    test_whitelist = db_session.query(AllowedEmail).filter(AllowedEmail.email == test_user_email).first()
    if test_whitelist and test_whitelist.added_by_admin_id is None:
        test_whitelist.added_by_admin_id = admin_user.user_id
        db_session.commit()
    
    # Create JWT token with proper claims
    access_token = create_access_token(data={
        "sub": admin_user.email,
        "role": admin_user.role,
        "user_id": admin_user.user_id
    })
    
    user_data = {
        "email": admin_user.email,
        "is_active": admin_user.is_active,
        "is_admin": True,
        "role": admin_user.role,
        "user_id": admin_user.user_id,
        "token": f"Bearer {access_token}"
    }
    return user_data

@pytest.fixture(scope="function")
def admin_client(client, admin_user) -> Generator:
    """Return an admin client for testing admin endpoints"""
    client.headers = {
        **client.headers,
        "Authorization": admin_user["token"]
    }
    yield client

@pytest.fixture(scope="function")
def user_client(client, test_user) -> Generator:
    """Return a regular user client for testing user endpoints"""
    client.headers = {
        **client.headers,
        "Authorization": test_user["token"]
    }
    yield client

@pytest.fixture(scope="function")
def db(db_session):
    """Alias for db_session to match existing test expectations"""
    return db_session

@pytest.fixture(scope="function")
def test_db(db_session):
    """Alias for db_session to match existing test expectations"""
    return db_session
