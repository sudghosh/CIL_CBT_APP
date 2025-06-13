# Question Upload Issue Fix

## Problem

When uploading questions via CSV or Excel, you may encounter this error:

```
Upload failed: Error in row 1: (psycopg2.errors.ForeignKeyViolation) insert or update on table "questions" violates foreign key constraint "questions_paper_id_fkey" 
DETAIL: Key (paper_id)=(1) is not present in table "papers".
```

This happens because the sample template uses `paper_id=1`, but this paper doesn't exist in your database.

## Solutions

There are two ways to fix this issue:

### Option 1: Create a Sample Paper with ID 1

Run the provided PowerShell script to create a sample paper with ID 1:

```powershell
.\create_sample_paper.ps1
```

This will create a paper with ID 1 in the database, allowing you to use the template as-is.

### Option 2: Update the CSV Template

Alternatively, you can:

1. Get a list of available papers from the Papers Management page
2. Edit the CSV file to use an existing paper_id from your system
3. Save and upload the edited file

## Application Enhancements

The application has been updated to:

1. Validate paper IDs before attempting to upload questions
2. Provide better error messages when a paper_id doesn't exist
3. Offer to create a sample paper when needed

## For Developers

The foreign key constraint error is properly handled now with:

1. Frontend validation of paper_ids against existing papers
2. Enhanced error messages for foreign key violations
3. A helper script to create sample test papers

If you're developing further uploads, make sure to check that any referenced IDs (paper_id, section_id, etc.) exist in the database before attempting to upload data.
