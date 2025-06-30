/**
 * Core API Response Types
 * 
 * Base interfaces for all API responses and common data structures
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T | null;
}

/**
 * Time period options for chart data filtering
 */
export type TimePeriod = 'week' | 'month' | 'year' | 'all';

/**
 * Chart data point with timestamp
 */
export interface TimeSeriesDataPoint {
  date: string;
  [key: string]: string | number;
}

/**
 * Error state for components
 */
export interface ErrorState {
  hasError: boolean;
  message?: string;
  timestamp?: string;
}

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}
