import json
import logging
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

# Configure logging
logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging request and response information to help with debugging"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        # Generate a unique request ID for tracking
        import uuid
        request_id = str(uuid.uuid4())
        
        # Log the request
        await self._log_request(request, request_id)
        
        # Process the request and measure timing
        start_time = time.time()
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log the response
            self._log_response(response, request_id, process_time)
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"Request {request_id} failed after {process_time:.4f}s: {str(e)}")
            raise
    
    async def _log_request(self, request: Request, request_id: str):
        """Log the incoming request details"""
        # Basic request info
        log_dict = {
            "request_id": request_id,
            "type": "request",
            "method": request.method,
            "url": str(request.url),
            "client": request.client.host if request.client else "unknown",
        }
        
        # Try to log request body for POST, PUT, PATCH
        if request.method in ("POST", "PUT", "PATCH"):
            try:
                # Make a copy of the request body
                body_bytes = await request.body()
                
                # This avoids consuming the body, which would cause issues
                request._body = body_bytes
                
                # Try to parse as JSON
                try:
                    body_str = body_bytes.decode()
                    if body_str:
                        if len(body_str) > 1000:  # Limit long payloads
                            log_dict["body"] = f"{body_str[:1000]}... (truncated)"
                        else:
                            log_dict["body"] = body_str
                except:
                    log_dict["body"] = "(binary data or encoding error)"
            except:
                log_dict["body"] = "(error reading body)"
        
        # Log headers (excluding sensitive ones)
        try:
            headers = dict(request.headers)
            # Remove sensitive headers
            for key in ("authorization", "cookie", "set-cookie"):
                if key in headers:
                    headers[key] = "(redacted)"
            log_dict["headers"] = headers
        except:
            log_dict["headers"] = "(error reading headers)"
        
        logger.info(f"REQUEST {request_id}: {json.dumps(log_dict)}")
    
    def _log_response(self, response: Response, request_id: str, process_time: float):
        """Log the response details"""
        log_dict = {
            "request_id": request_id,
            "type": "response",
            "status_code": response.status_code,
            "process_time": f"{process_time:.4f}s",
        }
        
        # Log response headers
        try:
            headers = dict(response.headers)
            # Remove sensitive headers
            for key in ("authorization", "cookie", "set-cookie"):
                if key.lower() in headers:
                    headers[key.lower()] = "(redacted)"
            log_dict["headers"] = headers
        except:
            log_dict["headers"] = "(error reading headers)"
        
        # For error responses, try to log more details
        if response.status_code >= 400:
            logger.warning(f"RESPONSE {request_id}: {json.dumps(log_dict)}")
        else:
            logger.info(f"RESPONSE {request_id}: {json.dumps(log_dict)}")
