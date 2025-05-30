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
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data integrity error occurred during {operation}"
            )
        elif isinstance(e, SQLAlchemyError):
            return HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error occurred during {operation}"
            )
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during {operation}"
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
