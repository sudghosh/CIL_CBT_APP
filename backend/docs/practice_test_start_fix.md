# Practice Test Start Fix - June 2025

## Issue

Users were experiencing a "Network connection error" when attempting to start a Practice Test from the frontend. 
The root cause was identified as a FastAPI response validation error on the `/tests/start` endpoint:

```
fastapi.exceptions.ResponseValidationError: 2 validation errors:
  {'type': 'missing', 'loc': ('response', 'test_type'), 'msg': 'Field required', 'input': <src.database.models.TestAttempt object at 0x70cc3dfa5a50>}
  {'type': 'missing', 'loc': ('response', 'total_allotted_duration_minutes'), 'msg': 'Field required', 'input': <src.database.models.TestAttempt object at 0x70cc3dfa5a50>}
```

The response model in the FastAPI route expected fields (`test_type` and `total_allotted_duration_minutes`) that were 
not present in the database model, resulting in a 500 error.

## Solution

Two changes were implemented:

1. Added the missing columns to the `TestAttempt` model in `models.py`
2. Updated the `start_test` function to populate these fields
3. Created a database migration script to add the columns to the existing database

### Database Migration

To apply the database migration:

```bash
# Run the migration script inside the Docker container
docker cp backend/add_test_attempt_fields.py cil_cbt_app-backend-1:/app/
docker exec -it cil_cbt_app-backend-1 python /app/add_test_attempt_fields.py
```

## Verification

After applying the fix:

1. The backend logs should no longer show `ResponseValidationError`
2. The frontend Practice Test button should work without showing "Network connection error"

## Additional Notes

The SQLAlchemy model columns must match the Pydantic response model fields for FastAPI to properly validate responses.
Always ensure database models and response models are kept in sync.
