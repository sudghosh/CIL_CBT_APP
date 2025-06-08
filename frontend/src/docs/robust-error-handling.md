# Robust Error Handling for Management Pages

## Pattern for All Management Pages (User, Paper, Question, etc.)

1. **Log All Errors with Details**
   - Always log error objects and their details (status, data, message) to the console for debugging.

2. **Handle Authentication Errors (401/403)**
   - Show a user-friendly message: "Authentication error. Please try logging out and back in."
   - Save the current URL in `sessionStorage` as `redirectAfterLogin`.
   - Save the error message in `sessionStorage` as `authError`.
   - Remove the token from `localStorage`.
   - Redirect to `/login?session_expired=true` after a short delay (e.g., 1.5 seconds).

3. **Show User-Friendly Error Messages in the UI**
   - Use an `<Alert>` component to display errors to the user.
   - Always clear errors on successful fetch or dialog open.

4. **Pinpoint Backend Errors**
   - Check backend logs for stack traces and error details.
   - If running in Docker, use:
     ```powershell
     docker-compose logs backend
     docker-compose logs frontend
     ```
   - Look for 500 errors, validation errors, or authentication failures.

5. **Consistent Loading State Handling**
   - Always set loading state to `true` before fetch, and `false` in `finally`.

6. **Testing**
   - Test with expired tokens, missing tokens, and backend down scenarios.
   - Confirm that the UI shows the correct error and redirects as expected.

## Example Implementation (PaperManagement.tsx)

```typescript
const fetchPapers = async () => {
  try {
    setLoading(true);
    const response = await papersAPI.getPapers();
    setPapers(response.data);
    setError(null);
  } catch (err: any) {
    console.error('Error fetching papers:', err);
    console.error('Error details:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
    if (err.status === 401 || err.response?.status === 401) {
      setError('Authentication error. Please try logging out and back in.');
      sessionStorage.setItem('redirectAfterLogin', '/manage/papers');
      sessionStorage.setItem('authError', 'Your session has expired. Please log in again.');
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login?session_expired=true';
      }, 1500);
    } else {
      setError(err.response?.data?.detail || err.message || 'Failed to load papers');
    }
  } finally {
    setLoading(false);
  }
};
```

## Why This Pattern?
- Ensures users are never left with a blank or broken UI.
- Provides clear feedback and next steps for authentication issues.
- Makes debugging easier for developers by logging all error details.
- Keeps the UI and backend in sync, even after errors or session expiration.

## See Also
- `UserManagement.tsx` for a full example
- `backend/docs/validation_error_handling.md` for backend error handling best practices
- `frontend/src/utils/errorHandler.ts` for error utility functions
