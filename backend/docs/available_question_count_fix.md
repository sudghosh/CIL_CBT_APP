# Available Question Count Fix

## Issue Description

The `/questions/available-count` endpoint in the backend API was returning a 422 (Unprocessable Entity) error whenever queried. This prevented the frontend from fetching the available question count for a given paper, section, or subsection.

### Root Cause

The endpoint was checking for `Question.is_active == True` field which doesn't exist in the `Question` database model. The database model actually uses a `valid_until` date field to determine if a question is active.

## Fix Applied

The endpoint has been updated to use the proper `valid_until` field to determine active questions, consistent with the rest of the codebase:

```python
# BEFORE
query = db.query(func.count(Question.question_id)).filter(
    Question.paper_id == paper_id,
    Question.is_active == True  # This field does not exist
)

# AFTER
query = db.query(func.count(Question.question_id)).filter(
    Question.paper_id == paper_id,
    Question.valid_until >= date.today()  # Now using the correct field
)
```

## Implementation Details

1. The API endpoint `/questions/available-count` was modified to use the `valid_until` field instead of the non-existent `is_active` field
2. The backend server was restarted to apply the changes
3. Test scripts were created to verify the fix

## Expected Behavior

With this fix, the `/questions/available-count` endpoint should now:

1. Return the correct count of available questions for a given paper/section/subsection
2. Not throw any 422 errors
3. Return proper counts based on the question validity dates

## Testing the Fix

The functionality can be tested using either:
- The `test_with_token.py` script with a valid authentication token
- Manual testing through the browser or a tool like Postman
- Through the frontend application by creating a practice test

The frontend should now be able to:
1. Successfully fetch the available question counts
2. Display these counts to users in the Practice Test page
3. Prevent users from selecting more questions than are available in a section

## Complete Solution Architecture

This backend fix works in conjunction with the frontend changes already implemented:

1. **Backend**: 
   - Properly counts only valid questions (where `valid_until >= today`)
   - Returns counts filtered by paper_id, section_id, and subsection_id (if provided)
   - Returns a proper JSON response instead of a 422 error

2. **Frontend**:
   - Fetches and caches available question counts for each section
   - Displays available counts to users
   - Prevents users from selecting more questions than are available
   - Shows clear error messages when not enough questions are available
   - Validates input values against available counts before submitting

## Future Recommendations

1. Add comprehensive unit tests for the `/questions/available-count` endpoint
2. Consider adding a database migration to add an explicit `is_active` boolean column if that's a common access pattern
3. Document the expected API behavior and parameters in API documentation
4. Use consistent patterns for determining "active" questions across all endpoints
