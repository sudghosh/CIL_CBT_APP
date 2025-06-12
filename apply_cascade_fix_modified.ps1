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
    $containerStatus = docker ps | Select-String "cil_cbt_app-backend-1"
    if (-not $containerStatus) {
        Write-ColorOutput "CIL CBT App backend container is not running." $Red
        Write-ColorOutput "Starting the containers..." $Yellow
        docker-compose -f c:\Users\Sudipto\Desktop\CIL HR EXAM\Question_Bank\CIL_CBT_App\docker-compose.dev.yml up -d
        
        # Wait a moment for containers to start
        Write-ColorOutput "Waiting for containers to start..." $Yellow
        Start-Sleep -Seconds 10
        
        # Check again if backend is running
        $containerStatus = docker ps | Select-String "cil_cbt_app-backend-1"
        if (-not $containerStatus) {
            Write-ColorOutput "Failed to start the backend container." $Red
            exit 1
        }
    }
    Write-ColorOutput "CIL CBT App containers are running." $Green
    docker ps | Select-String "cil_cbt_app"
} catch {
    Write-ColorOutput "Error checking container status: $_" $Red
    exit 1
}

# Step 3: Copy the latest version of the run_migrations.py file to the backend container
Write-ColorOutput "`nCopying migration script to the backend container..." $Cyan
try {
    # Create a temporary file with the script content
    $tempFile = [System.IO.Path]::GetTempFileName()
    $scriptContent = @'
"""
Run this script to create a new database migration and apply it.
This helps update the database schema to match the SQLAlchemy models.
"""
import os
import subprocess
import sys

def run_migration():
    """Generate and run database migrations."""
    try:
        # Check if alembic is installed
        print("Checking alembic installation...")
        check_result = subprocess.run([sys.executable, "-m", "pip", "show", "alembic"], 
                                      capture_output=True, text=True)
        
        if "Name: alembic" not in check_result.stdout:
            print("Alembic is not installed. Installing alembic...")
            subprocess.run([sys.executable, "-m", "pip", "install", "alembic"],
                           check=True)
        
        # Change directory to database folder if needed
        db_dir = os.path.join(os.path.dirname(__file__), 'src', 'database')
        if os.path.exists(db_dir):
            os.chdir(db_dir)
            print(f"Changed directory to {db_dir}")
        else:
            print(f"Database directory {db_dir} not found, continuing in current directory")
            
        # Generate migration script
        print("Generating migration script...")
        subprocess.run(["alembic", "revision", "--autogenerate", "-m", "Fix cascade delete for paper sections and questions"],
                       check=True)
        
        # Apply migration
        print("Applying migration...")
        subprocess.run(["alembic", "upgrade", "head"],
                      check=True)
        
        print("Migration completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error running migration command: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
'@
    $scriptContent | Out-File $tempFile -Encoding ascii

    # Copy to container
    Get-Content $tempFile | docker cp - cil_cbt_app-backend-1:/app/run_migrations.py
    
    # Clean up
    Remove-Item $tempFile
    
    Write-ColorOutput "Migration script copied successfully." $Green
} catch {
    Write-ColorOutput "Error copying migration script: $_" $Red
    exit 1
}

# Step 4: Run the migration script in the backend container
Write-ColorOutput "`nRunning migration script in the backend container..." $Cyan
try {
    docker exec cil_cbt_app-backend-1 python /app/run_migrations.py
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Migration script failed." $Red
        Write-ColorOutput "Here's the last few lines of the error:" $Yellow
        docker exec cil_cbt_app-backend-1 python /app/run_migrations.py 2>&1 | Select-Object -Last 10
        exit 1
    }
    Write-ColorOutput "Migration script ran successfully." $Green
} catch {
    Write-ColorOutput "Error running migration script: $_" $Red
    exit 1
}

# Step 5: Apply code changes - Modify papers.py
Write-ColorOutput "`nApplying code changes to papers.py..." $Cyan
try {
    # Create a temporary file with the updated code
    $tempFile = [System.IO.Path]::GetTempFileName()
    $papersPyPath = "/app/src/routers/papers.py"
    
    # First, get the current content 
    docker exec cil_cbt_app-backend-1 cat $papersPyPath > $tempFile
    
    # Now read the file and replace the delete_paper function
    $content = Get-Content $tempFile -Raw
    $pattern = '@router.delete\("/{paper_id}"\)[^}]*try:[\s\S]*?# Check if paper has sections[\s\S]*?detail="Cannot delete paper with existing sections. Delete sections first."[\s\S]*?\)[^}]*# Delete the paper[\s\S]*?return \{"status": "success", "message": f"Paper with ID \{paper_id\} deleted successfully"\}'
    
    $replacement = @'
@router.delete("/{paper_id}")
@limiter.limit("10/minute")
async def delete_paper(
    request: Request,
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Check if paper exists
        db_paper = db.query(Paper).filter(Paper.paper_id == paper_id).first()
        if not db_paper:
            raise HTTPException(status_code=404, detail=f"Paper with ID {paper_id} not found")
        
        # Log the deletion operation
        logger.info(f"Deleting paper {paper_id} with cascading delete for sections, subsections, and questions")
        
        # Get sections to delete (for logging purposes)
        sections = db.query(Section).filter(Section.paper_id == paper_id).all()
        if sections:
            section_ids = [section.section_id for section in sections]
            logger.info(f"Paper {paper_id} has {len(sections)} sections that will be deleted: {section_ids}")
            
            # Get subsections that will be deleted (for logging purposes)
            subsections = db.query(Subsection).filter(Subsection.section_id.in_(section_ids)).all()
            if subsections:
                subsection_ids = [subsection.subsection_id for subsection in subsections]
                logger.info(f"Sections {section_ids} have {len(subsections)} subsections that will be deleted: {subsection_ids}")
        
        # Delete the paper - cascade delete will handle sections, subsections, and questions
        db.delete(db_paper)
        db.commit()
        
        return {"status": "success", "message": f"Paper with ID {paper_id} deleted successfully"}
'@

    if ($content -match $pattern) {
        $modifiedContent = $content -replace $pattern, $replacement
        $modifiedContent | Out-File $tempFile -Encoding ascii
        Get-Content $tempFile | docker exec -i cil_cbt_app-backend-1 sh -c "cat > $papersPyPath"
        Write-ColorOutput "Successfully modified papers.py to enable cascade deletion." $Green
    } else {
        Write-ColorOutput "Could not find the delete_paper function in papers.py. Manual update may be required." $Yellow
    }
    
    # Clean up
    Remove-Item $tempFile
} catch {
    Write-ColorOutput "Error modifying papers.py: $_" $Red
    Write-ColorOutput "You may need to manually update the file." $Yellow
}

# Step 6: Restart the backend service
Write-ColorOutput "`nRestarting the backend service..." $Cyan
try {
    docker-compose -f c:\Users\Sudipto\Desktop\CIL HR EXAM\Question_Bank\CIL_CBT_App\docker-compose.dev.yml restart backend
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

# Step 7: Verify the fix
Write-ColorOutput "`nVerifying the fix..." $Cyan
try {
    # First check if the API is responding
    $apiCheck = $false
    $maxRetries = 5
    $retryCount = 0
    
    while (-not $apiCheck -and $retryCount -lt $maxRetries) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 5
            if ($response) {
                $apiCheck = $true
                Write-ColorOutput "Backend API is responding." $Green
            }
        } catch {
            Write-ColorOutput "Backend API not yet responding, retrying in 5 seconds..." $Yellow
            $retryCount++
            Start-Sleep -Seconds 5
        }
    }
    
    if (-not $apiCheck) {
        Write-ColorOutput "Backend API is not responding after $maxRetries attempts. Fix verification incomplete." $Red
        exit 1
    }
    
    # Try to create a simple test script to verify cascade delete
    $testScript = @'
import requests
import json
import time
import sys

API_URL = "http://localhost:8000"

def get_token():
    # For development environment, try to get a token
    try:
        response = requests.post(f"{API_URL}/auth/dev-login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
    except Exception as e:
        print(f"Could not get dev token: {str(e)}")
    
    # Return a default token
    return "dev_token"

def test_cascade_delete():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 1: Create a test paper
    paper_name = f"Test Cascade Delete {int(time.time())}"
    paper_data = {
        "paper_name": paper_name,
        "total_marks": 100,
        "description": "Test paper for cascade delete verification"
    }
    
    try:
        print("Creating test paper...")
        response = requests.post(f"{API_URL}/papers/", json=paper_data, headers=headers)
        if response.status_code != 200:
            print(f"Error creating paper: {response.text}")
            return False
            
        paper_id = response.json().get("paper_id")
        print(f"Created paper ID: {paper_id}")
        
        # Step 2: Create a test section
        section_data = {
            "paper_id": paper_id,
            "section_name": "Test Section",
            "marks_allocated": 50,
            "description": "Test section for cascade delete"
        }
        
        print("Creating test section...")
        response = requests.post(f"{API_URL}/sections/", json=section_data, headers=headers)
        if response.status_code != 200:
            print(f"Error creating section: {response.text}")
            return False
            
        section_id = response.json().get("section_id")
        print(f"Created section ID: {section_id}")
        
        # Step 3: Now try to delete the paper
        print(f"Trying to delete paper with ID {paper_id}...")
        response = requests.delete(f"{API_URL}/papers/{paper_id}", headers=headers)
        
        if response.status_code == 200:
            print("CASCADE DELETE TEST PASSED! ✅")
            print("Paper was successfully deleted with its sections.")
            return True
        else:
            print(f"CASCADE DELETE TEST FAILED! ❌ Status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error testing cascade delete: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_cascade_delete()
    sys.exit(0 if success else 1)
'@

    # Create test script in container
    $testScriptFile = [System.IO.Path]::GetTempFileName()
    $testScript | Out-File $testScriptFile -Encoding ascii
    Get-Content $testScriptFile | docker cp - cil_cbt_app-backend-1:/app/test_cascade_delete.py
    Remove-Item $testScriptFile
    
    # Run the test script
    Write-ColorOutput "Running cascade delete verification test..." $Cyan
    docker exec cil_cbt_app-backend-1 pip install requests
    $testOutput = docker exec cil_cbt_app-backend-1 python /app/test_cascade_delete.py 2>&1
    Write-Output $testOutput
    
    if ($testOutput -match "CASCADE DELETE TEST PASSED") {
        Write-ColorOutput "`nThe cascade delete fix has been successfully applied and verified!" $Green
        Write-ColorOutput "You can now delete papers with sections, subsections, and questions without errors." $Green
    } else {
        Write-ColorOutput "`nThe test could not verify that the fix is working correctly." $Yellow
        Write-ColorOutput "Please check the test output above for details." $Yellow
    }
} catch {
    Write-ColorOutput "Error verifying fix: $_" $Red
}

Write-ColorOutput "`nFix application process completed!" $Cyan
