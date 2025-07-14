/**
 * Utilities for managing browser cache and storage
 */
import { isDevToken } from './devMode';

/**
 * Clears browser cache for the application
 * This is useful when debugging authentication issues
 * @returns boolean - true if cache clearing was successful
 */
export const clearBrowserCache = (): boolean => {
  try {
    // Clear localStorage (but only authentication-related items)
    localStorage.removeItem('token');
    console.log('Authentication tokens cleared');
    
    // If service workers are registered, unregister them
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          console.log('ServiceWorker unregistered');
        });
      });
    }
    
    // If the browser supports cache API
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
          console.log(`Cache ${name} deleted`);
        });
      });
    }
    
    console.log('Browser cache cleared. You may need to refresh the page.');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Checks if there are authentication items in storage
 * @returns boolean - true if token exists in localStorage
 */
export const hasAuthData = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Utility to check if a token has expired
 * @param token JWT token to check
 * @returns boolean - true if token has expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    // Handle special cases
    if (!token) {
      console.warn('No token provided to isTokenExpired');
      return true;
    }
      // Check if it's the development token
    if (isDevToken(token)) {
      console.log('Development token never expires');
      // Mark this token as validated in session storage for better persistence
      sessionStorage.setItem('tokenValidated_' + token.substring(0, 10), 'true');
      return false; // Dev token never expires
    }
    
    // Handle case where token validity is stored in session
    if (sessionStorage.getItem('tokenValidated_' + token.substring(0, 10)) === 'true') {
      return false; // Already validated this token
    }
    
    // Skip token validation for tokens that don't look like valid JWTs
    if (!token.includes('.') || token.split('.').length !== 3) {
      console.warn('Invalid token format detected');
      return true; // Invalid format means we treat as expired
    }

    const base64Url = token.split('.')[1];
    if (!base64Url) {
      console.warn('Token missing payload section');
      return true;
    }
      try {
      // Add padding to base64 string if needed
      const padding = '='.repeat((4 - base64Url.length % 4) % 4);
      const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
      
      // Safely decode base64
      let jsonPayload;
      try {
        jsonPayload = decodeURIComponent(
          atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
      } catch (error) {
        console.error('Failed to decode base64 token', error);
        return true; // Consider it expired if we can't decode it
      }
  
      // Check for exp claim
      const payload = JSON.parse(jsonPayload);
      if (!payload || typeof payload.exp !== 'number') {
        console.warn('Token missing expiration claim');
        return true;
      }
      
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      return true; // Assume expired if decoding fails
    }
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired if there's an error
  }
};
