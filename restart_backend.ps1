# Script to restart the backend service
Write-Host "Restarting the backend service..." -ForegroundColor Green

# Navigate to the directory where docker-compose is located
$projectDir = $PSScriptRoot
Set-Location -Path $projectDir

# Restart the backend container
try {
    Write-Host "Stopping backend container..." -ForegroundColor Yellow
    docker-compose stop backend
    
    Write-Host "Starting backend container..." -ForegroundColor Yellow
    docker-compose start backend
    
    Write-Host "Backend service restarted successfully." -ForegroundColor Green
    Write-Host "Please wait a few moments for the service to fully initialize before attempting uploads again."
}
catch {
    Write-Host "Error restarting backend service: $_" -ForegroundColor Red
    Write-Host "You may need to run 'docker-compose down' and then 'docker-compose up -d' to fully restart all services."
}
