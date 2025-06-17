# Apply Question Option and Adaptive Test Fixes
# This script restarts the backend to apply the fixes for:
# 1. Question options displaying as "Option 1, Option 2..." instead of actual text
# 2. Adaptive tests not ending after the specified number of questions

# Set working directory to CIL_CBT_App folder
Write-Host "Setting working directory to CIL_CBT_App..."
Set-Location -Path $PSScriptRoot

# Check if docker is running
Write-Host "Checking if Docker is running..."
$dockerRunning = $false
try {
    $dockerStatus = docker info 2>&1
    $dockerRunning = $true
    Write-Host "Docker is running."
} 
catch {
    Write-Host "Docker does not appear to be running. Please start Docker and try again." -ForegroundColor Red
    Write-Host "Error: $_"
    exit 1
}

if ($dockerRunning) {
    # Restart the backend container
    Write-Host "Restarting backend container to apply fixes..." -ForegroundColor Yellow
    docker compose -f docker-compose.dev.yml restart backend
    
    # Wait for backend to start
    Write-Host "Waiting for backend to start up..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Check if backend is responding
    Write-Host "Checking if backend is responding..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend is up and responding." -ForegroundColor Green
        } else {
            Write-Host "Backend may not be fully initialized. Status code: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Backend health check failed. It may still be starting up." -ForegroundColor Red
        Write-Host "Error: $_"
    }
    
    Write-Host ""
    Write-Host "Fixes have been applied:" -ForegroundColor Green
    Write-Host "1. Question options should now display correctly instead of generic 'Option X' text" -ForegroundColor Green
    Write-Host "2. Adaptive tests should now end automatically after reaching the maximum number of questions" -ForegroundColor Green
    Write-Host ""
    Write-Host "To verify the fixes:"
    Write-Host "- Try taking a test and check if the options display correctly"
    Write-Host "- For adaptive tests, set a max_questions value and verify the test ends after answering that many questions"
    Write-Host ""
    Write-Host "Documentation can be found at: docs/adaptive-test-option-fixes.md"
} else {
    Write-Host "Docker is not running. Please start Docker and try again." -ForegroundColor Red
}
