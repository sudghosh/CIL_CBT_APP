# Subsections API Documentation

This document outlines the API endpoints related to subsection management in the CIL CBT Application.

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Get Subsections for a Section

Retrieves all subsections that belong to a specific section.

**URL**: `/api/sections/{section_id}/subsections/`

**Method**: `GET`

**URL Parameters**:
- `section_id` (integer): The ID of the section to get subsections for

**Authentication Required**: Yes (User or Admin token)

**Success Response**:
- **Code**: 200 OK
- **Content Example**:
  ```json
  [
    {
      "subsection_id": 1,
      "subsection_name": "Current Affairs",
      "description": "Questions related to Current Affairs",
      "section_id": 1
    },
    {
      "subsection_id": 2,
      "subsection_name": "History",
      "description": "Questions related to History",
      "section_id": 1
    }
  ]
  ```

**Error Responses**:
- **Code**: 404 Not Found
  - **Content**: `{ "detail": "Section with ID {section_id} not found" }`
- **Code**: 500 Internal Server Error
  - **Content**: `{ "detail": "Error retrieving subsections for section {section_id}" }`
- **Code**: 401 Unauthorized
  - **Content**: `{ "detail": "Not authenticated" }`

## Notes

- The endpoint supports rate limiting (30 requests per minute)
- The API is also available without the `/api` prefix for backward compatibility: `/sections/{section_id}/subsections/`
- The frontend should always use the `/api` prefixed version
- Both endpoints require proper authentication with a valid JWT token in the headers

## Related Code

### Backend

- **Route definition**: `backend/src/routers/sections.py`
- **Router registration**: `backend/src/main.py`

### Frontend

- **API call**: `frontend/src/pages/QuestionManagement.tsx`

```typescript
// Example fetch call with proper authentication
const token = localStorage.getItem('token');
const response = await fetch(
  `${baseUrl}/api/sections/${section_id}/subsections/`, 
  {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  }
);
```
