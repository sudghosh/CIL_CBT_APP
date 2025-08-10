# Stage 1: Build stage
FROM python:3.11-slim-bullseye as builder

# Set environment variables for the build stage
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system build dependencies for Python packages.
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
COPY requirements.txt .

# Install Python dependencies as defined in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code into the builder stage.
COPY . .

# Stage 2: Runtime stage
FROM python:3.11-slim-bullseye

# Set environment variables for runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install only essential runtime dependencies.
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
COPY --from=builder --chown=appuser:appuser /app .

# Create necessary directories with correct permissions for the appuser.
RUN mkdir -p /app/logs /var/log/app \
    && chown -R appuser:appuser /app /var/log/app \
    && chmod +x /app/wait-for-db.sh # Keep this, wait-for-db.sh might be useful for local dev

# Switch to the non-root user.
USER appuser

# Health check (optional, but good practice)
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose the port your FastAPI application listens on.
EXPOSE 8000

# Command to start the application.
# *** SIMPLIFIED CMD: Directly start Uvicorn ***
# CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "${PORT}"]
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT}
