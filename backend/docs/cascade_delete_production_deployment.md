# Production Deployment Guide: Paper Cascade Deletion Fix

## Overview

This document provides instructions for deploying the cascade deletion fix for papers, sections, subsections, and questions to the production environment. The fix ensures that when a paper is deleted, all related sections, subsections, and questions are automatically deleted as well.

## Issue Description

In the current production environment, users receive a `400 Bad Request` error with the message "Cannot delete paper with existing sections. Delete sections first" when attempting to delete papers that have sections. This behavior contradicts the expected cascade delete functionality where deleting a parent entity should automatically delete all its child entities.

## Fix Implementation

The fix involves the following components:

1. **Code Changes**:
   - Remove validation checks in the `papers.py` router that prevent deletion of papers with sections
   - Remove validation checks in the `sections.py` router that prevent deletion of sections with subsections
   - Add proper logging of cascade deletion operations

2. **Database Schema Changes**:
   - Add `ondelete="CASCADE"` to foreign key relationships
   - Add `cascade="all, delete-orphan"` to SQLAlchemy relationship definitions
   - Update database constraints to allow cascade deletion

## Deployment Steps

### Prerequisites

- Schedule a maintenance window for the database migration
- Backup the production database before applying changes
- Ensure Docker and Docker Compose are running correctly
- Verify backend tests pass before deploying to production

### Automated Deployment

1. Execute the production deployment script:
   ```powershell
   .\apply_cascade_fix_production.ps1
   ```

2. The script will:
   - Create a backup of the production database
   - Apply the database migration
   - Restart the backend service
   - Verify the API is responding correctly
   - Update the deployment log

### Manual Deployment

If the automated deployment script fails, you can manually apply the fix:

1. **Backup the production database**:
   ```powershell
   docker exec cil_cbt_app-postgres-1 pg_dump -U cildb -d cil_cbt_db > cil_cbt_db_backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
   ```

2. **Copy the migration script to the backend container**:
   ```powershell
   Get-Content "c:\Users\Sudipto\Desktop\CIL HR EXAM\Question_Bank\CIL_CBT_App\backend\run_migrations.py" | docker exec -i cil_cbt_app-backend-1 bash -c 'cat > run_migrations.py'
   ```

3. **Run the migration script**:
   ```powershell
   docker exec cil_cbt_app-backend-1 python run_migrations.py
   ```

4. **Restart the backend service**:
   ```powershell
   docker-compose -f docker-compose.prod.yml restart backend
   ```

## Verification

After deploying the fix, verify that:

1. The backend API health endpoint returns a successful response:
   ```powershell
   curl http://localhost:8000/health
   ```

2. Paper deletion operations work correctly with sections:
   - Navigate to the Paper & Section Management page
   - Try to delete a paper that has sections
   - Verify that the paper and all its sections, subsections, and questions are deleted

3. Check the logs for correct operation:
   ```powershell
   docker logs cil_cbt_app-backend-1
   ```
   Look for entries like: "Deleting paper X with cascading delete for sections, subsections, and questions"

## Rollback Plan

If issues occur after deployment:

1. Stop the backend service:
   ```powershell
   docker-compose -f docker-compose.prod.yml stop backend
   ```

2. Restore the database from the backup:
   ```powershell
   cat backup_file.sql | docker exec -i cil_cbt_app-postgres-1 psql -U cildb -d cil_cbt_db
   ```

3. Start the backend service with the previous version:
   ```powershell
   docker-compose -f docker-compose.prod.yml start backend
   ```

## Contact Information

If you encounter any issues with the deployment:
- Contact the development team
- Reference this documentation and the paper_cascade_deletion_fix.md file in the backend/docs directory
