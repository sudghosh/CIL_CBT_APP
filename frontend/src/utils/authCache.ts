/**
 * Auth Cache Manager
 * This utility helps reduce API calls during authentication checks
 * by caching authentication state in session storage.
 */

// Cache keys
const AUTH_CACHE_KEY = 'auth_cache';
const USER_CACHE_KEY = 'user_cache';
const HEALTH_CACHE_KEY = 'health_cache';
const ADMIN_CHECK_KEY = 'admin_check';
const DEV_MODE_KEY = 'dev_mode_initialized';

// Cache expiration in milliseconds
const SHORT_CACHE = 30 * 1000;       // 30 seconds
const MEDIUM_CACHE = 2 * 60 * 1000;  // 2 minutes
const LONG_CACHE = 10 * 60 * 1000;   // 10 minutes

/**
 * Store an item in session storage with expiration
 */
const setCachedItem = (key: string, value: any, expiresInMs: number) => {
  const item = {
    value,
    expires: Date.now() + expiresInMs
  };
  sessionStorage.setItem(key, JSON.stringify(item));
};

/**
 * Get an item from cache, returns null if expired or not found
 */
const getCachedItem = <T>(key: string): T | null => {
  try {
    const cachedItem = sessionStorage.getItem(key);
    if (!cachedItem) return null;
    
    const item = JSON.parse(cachedItem);
    if (Date.now() > item.expires) {
      sessionStorage.removeItem(key);
      return null;
    }
    
    return item.value as T;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

/**
 * Cache current user authentication state
 */
export const cacheAuthState = (user: any) => {
  setCachedItem(AUTH_CACHE_KEY, true, MEDIUM_CACHE);
  setCachedItem(USER_CACHE_KEY, user, MEDIUM_CACHE);
  
  // Cache admin status separately for quicker admin route checks
  if (user?.role === 'Admin') {
    setCachedItem(ADMIN_CHECK_KEY, true, MEDIUM_CACHE);
  }
};

/**
 * Check if user is authenticated from cache
 */
export const isAuthenticatedFromCache = (): boolean => {
  return getCachedItem<boolean>(AUTH_CACHE_KEY) === true;
};

/**
 * Get cached user if available
 */
export const getCachedUser = <T>(): T | null => {
  return getCachedItem<T>(USER_CACHE_KEY);
};

/**
 * Check if user is admin from cache
 */
export const isAdminFromCache = (): boolean => {
  return getCachedItem<boolean>(ADMIN_CHECK_KEY) === true;
};

/**
 * Cache API health check status
 */
export const cacheApiHealth = (isHealthy: boolean) => {
  setCachedItem(HEALTH_CACHE_KEY, isHealthy, LONG_CACHE);
};

/**
 * Get cached API health status
 */
export const getCachedApiHealth = (): boolean | null => {
  return getCachedItem<boolean>(HEALTH_CACHE_KEY);
};

/**
 * Mark development mode as initialized
 */
export const markDevModeInitialized = () => {
  setCachedItem(DEV_MODE_KEY, true, LONG_CACHE);
};

/**
 * Check if development mode has been initialized
 */
export const isDevModeInitialized = (): boolean => {
  return getCachedItem<boolean>(DEV_MODE_KEY) === true;
};

/**
 * Clear all authentication caches
 */
export const clearAuthCache = () => {
  sessionStorage.removeItem(AUTH_CACHE_KEY);
  sessionStorage.removeItem(USER_CACHE_KEY);
  sessionStorage.removeItem(ADMIN_CHECK_KEY);
  sessionStorage.removeItem(DEV_MODE_KEY);
};
