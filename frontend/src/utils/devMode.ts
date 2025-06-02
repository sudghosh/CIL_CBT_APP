/**
 * Utility functions for managing development mode features
 */

/**
 * The token used for development authentication
 */
export const DEV_TOKEN = 'dev-token-for-testing';

/**
 * Check if the app is running in development mode
 * @returns boolean - true if in development mode
 */
export const isDevMode = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Create a development JWT-like token structure
 * This creates a token that looks like a JWT but is easily recognizable as a dev token
 * @returns string - a fake JWT token for development
 */
export const createDevToken = (): string => {
  // Create a payload with admin user info and long expiry
  const payload = {
    sub: 'dev@example.com',
    name: 'Development User',
    role: 'Admin',
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  };
  
  // Encode to base64
  const encodedPayload = btoa(JSON.stringify(payload));
  
  // Create a structure similar to JWT with header.payload.signature
  return `devheader.${encodedPayload}.devsignature`;
};

/**
 * Check if we should use development authentication
 * This is a helper function that checks both:
 * 1. If we're in development mode
 * 2. If the auto-login feature is not explicitly disabled
 * 
 * @param urlParams Optional URL parameters to check (or will use window.location.search)
 * @returns boolean - true if dev authentication should be used
 */
export const shouldUseDevAuth = (urlParams?: URLSearchParams): boolean => {
  if (!isDevMode()) return false;
  
  // Check if the noautologin parameter is set
  const params = urlParams || new URLSearchParams(window.location.search);
  const skipAutoLogin = params.get('noautologin') === 'true';
  
  return !skipAutoLogin;
};

/**
 * Check if a token is a development token
 * @param token The token to check
 * @returns boolean - true if it's a development token
 */
export const isDevToken = (token: string): boolean => {
  return token === DEV_TOKEN;
};
