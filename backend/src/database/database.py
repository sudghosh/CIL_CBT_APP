from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
import os
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("Database URL not found in environment variables")

# Create engine with optimized connection pool settings
engine = create_engine(
    DATABASE_URL,
    pool_size=5,  # Number of connections to maintain
    max_overflow=10,  # Maximum number of connections to allow over pool_size
    pool_timeout=30,  # Seconds to wait before timing out on getting a connection
    pool_pre_ping=True,  # Enable connection health checks
    pool_recycle=3600,  # Recycle connections after 1 hour
    poolclass=QueuePool,  # Use QueuePool for better connection management
    echo=False,  # Set to True for SQL query logging
    connect_args={
        "keepalives": 1,  # Enable TCP keepalive
        "keepalives_idle": 30,  # Number of seconds after which TCP should send keepalive
        "keepalives_interval": 10,  # Interval between keepalives
        "keepalives_count": 5  # Number of keepalives before dropping connection
    }
)

# Create session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False  # Prevent expired objects after commit
)

# Create thread-safe session factory
db_session = scoped_session(SessionLocal)

def get_db():
    """
    Get database session with automatic cleanup.
    Returns a session that will be automatically closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()
