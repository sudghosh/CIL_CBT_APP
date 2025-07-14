# CIL CBT App

## Production Deployment Notice

**For production deployments:**
- Use the `.env.prod` file and fill in all required secrets and production values (see comments in the file).
- Follow the step-by-step instructions in `production_deployment_guide.md` for secure deployment, database migration, and validation.
- Never use development or test secrets in production.
- For details on environment variables, see the top of `.env.prod`.


Computer-Based Testing Application for Coal India Limited HR Examinations

## Features

- **Adaptive Test Difficulty**: Automatically adjusts question difficulty based on user performance
- **User Performance Tracking**: Comprehensive analytics and reporting on user test performance
- **Test Templates**: Create and manage test templates with various sections and question types
- **Question Bank**: Maintain a database of questions with categories, difficulty levels, and topics
- **Secure Authentication**: Role-based access control for examinees, admins, and supervisors
- **Result Analysis**: Detailed performance metrics and analytics

## New Features (June 2025)

### Adaptive Testing

The application now supports adaptive testing with different strategies:

- **Progressive Difficulty**: Adjusts questions based on user performance
- **Multiple Strategies**: Choose from various adaptive algorithms
- **Difficulty Levels**: Questions categorized as Easy, Medium, or Hard

[View Adaptive Testing Documentation](./docs/adaptive_testing_guide.md)

### Performance Dashboard

Track and analyze user performance with:

- **Overall Performance Metrics**: Aggregate statistics across all tests
- **Topic-wise Analysis**: Identify strengths and weaknesses by subject area
- **Difficulty Breakdown**: Analyze performance across question difficulty levels
- **Response Time Tracking**: Monitor speed and accuracy

[View Performance Dashboard Documentation](./docs/performance_dashboard_guide.md)

## Getting Started

### Prerequisites

- Python 3.8+
- PostgreSQL
- Docker and Docker Compose (for containerized deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CIL/cbt-app.git
cd cbt-app
```

2. Set up the environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Configure the database:
```bash
cd backend
alembic upgrade head
```

4. Run the application:
```bash
uvicorn src.main:app --reload
```

### Docker Deployment

For production deployment:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

For development:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

## API Documentation

API documentation is available at `/docs` or `/redoc` when the application is running.

## Developer Documentation

- [Adaptive Testing & Performance Tracking](./docs/adaptive_performance_dev_guide.md)
- [Database Schema](./docs/database_schema.md)
- [API Reference](./docs/api_reference.md)

## Environment Variables & Secrets Management

**Important for All Collaborators:**
- Environment files (`.env`, `.env.dev`, `.env.prod`, etc.) and any secrets folders are **never** tracked in git. You must create and manage these files locally or in your deployment environment.

### How to Use Environment Files

- **Development:**
  - Copy `.env.dev` to `.env` in your local root or backend folder.
  - Fill in development credentials (never use production secrets for local dev).
  - Example:
    ```
    cp .env.dev .env
    ```

- **Production:**
  - Copy `.env.prod` to `.env` on your deployment server or Docker container.
  - Fill in all production secrets and credentials before starting the app.
  - Example:
    ```
    cp .env.prod .env
    ```

- **Backend/Frontend/DB:**
  - Each service may have its own `.env` file (e.g., `backend/.env`, `frontend/.env`, `db/.env`).
  - Always use the correct template and fill in the required values.

### Security Best Practices

- **Never commit any `.env` or secrets files to git.**
- `.gitignore` is configured to exclude all secret files and folders.
- If you suspect a secret was ever exposed, rotate it immediately.
- Store production secrets securely (e.g., server environment, Docker secrets, or a secrets manager).

### After a Git History Rewrite

- All collaborators **must re-clone** the repository after a history rewrite (e.g., after secrets are purged from git history).
- Old clones will not work with the new history.

---

**If you have questions about environment setup or secrets management, contact the project maintainer.**

## Testing

Run the test suite:

```bash
python -m pytest tests/ -v -s --cov=src --cov-report=html
```

## License

Copyright © 2025 Coal India Limited. All rights reserved.
