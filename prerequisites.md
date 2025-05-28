# Prerequisites for CIL CBT Application

## System Requirements

### Software Requirements
1. **Docker & Docker Compose**
   - Docker Desktop for Windows/Mac or Docker Engine for Linux
   - Docker Compose version 2.0 or higher
   - Minimum 8GB RAM allocated to Docker

2. **Development Tools**
   - Git (version 2.30 or higher)
   - Visual Studio Code or any modern IDE
   - Node.js 18.x or higher (for local development)
   - Python 3.11 or higher (for local development)

### Hardware Requirements
- Minimum 8GB RAM (16GB recommended)
- 20GB free disk space
- Dual-core processor or better

## Google OAuth Setup
1. Create a project in Google Cloud Console
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Configure authorized origins:
   - `http://localhost:3000` (development)
   - `http://localhost` (development)
   - Your production domain
5. Configure authorized redirect URIs:
   - `http://localhost:3000/login` (development)
   - `http://localhost:3000` (development)
   - Your production domain/login

## Environment Setup

### Required Environment Variables
1. **Backend (.env.dev)**
   ```
   POSTGRES_USER=cildb
   POSTGRES_PASSWORD=cildb123
   POSTGRES_DB=cil_cbt_db
   DATABASE_URL=postgresql://cildb:cildb123@postgres:5432/cil_cbt_db
   SECRET_KEY=your-secret-key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

2. **Frontend (environment variables in docker-compose.dev.yml)**
   ```
   NODE_ENV=development
   REACT_APP_API_URL=http://localhost:8000
   REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
   ```

### Port Requirements
The following ports must be available:
- 3000: Frontend application
- 8000: Backend API
- 5432: PostgreSQL database

## Getting Started

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd CIL_CBT_App
   ```

2. **Environment Files**
   - Copy `.env.dev.example` to `.env.dev`
   - Update with your Google OAuth credentials
   - Update any other environment-specific variables

3. **Start the Application**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **First-time Database Setup**
   ```bash
   # Inside backend container
   alembic upgrade head
   python src/database/seed_data.py
   ```

## Development Setup (Optional)

### Frontend Development
Required VS Code Extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

### Backend Development
Required VS Code Extensions:
- Python
- Pylance
- Docker

### Testing Tools
- Jest for frontend testing
- Pytest for backend testing
- Postman or similar API testing tool

## Troubleshooting

### Common Issues
1. Port conflicts
   - Ensure ports 3000, 8000, and 5432 are not in use
   - Stop any existing PostgreSQL instances

2. Docker memory issues
   - Increase Docker memory allocation in Docker Desktop settings
   - Minimum 8GB recommended

3. Google OAuth issues
   - Verify credentials in Google Cloud Console
   - Check authorized domains and redirect URIs
   - Ensure environment variables are correctly set

### Support
For additional support:
1. Check the project documentation
2. Review Docker and application logs
3. Contact the development team

## Security Notes
- Never commit .env files containing sensitive data
- Keep Google OAuth credentials secure
- Regularly update dependencies
- Follow security best practices for production deployment
