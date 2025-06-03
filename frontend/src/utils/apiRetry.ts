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
export const axiosWithRetry = {
  get: <T>(url: string, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>) => {
    return requestWithRetry<T>(() => axios.get<T>(url, config), retryConfig);
  },
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>) => {
    return requestWithRetry<T>(() => axios.post<T>(url, data, config), retryConfig);
  },
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>) => {
    return requestWithRetry<T>(() => axios.put<T>(url, data, config), retryConfig);
  },
  
  delete: <T>(url: string, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>) => {
    return requestWithRetry<T>(() => axios.delete<T>(url, config), retryConfig);
  }
};
