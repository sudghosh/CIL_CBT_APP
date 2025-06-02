/**
 * Authentication Optimization Helpers
 * These functions help reduce unnecessary authentication checks and API calls
 * to improve UI performance and prevent flickering.
 */

import { isDevToken, isDevMode } from './devMode';
import { isAuthenticatedFromCache, getCachedUser, isAdminFromCache } from './authCache';

/**
 * Quick check if a route should require re-authentication
 * This is used by ProtectedRoute and AdminRoute to determine if a full
 * auth check is needed or if cached values can be used.
 * 
 * @param forAdmin Whether this is for an admin route
 * @returns Boolean indicating if re-auth is needed
 */
export const shouldReauthenticate = (forAdmin: boolean = false): boolean => {
  // Always have cached values for development mode
  if (isDevMode() && localStorage.getItem('token') === 'dev-token-for-testing') {
    return false; // No need to re-auth in dev mode with dev token
  }
  
  // Check cache first
  if (isAuthenticatedFromCache()) {
    // For admin routes, also check admin cache
    if (forAdmin) {
      return !isAdminFromCache();
    }
    return false; // No need to re-auth if cache is valid
  }
  
  // Default: re-auth needed
  return true;
};

/**
 * Get a cached user object if available, or null if not cached
 */
export const getCachedUserObject = <T>(): T | null => {
  return getCachedUser<T>();
};

/**
 * Helper to determine how long ago the last auth check was performed
 * @returns Number of milliseconds since the last check, or Infinity if never checked
 */
export const timeSinceLastAuthCheck = (): number => {
  const lastCheck = sessionStorage.getItem('lastAuthCheck');
  if (!lastCheck) return Infinity;
  
  const lastCheckTime = parseInt(lastCheck, 10);
  return Date.now() - lastCheckTime;
};

/**
 * Record that an auth check was just performed
 */
export const recordAuthCheck = (): void => {
  sessionStorage.setItem('lastAuthCheck', Date.now().toString());
};

/**
 * Record that an admin auth check was just performed
 */
export const recordAdminCheck = (): void => {
  sessionStorage.setItem('lastAdminCheck', Date.now().toString());
};
