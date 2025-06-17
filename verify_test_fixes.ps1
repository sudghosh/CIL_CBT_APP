# Script to verify test fixes for option display and adaptive test completion
Write-Host "Starting verification of test fixes..." -ForegroundColor Green

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        $dockerInfo = docker info 2>$null
        return $true
    } catch {
        return $false
    }
}

# Check Docker status
if (Test-DockerRunning) {
    Write-Host "Docker is running. Proceeding with tests..." -ForegroundColor Green
} else {
    Write-Host "Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Step 1: Restart the backend container to ensure latest code is used
Write-Host "Restarting backend container..." -ForegroundColor Yellow
docker-compose restart backend

# Wait for backend to start
Write-Host "Waiting for backend to fully start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 2: Test the options display fix by making a direct API call to the questions endpoint
Write-Host "Testing question options display fix..." -ForegroundColor Yellow

# Get auth token - modify this based on your actual auth method
$authToken = Get-Content -Raw -Path "auth_token.json" | ConvertFrom-Json
$token = $authToken.token

# Create a test attempt
$createAttemptUrl = "http://localhost:8000/tests/start"
$attemptPayload = @{
    template_id = 1  # Use an existing template ID
    adaptive_strategy = "adaptive"
    max_questions = 5  # Set a small number to quickly test the max_questions limit
}
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

Write-Host "Creating test attempt..." -ForegroundColor Yellow
try {
    $attemptResponse = Invoke-RestMethod -Uri $createAttemptUrl -Method Post -Headers $headers -Body ($attemptPayload | ConvertTo-Json)
    $attemptId = $attemptResponse.attempt_id
    Write-Host "Created test attempt with ID: $attemptId" -ForegroundColor Green
} catch {
    Write-Host "Failed to create test attempt: $_" -ForegroundColor Red
    exit 1
}

# Test Fix 1: Check if options are displayed correctly
Write-Host "Testing Fix 1: Question options display..." -ForegroundColor Yellow
try {
    $questionsUrl = "http://localhost:8000/tests/$attemptId/questions"
    $questionsResponse = Invoke-RestMethod -Uri $questionsUrl -Method Get -Headers $headers
    
    # Check if we got questions with options
    if ($questionsResponse.Count -gt 0 -and $questionsResponse[0].options) {
        $firstQuestion = $questionsResponse[0]
        $options = $firstQuestion.options
        
        Write-Host "First question returned with options:" -ForegroundColor Cyan
        Write-Host "Question: $($firstQuestion.question_text)" -ForegroundColor Cyan
        
        # Display the options
        if ($options -is [array]) {
            for ($i = 0; $i -lt $options.Count; $i++) {
                $option = $options[$i]
                if ($option -is [string]) {
                    Write-Host "Option $($i+1): $option" -ForegroundColor Cyan
                } elseif ($option -is [System.Management.Automation.PSCustomObject]) {
                    Write-Host "Option $($i+1): $($option.option_text)" -ForegroundColor Cyan
                }
            }
            
            # Check if options look like placeholders
            $placeholderPattern = "Option \d+"
            $placeholderCount = 0
            foreach ($option in $options) {
                $optionText = if ($option -is [string]) { $option } else { $option.option_text }
                if ($optionText -match $placeholderPattern) {
                    $placeholderCount++
                }
            }
            
            if ($placeholderCount -eq $options.Count) {
                Write-Host "FIX 1 VERIFICATION FAILED: All options are still generic placeholders!" -ForegroundColor Red
            } else {
                Write-Host "FIX 1 VERIFICATION PASSED: Options are not generic placeholders!" -ForegroundColor Green
            }
        } else {
            Write-Host "WARNING: Options are not in the expected array format!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "FIX 1 VERIFICATION FAILED: No questions/options returned!" -ForegroundColor Red
    }
} catch {
    Write-Host "Error testing options fix: $_" -ForegroundColor Red
}

# Test Fix 2: Check if adaptive test completes after max_questions
Write-Host "Testing Fix 2: Adaptive test completion after max_questions..." -ForegroundColor Yellow

# Submit 5 answers to reach the max_questions limit
$completed = $false
for ($i = 1; $i -le 5; $i++) {
    # First get a question if we don't have one yet
    if ($i -eq 1) {
        $questionsUrl = "http://localhost:8000/tests/$attemptId/questions"
        $questions = Invoke-RestMethod -Uri $questionsUrl -Method Get -Headers $headers
        $questionId = $questions[0].question_id
    }
    
    # Submit an answer and get next question
    $nextQuestionUrl = "http://localhost:8000/tests/$attemptId/next_question"
    $answerPayload = @{
        question_id = $questionId
        selected_option_id = 0  # Just select the first option for testing
        time_taken_seconds = 5
    }
    
    Write-Host "Submitting answer $i of 5..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri $nextQuestionUrl -Method Post -Headers $headers -Body ($answerPayload | ConvertTo-Json)
        
        # Check if test was automatically completed
        if ($response.status -eq "complete") {
            Write-Host "FIX 2 VERIFICATION PASSED: Test was automatically completed after $i questions!" -ForegroundColor Green
            $completed = $true
            break
        }
        
        # Get the next question's ID for the next iteration
        if ($response.next_question) {
            $questionId = $response.next_question.question_id
        } else {
            Write-Host "No next question available after $i answers" -ForegroundColor Yellow
            break
        }
    } catch {
        Write-Host "Error during test: $_" -ForegroundColor Red
        break
    }
}

if (-not $completed) {
    # Check attempt status to verify if it was completed
    $attemptDetailsUrl = "http://localhost:8000/attempts/$attemptId/details"
    try {
        $attemptDetails = Invoke-RestMethod -Uri $attemptDetailsUrl -Method Get -Headers $headers
        if ($attemptDetails.status -eq "Completed") {
            Write-Host "FIX 2 VERIFICATION PASSED: Test status is 'Completed' after reaching max questions!" -ForegroundColor Green
        } else {
            Write-Host "FIX 2 VERIFICATION FAILED: Test was not completed after answering max questions!" -ForegroundColor Red
        }
    } catch {
        Write-Host "Failed to check attempt status: $_" -ForegroundColor Red
    }
}

Write-Host "Test verification completed." -ForegroundColor Green
