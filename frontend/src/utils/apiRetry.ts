/**
 * API Retry Utility
 * 
 * This utility provides functions to retry failed API requests with 
 * exponential backoff to improve resilience against temporary network issues.
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryStatusCodes: number[];
}

const defaultRetryConfig: RetryConfig = {
  retries: 2,
  retryDelay: 1000, // Base delay in ms
  retryStatusCodes: [408, 429, 500, 502, 503, 504] // Retry on these status codes
};

/**
 * Make a request with retry capability
 */
export async function requestWithRetry<T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  config: Partial<RetryConfig> = {}
): Promise<AxiosResponse<T>> {
  const retryConfig = { ...defaultRetryConfig, ...config };
  let lastError: AxiosError | Error;
  
  for (let attempt = 0; attempt <= retryConfig.retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as AxiosError | Error;
      
      // Don't retry if this was the last attempt
      if (attempt >= retryConfig.retries) {
        throw error;
      }
      
      // Only retry on specific status codes or network errors
      const isAxiosError = axios.isAxiosError(error);
      const status = isAxiosError ? error.response?.status : 0;
      const shouldRetryStatus = status ? retryConfig.retryStatusCodes.includes(status) : false;
      const isNetworkError = isAxiosError && !error.response;
      
      // Skip retry if it's not a retriable error
      if (!isNetworkError && !shouldRetryStatus) {
        throw error;
      }
      
      // Calculate delay with exponential backoff: delay * 2^attempt
      const delay = retryConfig.retryDelay * Math.pow(2, attempt);
      console.log(`API request failed, retrying in ${delay}ms... (Attempt ${attempt + 1}/${retryConfig.retries})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached but TypeScript requires a return
  throw lastError!;
}

/**
 * Wrapper for axios methods with retry functionality
 */
/**
 * Create an axios instance with the same configuration as the main API instance
 * This ensures headers like Authorization are consistently applied
 */
const createConfiguredAxios = () => {
  const instance = axios.create({
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });
    // Add token to requests if it exists (same logic as in api.ts)
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        // Ensure headers object exists
        config.headers = config.headers || {};
        
        // Set Authorization header
        config.headers.Authorization = `Bearer ${token}`;
        
        // Log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ApiRetry] Adding token to request: ${config.method?.toUpperCase()} ${config.url}`);
        }
      } else {
        console.warn(`[ApiRetry] No token found for request to ${config.url}`);
      }
      return config;
    },
    (error) => {
      console.error('[ApiRetry] Request interceptor error:', error);
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// Get a configured axios instance for each request to ensure fresh auth token
export const axiosWithRetry = {
  get: <T>(url: string, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>) => {
    return requestWithRetry<T>(() => createConfiguredAxios().get<T>(url, config), retryConfig);
  },
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>) => {
    return requestWithRetry<T>(() => createConfiguredAxios().post<T>(url, data, config), retryConfig);
  },
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>) => {
    return requestWithRetry<T>(() => createConfiguredAxios().put<T>(url, data, config), retryConfig);
  },
  
  delete: <T>(url: string, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>) => {
    return requestWithRetry<T>(() => createConfiguredAxios().delete<T>(url, config), retryConfig);
  }
};
