import { AxiosError } from 'axios';

interface ErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
  errors?: Array<{message: string}>;
}

export class APIError extends Error {
  status: number;
  detail: string;
  code?: string;
  originalError?: Error;
  axiosResponse?: any;

  constructor(message: string, status: number = 500, code?: string, originalError?: Error, axiosResponse?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.detail = message;
    this.code = code;
    this.originalError = originalError;
    this.axiosResponse = axiosResponse;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export class NetworkError extends APIError {
  constructor(message: string = 'Network connection error. Please check your internet connection.') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication failed. Please login again.') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

// Handle API errors with improved error classification
export const handleAPIError = (error: unknown): APIError => {
  // Special debugging for DELETE operation errors
  if (error instanceof AxiosError && error.config?.method === 'delete') {
    console.group('[DEBUG][DELETE] Error Details:');
    console.error('Delete operation failed with:', error.message);
    console.error('Request URL:', error.config?.url);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Response headers:', error.response?.headers);
    if (error.response?.status === 500) {
      console.error('[DEBUG][DELETE] Server Error: This might be a cascade delete issue or a database constraint violation');
    }
    console.groupEnd();
  }

  // Network errors
  if (error instanceof AxiosError && error.code === 'ERR_NETWORK') {
    return new NetworkError();
  }
  
  // Check if it's an axios error with a response
  if (error instanceof AxiosError && error.response) {
    const status = error.response.status;
    const data = error.response.data as ErrorResponse;
    
    // Extract error message from various formats
    const message = data.detail || 
                    data.message || 
                    data.error || 
                    (data.errors && data.errors.length > 0 ? data.errors[0].message : null) || 
                    error.message || 
                    'An unknown error occurred';
    
    // Authentication errors
    if (status === 401) {
      return new AuthenticationError(message);
    }
    
    // Other status codes
    return new APIError(message, status, undefined, error, error.response);
  }
  
  // If it's already an APIError, return it
  if (error instanceof APIError) {
    return error;
  }
  
  // Handle unexpected errors
  if (error instanceof Error) {
    return new APIError(error.message, 500, 'UNKNOWN_ERROR', error);
  }
  
  // For any other type of error
  return new APIError(
    typeof error === 'string' ? error : 'An unknown error occurred',
    500,
    'UNKNOWN_ERROR'
  );
};

// Log errors to console with additional context
export const logError = (error: unknown, context?: Record<string, any>): void => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  console.group('Application Error');
  console.error('Error:', errorObj);
  if (context) console.error('Context:', context);
  console.error('Timestamp:', new Date().toISOString());
  console.groupEnd();
  
  // Here you could also send the error to a monitoring service if needed
};

// Helper to display user-friendly messages from errors
export const getUserFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof APIError) {
    return error.detail;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again later.';
};
