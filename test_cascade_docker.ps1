# Test script to validate the cascade delete constraints in Docker container
# Run this with: ./apply_cascade_fix.ps1 -validationOnly $true

param (
    [switch]$validationOnly = $false
)

# Set variables
$backendContainerPattern = "cil_cbt_app-backend-1"
$postgresContainerPattern = "cil_hr_postgres"

function Find-Container {
    param (
        [string]$pattern
    )
    
    $containers = docker ps --format "{{.Names}}" | Where-Object { $_ -like $pattern }
    
    if ($containers) {
        if ($containers -is [array]) {
            Write-Host "Multiple containers match pattern: $pattern"
            Write-Host "Using the first match: $($containers[0])"
            return $containers[0]
        } else {
            return $containers
        }
    }
    
    Write-Host "No running container matches pattern: $pattern" -ForegroundColor Red
    return $null
}

function Test-CascadeDelete {
    param (
        [string]$postgresContainer
    )
    
    Write-Host "Testing cascade delete functionality..." -ForegroundColor Cyan
      # Run SQL commands to test cascade delete
    $testScript = @"
-- Create a test paper
INSERT INTO papers (paper_name, total_marks, description, is_active, created_by_user_id)
VALUES ('Cascade Test Paper', 100, 'This is a test paper for cascade delete', true, 1)
RETURNING paper_id;
"@    $createPaperResult = docker exec $postgresContainer psql -U cildb -d cil_cbt_db -t -c "$testScript"
    
    # Trim result and log it
    $createPaperResult = $createPaperResult.Trim()
    Write-Host "Create paper result: '$createPaperResult'"
    
    if ($createPaperResult -match "(\d+)") {
        $paperId = $Matches[1]
        Write-Host "Created test paper with ID: $paperId" -ForegroundColor Green
          # Create a test section
        $sectionScript = @"
INSERT INTO sections (paper_id, section_name, marks_allocated, description)
VALUES ($paperId, 'Test Section', 50, 'This is a test section');
"@
        docker exec $postgresContainer psql -U cildb -d cil_cbt_db -c "$sectionScript" | Out-Null
        
        # Verify section exists
        $sectionCheck = docker exec $postgresContainer psql -U cildb -d cil_cbt_db -c "SELECT COUNT(*) FROM sections WHERE paper_id = $paperId;"
        Write-Host "Sections created: $sectionCheck" -ForegroundColor Green
        
        # Now delete the paper and check if sections are also deleted
        Write-Host "Deleting paper ID $paperId to test cascade delete..." -ForegroundColor Yellow
        docker exec $postgresContainer psql -U cildb -d cil_cbt_db -c "DELETE FROM papers WHERE paper_id = $paperId;" | Out-Null
        
        # Check if paper is deleted
        $paperExists = docker exec $postgresContainer psql -U cildb -d cil_cbt_db -t -c "SELECT EXISTS(SELECT 1 FROM papers WHERE paper_id = $paperId);"
        
        # Check if sections are deleted
        $sectionsExist = docker exec $postgresContainer psql -U cildb -d cil_cbt_db -t -c "SELECT EXISTS(SELECT 1 FROM sections WHERE paper_id = $paperId);"
        
        if ($paperExists -match "f" -and $sectionsExist -match "f") {
            Write-Host "CASCADE DELETE TEST PASSED! ✅" -ForegroundColor Green
            Write-Host "Paper and all related sections were successfully deleted" -ForegroundColor Green
            return $true
        } else {
            Write-Host "CASCADE DELETE TEST FAILED! ❌" -ForegroundColor Red
            if ($paperExists -match "t") {
                Write-Host "Paper still exists after deletion attempt" -ForegroundColor Red
            }
            if ($sectionsExist -match "t") {
                Write-Host "Sections still exist after paper deletion" -ForegroundColor Red
            }
            return $false
        }
    } else {
        Write-Host "Failed to create test paper" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "Running cascade delete validation test..." -ForegroundColor Cyan

# Find database container
$postgresContainer = Find-Container -pattern $postgresContainerPattern
if (!$postgresContainer) {
    Write-Host "Cannot find PostgreSQL container. Make sure the application is running." -ForegroundColor Red
    exit 1
}

# Test cascade deletion
$testResult = Test-CascadeDelete -postgresContainer $postgresContainer

if ($testResult) {
    Write-Host "Cascade delete validation completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Cascade delete validation failed. The database constraints may not be properly set up." -ForegroundColor Red
    exit 1
}
