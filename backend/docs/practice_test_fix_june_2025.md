# Practice Test 'No active questions' Fix - June 2025

## Issue Description

Users were encountering an error message "No active questions available for the selected sections" when trying to start a practice test, even though questions exist in the database for the selected sections.

## Root Cause Analysis

After investigation, we found several issues contributing to the problem:

1. The `/tests/start` endpoint was only checking for active questions using the `valid_until` date field.
2. Some questions had `valid_until` dates in the past, making them inactive.
3. The error message wasn't specific enough to indicate whether questions didn't exist or were just inactive.
4. There was no easy way to visualize or fix questions with expired validity dates.

## Fix Implementation

The following fixes were implemented:

### 1. Enhanced Logging and Validation

Added additional logging to better understand question filtering:
- Added logging of question counts before and after applying the `valid_until` filter
- This helps identify if questions exist but are inactive

### 2. Improved Error Messages

Updated error messages to be more specific:
- Now distinguishes between cases where no questions exist vs. questions exist but are inactive
- More informative error handling for users and administrators

### 3. Question Activation Endpoint

Added a new API endpoint to reactivate questions:
```
POST /questions/activate/{paper_id}/{section_id}
```

This endpoint:
- Finds questions with expired validity dates for the specified paper and section
- Sets their `valid_until` date to December 31, 9999 (far future)
- Returns a count of activated questions
- Requires admin privileges to execute

### 4. Database Fix

Applied a direct fix to the database for immediate resolution:
- Updated all questions with expired `valid_until` dates to have a far future date
- Ensured all existing questions are now available for selection in practice tests

## Testing and Verification

The fix was verified by:
1. Checking the database for inactive questions before and after the fix
2. Running test requests against the `/tests/start` endpoint
3. Verifying the practice test creation process in the UI

## Recommendations for Future

1. Consider adding a `is_active` boolean field to the Question model to make activation status more explicit.
2. Implement a UI feature for administrators to view and manage question activation status.
3. Add notifications for administrators when a practice test fails due to inactive questions.
