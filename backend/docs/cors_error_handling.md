# CORS Error Handling Documentation

## CORS Configuration

The CIL CBT Application uses a custom enhanced CORS middleware implementation to handle cross-origin resource sharing properly. This document explains the CORS configuration and troubleshooting steps.

### Updated CORS Implementation

The application now uses a custom `EnhancedCORSMiddleware` instead of FastAPI's built-in CORSMiddleware. This middleware:

1. Handles OPTIONS (preflight) requests explicitly
2. Applies appropriate CORS headers to all responses
3. Logs CORS-related activities for easier debugging

```python
class EnhancedCORSMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allowed_origins=None):
        super().__init__(app)
        self.allowed_origins = allowed_origins or ["*"]

    async def dispatch(self, request: Request, call_next):
        # Get the origin from the request
        origin = request.headers.get("origin", "*")
        
        # For OPTIONS requests (preflight)
        if request.method == "OPTIONS":
            headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "600",
                "Allow": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            }
            
            return Response(content="", status_code=200, headers=headers)
        
        # For all other requests
        response = await call_next(request)
        
        # Add CORS headers to all responses
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response
```

## Route-specific CORS Handlers

In addition to the global middleware, critical endpoints have their own OPTIONS handlers for handling CORS preflight requests:

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
```

## Frontend Configuration

The frontend Axios client is configured to work properly with the CORS setup:

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

## Troubleshooting CORS Issues

If you encounter CORS issues, check the following:

1. **Backend logs**: Look for CORS-related errors in the logs
2. **Browser console**: Check for CORS errors in the browser's developer tools
3. **Network requests**: Examine the network requests, particularly the OPTIONS preflight requests
4. **Headers**: Verify that the correct CORS headers are being applied to responses

### Common CORS Issues and Solutions

1. **Missing CORS headers**: Ensure that all endpoints respond with proper CORS headers
2. **Preflight failures**: Make sure OPTIONS requests are handled properly
3. **Credentials with wildcard origin**: Cannot use `credentials: true` with `"*"` as the origin
4. **Missing headers in error responses**: Ensure error responses also have proper CORS headers

## Testing CORS Configuration

You can test the CORS configuration with curl:

```bash
# Test OPTIONS preflight
curl -X OPTIONS -H "Origin: http://localhost:3000" \
-H "Access-Control-Request-Method: POST" \
-H "Access-Control-Request-Headers: Content-Type, Authorization" \
-v http://localhost:8000/papers/
```

This should return a 200 response with appropriate CORS headers.
