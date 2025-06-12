# Test script to check if CASCADE delete constraints are properly set up in the database

# Set variables
$postgresContainer = "cil_hr_postgres"
$dbUser = "cildb"
$dbName = "cil_cbt_db"

Write-Host "Checking cascade delete constraints in the database..." -ForegroundColor Cyan

# SQL query to check foreign key constraints
$constraintQuery = @"
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'sections'
       OR tc.table_name = 'subsections'
       OR tc.table_name = 'questions')
ORDER BY tc.table_name, kcu.column_name;
"@

# Execute query
$constraints = docker exec $postgresContainer psql -U $dbUser -d $dbName -t -c "$constraintQuery"

# Display results
Write-Host "Current foreign key constraints:" -ForegroundColor Yellow
Write-Host $constraints

# Check if any constraints have CASCADE delete rule
$hasCascadeDelete = $constraints -match "CASCADE"

if ($hasCascadeDelete) {
    Write-Host "✅ CASCADE DELETE constraints are properly set up!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ No CASCADE DELETE constraints found. Please run the migration script." -ForegroundColor Red
    exit 1
}
