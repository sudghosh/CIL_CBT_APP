from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, questions, tests, papers
from .database.database import engine
from .database.models import Base
from .database.seed_data import seed_database

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed the database with initial data
seed_database()

app = FastAPI(
    title="CIL CBT Application",
    description="A Computer Based Test application for Coal India Limited",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(auth.router)
app.include_router(questions.router)
app.include_router(tests.router)
app.include_router(papers.router)

@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "services": {
            "database": "connected",
            "cache": "disabled"
        }
    }