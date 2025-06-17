# Script to fix the max_questions issue and restart the backend

Write-Host "Applying max_questions column migration..." -ForegroundColor Cyan

# Run the migration script
try {
    cd backend
    python add_max_questions_column.py
    cd ..
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error during migration: $_" -ForegroundColor Red
    exit 1
}

# Restart the backend container
Write-Host "Restarting backend container..." -ForegroundColor Cyan
try {
    docker compose restart backend
    Write-Host "Backend restarted successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error restarting backend: $_" -ForegroundColor Red
    
    # Try using docker-compose instead
    try {
        docker-compose restart backend
        Write-Host "Backend restarted successfully with docker-compose!" -ForegroundColor Green
    } catch {
        Write-Host "Error restarting with docker-compose: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Fix applied. Please test the application now." -ForegroundColor Green
