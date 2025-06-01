# Stage 1: Build stage
# Uses python:3.11-slim-bullseye as per your existing Dockerfile
FROM python:3.11-slim-bullseye as builder

# Set environment variables for the build stage
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system build dependencies for Python packages.
# Added gfortran and libatlas-base-dev for optimal numpy/pandas compilation,
# which can resolve 'numpy.dtype size changed' errors.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        gfortran \
        libatlas-base-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for the builder stage
WORKDIR /app

# Copy requirements.txt first to leverage Docker cache.
# Assumes requirements.txt is in the build context root (e.g., in the 'backend' folder).
COPY requirements.txt .

# Install Python dependencies as defined in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code into the builder stage.
# This includes src/, init/, wait-for-db.sh, etc. from your backend directory.
COPY . .

# Stage 2: Runtime stage
# This stage will be smaller and only contain what's necessary for running the app.
FROM python:3.11-slim-bullseye

# Set environment variables for runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install only essential runtime dependencies.
# postgresql-client is needed to run psql commands in wait-for-db.sh or init_db.py.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for the runtime stage for better security practices.
RUN useradd -m -u 1000 appuser

# Set working directory for the runtime stage
WORKDIR /app

# Copy installed Python packages from the builder stage.
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
# Copy executables like uvicorn, if they are installed in /usr/local/bin by pip.
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
# Copy the application code from the builder stage, ensuring correct ownership.
# This brings src/, init/, wait-for-db.sh, etc. to the final image.
COPY --from=builder --chown=appuser:appuser /app .

# Create necessary directories with correct permissions for the appuser.
RUN mkdir -p /app/logs /var/log/app \
    && chown -R appuser:appuser /app /var/log/app \
    && chmod +x /app/wait-for-db.sh

# Switch to the non-root user.
USER appuser

# Health check to ensure the application is running.
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose the port your FastAPI application listens on.
EXPOSE 8000

# Command to start the application.
# This ensures the database is ready, then runs your init_db.py script,
# and finally starts the Uvicorn server.
CMD ["sh", "-c", "./wait-for-db.sh postgres && python init/init_db.py && exec uvicorn src.main:app --host 0.0.0.0 --port 8000"]