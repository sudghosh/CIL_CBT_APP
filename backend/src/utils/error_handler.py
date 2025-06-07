from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

class APIErrorHandler:
    @staticmethod
    def handle_db_error(e: Exception, operation: str) -> HTTPException:
        """Handle database-related errors and return appropriate HTTPException"""
        logger.error(f"Database error during {operation}: {str(e)}")
        
        if isinstance(e, IntegrityError):
            # Log detailed error information
            logger.error(f"IntegrityError details: {repr(e)}")
            
            # Check for common integrity errors
            error_msg = str(e).lower()
            if "unique constraint" in error_msg or "duplicate" in error_msg:
                # Extract field name if possible
                field_name = "entry"
                if "key" in error_msg and "(" in error_msg and ")" in error_msg:
                    try:
                        field_name = error_msg.split("(")[1].split(")")[0]
                    except:
                        pass
                return HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A {field_name} with this value already exists"
                )
            
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data integrity error occurred during {operation}: {str(e)}"
            )
        elif isinstance(e, SQLAlchemyError):
            logger.error(f"SQLAlchemy error details: {repr(e)}")
            return HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error occurred during {operation}: {str(e)}"
            )
            
        # Handle validation errors
        if hasattr(e, 'errors') and callable(getattr(e, 'errors', None)):
            try:
                validation_errors = e.errors()
                logger.error(f"Validation error details: {validation_errors}")
                # Return detailed validation errors to help debugging
                return HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Validation error in {operation}: {validation_errors}"
                )
            except:
                pass
                
        # General exception handling
        logger.error(f"Unexpected exception type: {type(e).__name__}")
        logger.error(f"Exception details: {repr(e)}")
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during {operation}: {str(e)}"
        )
    
    @staticmethod
    def handle_not_found(resource: str, resource_id: int) -> HTTPException:
        """Handle resource not found errors"""
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with id {resource_id} not found"
        )
    
    @staticmethod
    def handle_validation_error(detail: str) -> HTTPException:
        """Handle validation errors"""
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
    
    @staticmethod
    def handle_unauthorized() -> HTTPException:
        """Handle unauthorized access"""
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    @staticmethod
    def handle_forbidden() -> HTTPException:
        """Handle forbidden access"""
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
        )
    
    @staticmethod
    def handle_rate_limit_exceeded() -> HTTPException:
        """Handle rate limit exceeded errors"""
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    @staticmethod
    def handle_cache_error(operation: str) -> HTTPException:
        """Handle cache-related errors"""
        logger.error(f"Cache error during {operation}")
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache operation failed during {operation}"
        )
