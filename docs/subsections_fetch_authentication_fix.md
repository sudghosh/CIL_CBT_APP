# Subsections Fetch Authentication Fix

## Issue Description

When adding a question in the Question Management interface, the following error was occurring:

```
GET http://localhost:8000/api/sections/1/subsections/ 401 (Unauthorized)
```

This prevented the subsections dropdown from being populated, making it impossible to select a subsection when adding or editing a question.

## Root Cause Analysis

After investigating the issue, we found that:

1. The subsections endpoint (`/api/sections/{section_id}/subsections/`) requires authentication with a JWT token
2. The fetch request in `QuestionManagement.tsx` was using the native `fetch` API with a manually added token
3. While the token was being added to the request headers, there was an issue with how it was being processed, resulting in a 401 Unauthorized error
4. Other API calls in the application successfully used the `axiosWithRetry` utility, which correctly handles the authentication token

## Solution

We updated the subsections fetch implementation in `QuestionManagement.tsx` to use the `axiosWithRetry` utility instead of the native `fetch` API:

### Before:

```typescript
const token = localStorage.getItem('token');
const response = await fetch(
  `${baseUrl}/api/sections/${formData.section_id}/subsections/`, 
  {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  }
);

if (!response.ok) {
  console.error(`Error fetching subsections: ${response.status} ${response.statusText}`);
  setSubsections([]);
  return;
}

const data = await response.json();
```

### After:

```typescript
const response = await axiosWithRetry.get(
  `${baseUrl}/api/sections/${formData.section_id}/subsections/`
);

// Axios returns data directly in the response.data field
const data = response.data;
```

The `axiosWithRetry` utility automatically:
1. Retrieves the token from localStorage
2. Adds it to the Authorization header with the correct format
3. Handles retry logic for failed requests
4. Provides consistent error handling

## Benefits of the Fix

1. **Consistency**: Uses the same API calling pattern as the rest of the application
2. **Reliability**: Takes advantage of the built-in retry logic for transient network issues
3. **Token Management**: Ensures proper token handling and auto-refreshes dev tokens when needed
4. **Error Handling**: Provides consistent error handling and logging

## Additional Recommendations

1. For all new API calls, use the `axiosWithRetry` utility instead of the native `fetch` API
2. When troubleshooting authentication issues, check the network tab in DevTools to confirm that the Authorization header is being properly sent
3. Ensure that backend endpoints requiring authentication properly validate the token

## Related Files

- `frontend/src/pages/QuestionManagement.tsx` - Modified to use axiosWithRetry
- `frontend/src/utils/apiRetry.ts` - Provides the axiosWithRetry utility
- `backend/src/routers/sections.py` - Contains the endpoint implementation
