"""
Enhanced CORS middleware to handle cross-origin requests correctly.
This middleware replaces the FastAPI built-in CORSMiddleware with a more robust implementation.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from fastapi import Request
import logging

logger = logging.getLogger(__name__)

class EnhancedCORSMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allowed_origins=None):
        super().__init__(app)
        self.allowed_origins = allowed_origins or ["*"]
        logger.info(f"Enhanced CORS middleware initialized with allowed_origins: {self.allowed_origins}")

    async def dispatch(self, request: Request, call_next):
        # Get the origin from the request
        origin = request.headers.get("origin", "*")
        
        # Log the request for debugging
        logger.debug(f"Processing {request.method} request to {request.url.path} from origin: {origin}")

        # For OPTIONS requests (preflight)
        if request.method == "OPTIONS":
            logger.info(f"Handling OPTIONS preflight request for: {request.url.path}")
            
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
