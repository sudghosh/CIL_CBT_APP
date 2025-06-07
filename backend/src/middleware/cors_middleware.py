"""
CORS middleware to handle preflight requests explicitly.
This ensures all OPTIONS requests get proper CORS headers even before they reach the route handlers.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging

logger = logging.getLogger(__name__)

class CORSPreflightMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Handle OPTIONS requests explicitly to ensure CORS headers are set
        if request.method == "OPTIONS":
            logger.info(f"CORS Preflight request for: {request.url.path}")
            
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
        
        # Ensure CORS headers are present in all responses
        if "Access-Control-Allow-Origin" not in response.headers:
            response.headers["Access-Control-Allow-Origin"] = "*"
        
        return response
