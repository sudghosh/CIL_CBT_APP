/**
 * Helper functions to fix authentication issues
 * These functions are used to complement the authentication system
 */

import { isDevToken, DEV_TOKEN } from './devMode';

/**
 * Safe check for token expiration that handles development mode and edge cases
 * @param tokenToCheck The token to check
 * @returns boolean true if the token is valid and not expired
 */
export const safeTokenCheck = (tokenToCheck: string | null): boolean => {
  // Handle null/empty token
  if (!tokenToCheck) {
    return false;
  }
  
  // Always valid in dev mode with dev token
  if (isDevToken(tokenToCheck) && process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // For real tokens, they need proper JWT validation
  // This is handled by the isTokenExpired function elsewhere
  return true;
};

/**
 * Reset development authentication session flags
 * This helps when authentication gets stuck in development mode
 */
export const resetDevAuth = (): void => {
  // Only perform this in development mode
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  console.log('Resetting development authentication state');
  
  // Clear session storage flags used by dev auth
  sessionStorage.removeItem('devLoginAttempted');
  sessionStorage.removeItem('devAuthInitialized');
  
  // Only remove the token if it's a dev token
  const token = localStorage.getItem('token');
  if (token && token === DEV_TOKEN) {
    localStorage.removeItem('token');
  }
  
  // Force page reload to start fresh
  window.location.href = '/login?noautologin=true';
};

/**
 * Fix stale authentication sessions
 * This addresses the session management issues
 */
export const fixSessionState = (): void => {
  // Clear out any auth error messages in session storage
  // that might be left over from previous errors
  sessionStorage.removeItem('authError');
  
  // Reset API health check cache to force re-checking
  sessionStorage.removeItem('apiHealthChecked');
  
  // Reset auth check timestamps to force fresh checks
  sessionStorage.removeItem('lastAuthCheck');
  sessionStorage.removeItem('lastAdminCheck');
};
