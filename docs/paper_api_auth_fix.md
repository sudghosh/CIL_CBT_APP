# Authentication Fix for Paper Management API

## Issue Overview

The paper management functionality in the application was experiencing intermittent authentication issues. Specifically, users were receiving 401 Unauthorized errors when trying to activate or deactivate papers, while other authenticated endpoints (like questions management and allowed emails) were working correctly.

The console error was:
```
POST http://localhost:8000/api/papers/1/activate/ 401 (Unauthorized)
Error: Failed to activate paper
Context: AuthenticationError: Not authenticated
```

## Root Cause Analysis

After investigation, we identified that the paper activation/deactivation endpoints were using a different HTTP client configuration than the working endpoints:

1. **Working Endpoints**: Used the configured `api` Axios instance which properly included authentication tokens via interceptors.
2. **Failing Endpoints**: Used the `axiosWithRetry` utility which used the plain `axios` instance without token interceptors.

## Solution Implemented

1. **Enhanced `axiosWithRetry` Utility**:
   - Modified `apiRetry.ts` to create a properly configured Axios instance for each request
   - Added token interceptors that match the main API configuration
   - Ensured Authorization headers are consistently applied

2. **Paper API Functions**:
   - Updated the `activatePaper` and `deactivatePaper` functions to use the enhanced `axiosWithRetry`
   - Maintained the retry functionality for network resilience

3. **Testing and Validation**:
   - Created test scripts to verify the authentication flow
   - Confirmed that all paper management endpoints now work with proper authentication

## Code Changes

### 1. `apiRetry.ts` Modifications

The `axiosWithRetry` utility was updated to create a configured Axios instance that includes authentication token headers:

```typescript
/**
 * Create an axios instance with the same configuration as the main API instance
 * This ensures headers like Authorization are consistently applied
 */
const createConfiguredAxios = () => {
  const instance = axios.create({
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });
  
  // Add token to requests if it exists (same logic as in api.ts)
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  return instance;
};

export const axiosWithRetry = {
  // Methods now use createConfiguredAxios() instead of plain axios
  ...
};
```

### 2. API Service Updates

The paper activation/deactivation functions were updated to use the enhanced `axiosWithRetry`:

```typescript
activatePaper: async (paperId: number) => {
  try {
    // Using the improved axiosWithRetry that properly includes auth tokens
    const response = await axiosWithRetry.post(`${API_URL}/api/papers/${paperId}/activate/`, {});
    return { data: response.data, success: true };
  } catch (error) {
    const apiError = handleAPIError(error as Error);
    logError('Failed to activate paper', apiError);
    throw apiError;
  }
},
```

## Best Practices Applied

1. **Consistent Authentication**: Ensured all API requests use consistent authentication mechanisms.
2. **Request Resilience**: Maintained the retry functionality for network resilience.
3. **Token Management**: Used the localStorage token for authentication consistently.
4. **Error Handling**: Preserved proper error handling and logging.
5. **Testing**: Created test scripts to verify the solution.

## Verification Steps

1. Login to the application
2. Navigate to paper management
3. Try to activate/deactivate papers
4. Verify no authentication errors appear in the console
5. Confirm papers can be activated/deactivated successfully

## Additional Recommendations

1. **Unified HTTP Client**: Consider using a single configured API instance throughout the application to prevent similar issues.
2. **Token Refresh**: Implement token refresh functionality to handle token expiration gracefully.
3. **Standardized Error Handling**: Standardize authentication error handling across the application.
4. **Automated Testing**: Add automated tests for authentication flows.

## Related Issues

This fix may also help with other API endpoints that use `axiosWithRetry` directly with full URLs instead of the configured `api` instance.
