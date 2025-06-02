from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
import logging
import os
from datetime import datetime
from .routers import auth, questions, tests, papers
from .database.database import engine
from .database.models import Base
from .database.seed_data import seed_database

# Set development environment variable if not set
# This allows dev-login endpoint to work
if not os.environ.get("ENV"):
    os.environ["ENV"] = "development"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables and seed data
    logger.info("Starting application...")
    try:
        Base.metadata.create_all(bind=engine)
        seed_database()
        logger.info("Database initialization completed")
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise
    yield
    # Shutdown: Clean up resources
    logger.info("Shutting down application...")

app = FastAPI(
    title="CIL CBT Application",
    description="A Computer Based Test application for Coal India Limited",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Add CORS middleware with more secure configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Replace with your frontend URL in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Dev-Mode", "Access-Control-Allow-Headers", "Origin", "Accept"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=600  # Cache preflight requests for 10 minutes
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response Status: {response.status_code}")
    return response

# Include routers
app.include_router(auth.router)
app.include_router(questions.router)
app.include_router(tests.router)
app.include_router(papers.router)

@app.get("/health")
@limiter.limit("60/minute")  # Further increased rate limit for health check endpoint
async def health_check(request: Request):
    # Add cache control headers to allow browser caching
    response = {"status": "healthy", "database": "connected", "timestamp": str(datetime.now())}
    
    # Check if this is a development environment
    if os.environ.get("ENV") == "development":
        # In development mode, don't count against rate limit for health checks
        request.state.view_rate_limit = False
    
    return response