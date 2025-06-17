# API Routing Fix Documentation

## Issue Description

The frontend application was making requests to the backend API with an `/api` prefix (e.g., `/api/papers/1/activate/`), but the backend router was configured with a prefix of just `/papers`. This mismatch caused 404 (Not Found) errors for CRUD operations on the Paper Management page.

## Changes Made

### 1. Added API-prefixed Routes

We modified the application's main entry point (`main.py`) to include the papers router with an `/api` prefix in addition to the original route. This ensures that requests to both `/papers/*` and `/api/papers/*` are properly handled.

```python
# Create API prefix router to handle frontend requests to /api/*
api_router = APIRouter(prefix="/api")
api_router.include_router(papers.router)  # Include papers router under /api/papers
app.include_router(api_router)  # Include the api router in main app
```

### 2. Added CORS OPTIONS Handlers

To ensure proper CORS preflight handling, we added explicit OPTIONS handlers for the API-prefixed routes:

```python
@app.options("/api/papers/", include_in_schema=False)
async def options_api_papers():
    return {
        "Allow": "POST, GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PATCH, PUT, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600"
    }

# Additional OPTIONS handlers for specific routes...
```

## Testing Performed

1. The backend service was restarted to apply the changes.
2. A test request was made to `/api/papers/1/activate/` to verify that the endpoint was correctly responding.
3. The backend logs confirmed that requests to the API-prefixed routes were being handled as expected.

## Impact

This fix resolves the 404 Not Found errors for the following operations in the Paper Management page:

- Creating a new paper
- Updating an existing paper
- Activating/deactivating papers
- Deleting papers

## Future Recommendations

To prevent similar route mismatches in the future:

1. Standardize the API URL structure in both frontend and backend code.
2. Consider using a configuration file that is shared between frontend and backend to define API paths.
3. Implement comprehensive API tests that verify both paths with and without the `/api` prefix work correctly.
4. Add API documentation (e.g., with Swagger/OpenAPI) to clearly document all available endpoints and their expected URL patterns.
