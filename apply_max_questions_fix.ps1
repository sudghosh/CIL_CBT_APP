# Apply Max Questions Fix PowerShell Script

Write-Host "Applying fix for max_questions column issue" -ForegroundColor Cyan

# Function to check if the backend is running in Docker
function Test-DockerBackend {
    try {
        $dockerRunning = docker ps --format "{{.Names}}" | Select-String "backend"
        if ($dockerRunning) {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Function to update the database schema in Docker
function Update-DockerDatabase {
    Write-Host "Executing migration in Docker container..." -ForegroundColor Yellow
    
    # Get the backend container ID
    $containerId = docker ps --filter "name=backend" --format "{{.ID}}"
    
    if (-not $containerId) {
        Write-Host "No backend container found. Please make sure the Docker services are running." -ForegroundColor Red
        return $false
    }
    
    # Copy the migration script to the container
    Write-Host "Copying migration script to container..."
    Set-Content -Path "./temp_migration.py" -Value @"
from sqlalchemy import create_engine, text
import os

# Get database URL from environment in the container
DATABASE_URL = os.environ.get('DATABASE_URL')
print(f"Using database URL: {DATABASE_URL.split('@')[0].split('://')[0]}://*****@{DATABASE_URL.split('@')[1]}")

# Run the migration
print("Starting migration to add max_questions column to test_attempts table")

try:
    # Connect to the database
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Check if column exists
        check_column_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'test_attempts' 
              AND column_name = 'max_questions';
        """)
        
        result = connection.execute(check_column_query)
        column_exists = result.fetchone() is not None
        
        if column_exists:
            print("Column max_questions already exists in test_attempts table. No changes needed.")
        else:
            # Add the column
            print("Adding max_questions column to test_attempts table...")
            add_column_query = text("""
                ALTER TABLE test_attempts
                ADD COLUMN max_questions INTEGER;
            """)
            
            connection.execute(add_column_query)
            
            # Add comment to describe the column's purpose
            comment_query = text("""
                COMMENT ON COLUMN test_attempts.max_questions 
                IS 'Maximum number of questions for adaptive tests';
            """)
            
            connection.execute(comment_query)
            
            print("Successfully added max_questions column to test_attempts table")
            
    print("Migration completed successfully!")
            
except Exception as e:
    print(f"Error during migration: {e}")
    exit(1)
"@

    docker cp ./temp_migration.py ${containerId}:/app/temp_migration.py
    Remove-Item -Path "./temp_migration.py"
    
    # Execute the script in the container
    Write-Host "Running migration in the container..."
    docker exec $containerId python /app/temp_migration.py
    
    return $true
}

# Main script execution
Write-Host "Checking if the backend is running in Docker..."
$isDockerBackend = Test-DockerBackend

if ($isDockerBackend) {
    Write-Host "Backend is running in Docker. Will apply migration through Docker." -ForegroundColor Green
    $success = Update-DockerDatabase
    
    if ($success) {
        Write-Host "Migration completed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Migration failed. Please check the error messages above." -ForegroundColor Red
    }
}
else {
    Write-Host "Backend does not appear to be running in Docker." -ForegroundColor Yellow
    Write-Host "Please apply the migration manually or ensure the Docker containers are running." -ForegroundColor Yellow
    Write-Host "You can run the add_max_questions_column.py script directly on the server." -ForegroundColor Yellow
}

Write-Host "`nVerify the fix:" -ForegroundColor Cyan
Write-Host "1. Try starting a test (both adaptive and non-adaptive)" -ForegroundColor White
Write-Host "2. Check if tests complete correctly when the maximum questions are reached" -ForegroundColor White
Write-Host "3. Verify that test results are displayed correctly" -ForegroundColor White

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
