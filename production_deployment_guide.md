# Production Deployment Summary - Cascade Delete Fix

## Overview
This document outlines the steps for deploying the cascade delete fix to the production environment. The fix resolves the issue where deleting papers in the Paper & Section Management page fails with a 400 error message "Cannot delete paper with existing sections. Delete sections first."

## Tested Changes
The following changes have been implemented and tested in the development environment:

1. **Database Constraints**: Added cascade delete constraints to foreign key relationships between:
   - papers → sections
   - sections → subsections
   - sections → questions
   - subsections → questions

2. **API Endpoint**: Modified the delete_paper endpoint in papers.py to remove the explicit check for existing sections, allowing the cascade delete to handle removing related entities.

3. **Model Relationships**: Updated SQLAlchemy model relationships to include cascade="all, delete-orphan" for proper object relationship management.

## Validation Tests
The following tests have been performed and passed:

1. **Database Constraint Check**: Verified that CASCADE constraints are properly set up in the database schema.
2. **Direct SQL Test**: Confirmed that deleting a paper via SQL also deletes all related sections, subsections, and questions.
3. **API Test**: Verified that the paper deletion API endpoint correctly deletes all related entities.

## Deployment Steps

### 1. Backup the Production Database
```powershell
# Run this command to create a backup before making any changes
docker exec cil_hr_postgres_prod pg_dump -U cildb -d cil_cbt_db > cil_cbt_db_backup_prod_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### 2. Run the Cascade Fix Migration Script
```powershell
# Execute the production cascade fix script
./apply_cascade_fix_production.ps1
```

The script will:
- Identify the correct container names
- Apply direct SQL migration to add CASCADE constraints
- Validate that constraints were correctly applied

### 3. Verify the Fix
After deployment:
1. Test paper deletion through the UI:
   - Create a test paper with sections
   - Attempt to delete the paper
   - Verify that no 400 error occurs

2. Run validation scripts:
```powershell
# Run the check_constraints.ps1 script
./check_constraints.ps1

# Run the cascade delete test
python db_cascade_test.py
```

### 4. Rollback Plan
If any issues are encountered, restore the database from the backup:
```powershell
# Stop the existing containers
docker compose -f docker-compose.prod.yml down

# Restore the database
cat backup_filename.sql | docker exec -i cil_hr_postgres_prod psql -U cildb -d cil_cbt_db

# Restart the containers
docker compose -f docker-compose.prod.yml up -d
```

## Technical Details
The fix works by:
1. Adding ON DELETE CASCADE constraints at the database level
2. Removing explicit validation checks in the API
3. Ensuring model relationships include cascade delete

## Summary of Changes
The following files were modified:
- `backend/src/database/models.py` - Added cascade relationships
- `backend/src/routers/papers.py` - Removed explicit section check
- `direct_migration.py` - Added constraints via direct SQL

## Contributors
- Development Team
- QA Team

## Date
June 12, 2025
