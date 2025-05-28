import { AxiosError } from 'axios';

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export class APIError extends Error {
  status: number;
  detail: string;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.detail = message;
  }
}

export const handleAPIError = (error: unknown): APIError => {
  if (error instanceof AxiosError) {
    const response = error.response?.data as ErrorResponse;
    const status = error.response?.status || 500;
    const message = 
      response?.detail || 
      response?.message || 
      error.message || 
      'An unexpected error occurred';
    
    return new APIError(message, status);
  }

  if (error instanceof Error) {
    return new APIError(error.message);
  }

  return new APIError('An unexpected error occurred');
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof APIError) {
    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};
