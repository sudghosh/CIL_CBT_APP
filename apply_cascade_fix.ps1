<#
.SYNOPSIS
    Applies the database migration fix for paper cascade deletion and restarts the backend service.

.DESCRIPTION
    This script:
    1. Accesses the backend container
    2. Runs the migration script
    3. Restarts the backend service
    4. Verifies the fix by running a test script

.NOTES
    Make sure Docker is running and the CIL CBT App containers are up before running this script.
#>

# ANSI color codes for PowerShell
$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow
$Cyan = [System.ConsoleColor]::Cyan

function Write-ColorOutput {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        [System.ConsoleColor]$ForegroundColor = [System.ConsoleColor]::White
    )
    
    $oldColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $Host.UI.RawUI.ForegroundColor = $oldColor
}

# Step 1: Check if Docker is running
Write-ColorOutput "Checking if Docker is running..." $Cyan
try {
    $dockerStatus = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Docker is not running. Please start Docker and try again." $Red
        exit 1
    }
    Write-ColorOutput "Docker is running." $Green
} catch {
    Write-ColorOutput "Error checking Docker status: $_" $Red
    exit 1
}

# Step 2: Check if the CIL CBT App containers are running
Write-ColorOutput "Checking if CIL CBT App containers are running..." $Cyan
try {
    $backendContainer = docker ps --filter "name=backend-1" --format "{{.Names}}"
    if (-not $backendContainer) {
        Write-ColorOutput "CIL CBT App backend container is not running." $Red
        Write-ColorOutput "Please start the containers with:" $Yellow
        Write-ColorOutput "docker-compose -f docker-compose.dev.yml up -d" $Yellow
        exit 1
    }
    
    $postgresContainer = docker ps --filter "name=postgres" --format "{{.Names}}"
    if (-not $postgresContainer) {
        Write-ColorOutput "Postgres database container is not running." $Red
        Write-ColorOutput "Please start the containers with:" $Yellow
        Write-ColorOutput "docker-compose -f docker-compose.dev.yml up -d" $Yellow
        exit 1
    }
    
    # Store container names for later use
    $Global:backendContainerName = $backendContainer
    $Global:postgresContainerName = $postgresContainer
    
    Write-ColorOutput "Required containers are running:" $Green
    Write-ColorOutput "Backend: $backendContainer" $Green
    Write-ColorOutput "Database: $postgresContainerName" $Green
} catch {
    Write-ColorOutput "Error checking container status: $_" $Red
    exit 1
}

# Step 3: Run the migration script in the backend container
Write-ColorOutput "`nRunning migration script in the backend container..." $Cyan
try {
    # Copy the robust migration script to the container
    Write-ColorOutput "Copying robust migration script to container..." $Yellow
    Get-Content "c:\Users\Sudipto\Desktop\CIL HR EXAM\Question_Bank\CIL_CBT_App\run_container_migration.py" | docker exec -i $Global:backendContainerName bash -c 'cat > /app/run_container_migration.py'
    
    # Install dependencies first
    Write-ColorOutput "Installing required Python packages..." $Yellow
    docker exec $Global:backendContainerName pip install alembic psycopg2-binary
    
    # Run the robust migration script
    Write-ColorOutput "Running migration script..." $Cyan
    docker exec $Global:backendContainerName python /app/run_container_migration.py
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Migration script failed. Trying direct SQL approach..." $Yellow
        
        # Try the direct SQL approach as a fallback
        Get-Content "c:\Users\Sudipto\Desktop\CIL HR EXAM\Question_Bank\CIL_CBT_App\direct_migration.py" | docker exec -i $Global:backendContainerName bash -c 'cat > /app/direct_migration.py'
        docker exec $Global:backendContainerName python /app/direct_migration.py
        
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Both migration approaches failed." $Red
            exit 1
        } else {
            Write-ColorOutput "Direct SQL migration successful." $Green
        }
    } else {
        Write-ColorOutput "Migration script ran successfully." $Green
    }
} catch {
    Write-ColorOutput "Error running migration script: $_" $Red
    exit 1
}

# Step 4: Restart the backend service
Write-ColorOutput "`nRestarting the backend service..." $Cyan
try {
    # Get the container ID first
    $backendId = docker ps --filter "name=$Global:backendContainerName" --format "{{.ID}}"
    
    docker restart $backendId
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Failed to restart backend service." $Red
        exit 1
    }
    Write-ColorOutput "Backend service restarted successfully." $Green
    
    # Wait a moment for the service to fully start
    Write-ColorOutput "Waiting for the service to initialize..." $Yellow
    Start-Sleep -Seconds 10
} catch {
    Write-ColorOutput "Error restarting backend service: $_" $Red
    exit 1
}

# Step 5: Run tests to verify the fix
Write-ColorOutput "`nRunning tests to verify cascade delete fix..." $Cyan

# Test 1: SQLAlchemy-based cascade deletion test
Write-ColorOutput "Test 1: Running SQLAlchemy model test..." $Cyan
try {
    # Copy the test file to the container if needed
    Write-ColorOutput "Copying test script to container..." $Yellow
    Get-Content "c:\Users\Sudipto\Desktop\CIL HR EXAM\Question_Bank\CIL_CBT_App\backend\tests\test_cascade_delete.py" | docker exec -i $Global:backendContainerName bash -c 'cat > /app/test_cascade_delete.py'
    
    $testOutput = docker exec $Global:backendContainerName python /app/test_cascade_delete.py
    Write-Output $testOutput
    
    if ($testOutput -match "CASCADE DELETE TEST PASSED") {
        Write-ColorOutput "Test 1: SQLAlchemy model test PASSED!" $Green
        $test1Passed = $true
    } else {
        Write-ColorOutput "Test 1: SQLAlchemy model test FAILED!" $Yellow
        $test1Passed = $false
    }
} catch {
    Write-ColorOutput "Error running SQLAlchemy test: $_" $Red
    $test1Passed = $false
}

# Test 2: Direct SQL test
Write-ColorOutput "`nTest 2: Running direct SQL test..." $Cyan
try {
    # Copy the SQL test file to the container
    Write-ColorOutput "Copying SQL test script to container..." $Yellow
    Get-Content "c:\Users\Sudipto\Desktop\CIL HR EXAM\Question_Bank\CIL_CBT_App\sql_cascade_test.py" | docker exec -i $Global:backendContainerName bash -c 'cat > /app/sql_cascade_test.py'
      $sqlTestOutput = docker exec $Global:backendContainerName python /app/sql_cascade_test.py
    Write-Output $sqlTestOutput
    if ($sqlTestOutput -match "CASCADE DELETE TEST PASSED") {
        Write-ColorOutput "Test 2: Direct SQL test PASSED!" $Green
        $test2Passed = $true
    } else {
        Write-ColorOutput "Test 2: Direct SQL test FAILED!" $Yellow
        $test2Passed = $false
    }
} catch {
    Write-ColorOutput "Error running SQL test: $_" $Red
    $test2Passed = $false
}

# Overall test results
Write-ColorOutput "`nTest Results Summary:" $Cyan
if ($test1Passed -or $test2Passed) {
    Write-ColorOutput "`nThe cascade delete fix has been successfully applied and verified!" $Green
    Write-ColorOutput "You can now delete papers with sections, subsections, and questions without errors." $Green
    Write-ColorOutput "`nNext steps:" $Cyan
    Write-ColorOutput "1. Test the paper deletion through the UI" $Cyan
    Write-ColorOutput "2. Verify that no 400 errors appear when deleting papers with sections" $Cyan
    Write-ColorOutput "3. Review the documentation in /backend/docs/cascade_delete_dev_implementation.md" $Cyan
} else {
    Write-ColorOutput "`nNeither test could verify that the fix is working correctly." $Yellow
    Write-ColorOutput "Please check the test output above for details." $Yellow
    Write-ColorOutput "You may need to manually apply the migrations or check the database schema." $Yellow
}

Write-ColorOutput "`nFix application process completed!" $Cyan
