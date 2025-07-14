# auth_troubleshooter.ps1
# Script to troubleshoot and fix authentication issues between frontend and backend

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Authentication Troubleshooter for CIL HR Exam Application" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running." -ForegroundColor Green
} catch {
    Write-Host "✗ Docker does not appear to be running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check if backend container is running
Write-Host "Checking backend container status..." -ForegroundColor Yellow
$backendRunning = $false
try {
    $backendContainer = docker ps --filter "name=cil_cbt_app-backend" --format "{{.Names}}"
    if ($backendContainer) {
        Write-Host "✓ Backend container is running: $backendContainer" -ForegroundColor Green
        $backendRunning = $true
    } else {
        Write-Host "✗ Backend container is not running." -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Failed to check backend container status." -ForegroundColor Red
}

# Check if frontend container is running
Write-Host "Checking frontend container status..." -ForegroundColor Yellow
$frontendRunning = $false
try {
    $frontendContainer = docker ps --filter "name=cil_cbt_app-frontend" --format "{{.Names}}"
    if ($frontendContainer) {
        Write-Host "✓ Frontend container is running: $frontendContainer" -ForegroundColor Green
        $frontendRunning = $true
    } else {
        Write-Host "✗ Frontend container is not running." -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Failed to check frontend container status." -ForegroundColor Red
}

# Function to check if a port is open
function Test-Port {
    param (
        [string]$ComputerName = "localhost",
        [int]$Port
    )
    
    try {
        $tcp = New-Object Net.Sockets.TcpClient
        $connection = $tcp.BeginConnect($ComputerName, $Port, $null, $null)
        $wait = $connection.AsyncWaitHandle.WaitOne(1000, $false)
        
        if ($wait) {
            try {
                $tcp.EndConnect($connection)
                return $true
            } catch {
                return $false
            }
        } else {
            return $false
        }
    } catch {
        return $false
    } finally {
        if ($tcp) {
            $tcp.Close()
        }
    }
}

# Check if backend API is accessible
Write-Host "Checking backend API accessibility..." -ForegroundColor Yellow
if (Test-Port -Port 8000) {
    Write-Host "✓ Backend API port (8000) is open." -ForegroundColor Green
    
    # Check health endpoint
    try {
        $healthResult = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
        Write-Host "✓ Backend health check successful: " -ForegroundColor Green -NoNewline
        Write-Host "$($healthResult | ConvertTo-Json -Compress)"
    } catch {
        Write-Host "✗ Backend health check failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Backend API port (8000) is not accessible." -ForegroundColor Red
}

# Check if frontend is accessible
Write-Host "Checking frontend accessibility..." -ForegroundColor Yellow
if (Test-Port -Port 3000) {
    Write-Host "✓ Frontend port (3000) is open." -ForegroundColor Green
} else {
    Write-Host "✗ Frontend port (3000) is not accessible." -ForegroundColor Red
}

# Check auth token file
Write-Host "Checking auth_token.json file..." -ForegroundColor Yellow
if (Test-Path "auth_token.json") {
    Write-Host "✓ auth_token.json file exists." -ForegroundColor Green
    
    # Check token validity
    try {
        $tokenData = Get-Content "auth_token.json" -Raw | ConvertFrom-Json
        if ($tokenData.access_token) {
            # Do basic validation (JWT tokens have 3 parts separated by dots)
            $tokenParts = $tokenData.access_token -split "\."
            if ($tokenParts.Count -eq 3) {
                Write-Host "✓ Token appears valid (has 3 parts)." -ForegroundColor Green
                
                # Check if token is expired
                try {
                    # Decode the middle part (payload)
                    $tokenPayload = [System.Text.Encoding]::UTF8.GetString(
                        [Convert]::FromBase64String(($tokenParts[1] + "==").Replace("-", "+").Replace("_", "/"))
                    ) | ConvertFrom-Json
                    
                    if ($tokenPayload.exp) {
                        $expirationDate = [DateTimeOffset]::FromUnixTimeSeconds($tokenPayload.exp).DateTime
                        if ($expirationDate -gt (Get-Date)) {
                            $daysRemaining = ($expirationDate - (Get-Date)).Days
                            Write-Host "✓ Token is valid until $expirationDate ($daysRemaining days remaining)." -ForegroundColor Green
                        } else {
                            Write-Host "✗ Token is expired. Expired on $expirationDate." -ForegroundColor Red
                        }
                    }
                } catch {
                    Write-Host "! Could not decode token payload to check expiration." -ForegroundColor Yellow
                }
            } else {
                Write-Host "✗ Token does not appear to be a valid JWT token (doesn't have 3 parts)." -ForegroundColor Red
            }
        } else {
            Write-Host "✗ No access_token found in auth_token.json." -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Failed to parse auth_token.json: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ auth_token.json file does not exist." -ForegroundColor Red
}

# Check frontend token.js file
Write-Host "Checking frontend/token.js file..." -ForegroundColor Yellow
if (Test-Path "frontend/token.js") {
    Write-Host "✓ frontend/token.js file exists." -ForegroundColor Green
    
    # Check token content
    try {
        $tokenJsContent = Get-Content "frontend/token.js" -Raw
        if ($tokenJsContent -match "TOKEN\s*=\s*['`"](.+)['`"]") {
            $frontendToken = $matches[1]
            Write-Host "✓ Found token in token.js." -ForegroundColor Green
            
            # Check if tokens match
            if (Test-Path "auth_token.json") {
                $authToken = (Get-Content "auth_token.json" -Raw | ConvertFrom-Json).access_token
                if ($frontendToken -eq $authToken) {
                    Write-Host "✓ Frontend token matches auth_token.json." -ForegroundColor Green
                } else {
                    Write-Host "✗ Frontend token does not match auth_token.json." -ForegroundColor Red
                }
            }
        } else {
            Write-Host "✗ Could not find TOKEN variable in token.js." -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Failed to parse frontend/token.js: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ frontend/token.js file does not exist." -ForegroundColor Red
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Fixing Authentication Issues" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to regenerate the token
$regenerateToken = Read-Host "Do you want to regenerate the authentication token? (y/n)"
if ($regenerateToken -eq "y") {
    Write-Host "Regenerating authentication token..." -ForegroundColor Yellow
    try {
        python get_auth_token.py
        Write-Host "✓ Token regenerated successfully." -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to regenerate token: $_" -ForegroundColor Red
    }
}

# Open the test pages
$openTestPages = Read-Host "Do you want to open the API test pages? (y/n)"
if ($openTestPages -eq "y") {
    Write-Host "Opening test pages..." -ForegroundColor Yellow
    
    # Open backend test page
    Start-Process "http://localhost:8000/docs"
    Write-Host "✓ Opened backend Swagger UI" -ForegroundColor Green
    
    # Open frontend test HTML
    if (Test-Path "frontend_api_test.html") {
        Start-Process "frontend_api_test.html"
        Write-Host "✓ Opened frontend API test page" -ForegroundColor Green
    }
    
    # Open token check page
    if (Test-Path "frontend\public\token-check.html") {
        Start-Process "frontend\public\token-check.html"
        Write-Host "✓ Opened token check utility page" -ForegroundColor Green
    }
}

# Ask if user wants to restart the containers
$restartContainers = Read-Host "Do you want to restart the Docker containers? (y/n)"
if ($restartContainers -eq "y") {
    Write-Host "Restarting Docker containers..." -ForegroundColor Yellow
    
    try {
        docker-compose -f docker-compose.dev.yml restart
        Write-Host "✓ Containers restarted successfully." -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to restart containers: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Authentication Troubleshooting Complete" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
