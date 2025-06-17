# apply_migrations.ps1
# Script to apply database migrations using Docker container

Write-Host "Running database migrations..." -ForegroundColor Cyan

# Run migrations inside the Docker container
docker exec -it cil_cbt_app_backend alembic -c /app/src/database/alembic.ini upgrade head

Write-Host "Migrations complete!" -ForegroundColor Green
