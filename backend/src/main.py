from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, APIRouter
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from .middleware import RequestLoggingMiddleware
import logging
import os
import traceback
from datetime import datetime
from .routers import auth, questions, tests, papers, admin, start_route, performance, calibration, api_keys, ai
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

# Add CORS middleware with development-friendly configuration
origins = ["http://localhost:3000"]
# In development mode, allow all origins for easier debugging
if os.environ.get("ENV") == "development" or os.environ.get("CORS_ALLOW_ALL") == "true":
    origins = ["http://localhost:3000", "http://127.0.0.1:3000"]  # Specific origins instead of wildcard
    logger.info("Development mode: CORS configured for local development origins")

logger.info(f"CORS origins configured: {origins}")  # Explicit log for CORS origins
# IMPORTANT: For local development, ensure http://localhost:3000 is included in CORS_ORIGINS if using environment variables or config files.
# Example: CORS_ORIGINS=http://localhost:3000,https://your-production-domain.com

# Use the built-in FastAPI CORSMiddleware for better stability and less memory usage
logger.info("Using standard FastAPI CORSMiddleware for CORS handling")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Use specific origins instead of wildcard
    allow_credentials=True,  # Allow credentials since we're not using wildcard
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=600  # Cache preflight requests for 10 minutes
)

# Add detailed request/response logging middleware for improved debugging
app.add_middleware(RequestLoggingMiddleware)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response Status: {response.status_code}")
    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for all unhandled exceptions.
    This ensures we log details of any unexpected errors.
    """
    # Get the full traceback
    error_detail = f"{exc.__class__.__name__}: {str(exc)}\n{traceback.format_exc()}"
    
    # Log the error with request details
    logger.error(
        f"Unhandled exception in {request.method} {request.url}:\n"
        f"Client IP: {request.client.host}\n"
        f"User-Agent: {request.headers.get('user-agent', 'Unknown')}\n"
        f"Error: {error_detail}"
    )
    
    # Return a consistent error response
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred. The error has been logged."}
    )

# Add a validation error handler to log and format validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors and provide cleaner error messages
    """
    # Extract error details
    error_details = exc.errors()
    error_messages = []
    
    for error in error_details:
        location = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        error_messages.append(f"{location}: {message}")
    
    # Log the validation error
    logger.warning(
        f"Validation error in {request.method} {request.url}:\n"
        f"Client IP: {request.client.host}\n"
        f"Errors: {', '.join(error_messages)}"
    )
    
    # Return a more user-friendly error
    return JSONResponse(
        status_code=422,
        content={"detail": error_messages}
    )

# Include routers
app.include_router(auth.router)
app.include_router(questions.router)
app.include_router(tests.router)
app.include_router(admin.router)
app.include_router(start_route.router)  # Include the new start route for test starting
app.include_router(performance.router)  # Include the performance router for dashboard data and visualizations
app.include_router(calibration.router)  # Include the calibration router for user calibration status
app.include_router(api_keys.router)  # Include the api_keys router for API key management
app.include_router(ai.router)  # Include the ai router for AI-powered analytics endpoints

# Add new routers for section and subsection management
from .routers import sections, subsections

# Create API prefix router to handle frontend requests to /api/*
api_router = APIRouter(prefix="/api")
api_router.include_router(papers.router)  # Include papers router under /api/papers
api_router.include_router(sections.router)  # Include sections router under /api/sections
api_router.include_router(subsections.router)  # Include subsections router under /api/subsections
app.include_router(api_router)  # Include the api router in main app

# Include the sections and subsections routers directly for backward compatibility
app.include_router(sections.router)
app.include_router(subsections.router)

# Remove the direct inclusion of papers router since it's already included under /api
# app.include_router(papers.router)  # This was causing the duplication issue

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

# Add OPTIONS handlers for the /api/papers routes to handle CORS preflight requests
@app.options("/api/papers/", include_in_schema=False)
async def options_api_papers():
    return {
        "Allow": "POST, GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PATCH, PUT, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@app.options("/api/papers/{paper_id}", include_in_schema=False)
@app.options("/api/papers/{paper_id}/", include_in_schema=False)
async def options_api_paper_by_id(paper_id: int):
    return {
        "Allow": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@app.options("/api/papers/{paper_id}/activate/", include_in_schema=False)
async def options_api_paper_activate(paper_id: int):
    return {
        "Allow": "POST, PUT, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@app.options("/api/papers/{paper_id}/deactivate/", include_in_schema=False)
async def options_api_paper_deactivate(paper_id: int):
    return {
        "Allow": "POST, PUT, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

# Add OPTIONS handlers for the /api/sections routes to handle CORS preflight requests
@app.options("/api/sections/{section_id}/subsections/", include_in_schema=False)
async def options_api_sections_subsections():
    return {
        "Allow": "GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }