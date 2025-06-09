# Robust Serialization & Error Handling for Question Upload (June 2025)

## Root Cause
The `/questions/upload` endpoint previously returned SQLAlchemy ORM objects, causing serialization errors and 500 responses when uploading questions via CSV/XLSX.

## Solution
- Refactored the endpoint to return only JSON-serializable dicts, following the pattern used in Paper/Section and Whitelist Email management.
- Implemented robust error handling: all exceptions are logged, the database is rolled back, and user-friendly error messages are returned.
- Validation errors (e.g., missing columns, bad data) return 400/422 with clear details.
- Success responses include a status, message, and a list of created question IDs/texts.

## Best Practices Applied
- No ORM objects in API responses.
- Consistent error handling and logging.
- Clear, user-friendly error messages for all failure cases.
- Pattern matches Paper/Section and Whitelist Email management for maintainability.

## Example Success Response
```
{
  "status": "success",
  "message": "Successfully uploaded 2 questions",
  "question_ids": [101, 102],
  "questions": [
    {"question_id": 101, "question_text": "CIL Full form"},
    {"question_id": 102, "question_text": "SECL Full Form"}
  ]
}
```

## Example Error Response
```
{
  "status": "error",
  "message": "Missing required columns in upload: option_2, option_3. Please check your CSV headers.",
  "detail": null
}
```

## References
- See `backend/docs/validation_error_handling.md` for error handling patterns.
- See `backend/docs/email_whitelist_flow.md` for whitelist email management patterns.
- See `backend/src/routers/papers.py` for serialization patterns.
