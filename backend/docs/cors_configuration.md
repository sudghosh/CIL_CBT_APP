# CORS Configuration and API Error Handling

This document provides information about the CORS (Cross-Origin Resource Sharing) configuration in the CIL CBT application and how to troubleshoot common API errors.

## CORS Configuration

CORS is a security feature implemented by browsers to prevent web pages from making requests to a domain different than the one that served the original page. This is important for security, but can cause issues during development when frontend and backend servers run on different ports.

### Backend Configuration

The application uses multiple layers of CORS protection:

1. **FastAPI's CORSMiddleware**:

```python
origins = ["http://localhost:3000"]
# In development mode, allow all origins for easier debugging
if os.environ.get("ENV") == "development" or os.environ.get("CORS_ALLOW_ALL") == "true":
    origins = ["*"]
    
# Set allow_credentials to False when allowing all origins to avoid CORS errors
allow_credentials = False if "*" in origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,  # Must be False when using wildcard origin
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=600  # Cache preflight requests for 10 minutes
)
```

2. **Custom CORSPreflightMiddleware**:

We've added a custom middleware that explicitly handles OPTIONS requests to ensure proper CORS headers:

```python
class CORSPreflightMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Handle OPTIONS requests explicitly to ensure CORS headers are set
        if request.method == "OPTIONS":
            # Create a response with appropriate CORS headers
            response = Response(
                content="",
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": "600",
                    "Allow": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                }
            )
            return response
        
        # For non-OPTIONS requests, continue with normal handling
        response = await call_next(request)
        return response
```

3. **Route-specific OPTIONS handlers**:

For critical endpoints, we've added explicit OPTIONS handlers:

```python
@router.options("/", include_in_schema=False)
async def options_papers():
    """Handle OPTIONS requests for CORS preflight"""
    return {
        "Allow": "POST, GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PATCH, PUT, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

@router.options("/{paper_id}", include_in_schema=False)
async def options_paper_by_id():
    """Handle OPTIONS requests for specific paper endpoints"""
    return {
        "Allow": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }
```

### Frontend Configuration

The frontend Axios instance is configured to work with CORS:

```typescript
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
  withCredentials: false, // Must be false when using wildcard origin (*)
});
```

## Important CORS Rules to Remember

1. When using `allow_origins=["*"]`, you must set `allow_credentials=False`
2. You cannot use both a wildcard origin and credentials
3. Preflight requests (OPTIONS) must have proper headers for browsers to allow subsequent requests
4. The CORS configuration in the backend must align with frontend settings

## Common CORS Errors and Solutions

### Error: "Access to XMLHttpRequest has been blocked by CORS policy"

This error occurs when the browser prevents a cross-origin request due to CORS policy violations.

**Solution:**
1. Ensure backend has proper CORS configuration
2. Set `withCredentials: false` in Axios if you're not using cookies
3. Ensure the request includes necessary headers

### Error: "405 Method Not Allowed"

This error occurs when the HTTP method used by the client is not supported by the server endpoint.

**Solution:**
1. Check that the router has the appropriate endpoint for the HTTP method
2. Ensure router is correctly included in the FastAPI app
3. Add explicit OPTIONS handlers for critical endpoints

### Error: "Network connection error. Please check your internet connection."

This generic error often masks a CORS issue.

**Solution:**
1. Check browser DevTools for more specific CORS errors
2. Verify that backend is running and accessible
3. Ensure frontend has correct API URL

## Docker Configuration

When running in Docker, ensure:
1. Network settings allow communication between containers
2. Environment variables are properly passed to containers
3. Container health checks are properly configured

## Testing CORS Configuration

You can test CORS configuration with:

```bash
# Test OPTIONS preflight
curl -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" http://localhost:8000/papers/

# Test actual POST request
curl -X POST -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"paper_name":"Test Paper","total_marks":100}' http://localhost:8000/papers/
```

## Production Considerations

In production:
1. Change `allow_origins` to specific domains
2. Set appropriate `allow_headers` and `allow_methods`
3. Consider if `allow_credentials` is necessary
4. Implement proper rate limiting

For more information, refer to:
- [FastAPI CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
