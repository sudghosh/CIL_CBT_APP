/**
 * Utility functions for token handling and validation
 */

import { isDevToken, isDevMode } from './devMode';

/**
 * Enhanced token validation with proper error handling
 * @param token The token to validate
 * @returns boolean - false if token is valid and not expired, true if expired/invalid
 */
export const validateToken = (token: string | null): boolean => {
  // Handle null token case
  if (!token) {
    console.warn('No token provided for validation');
    return false;
  }

  // Development token is always valid in development mode
  if (isDevToken(token) && isDevMode()) {
    console.log('Development token is always valid');
    return true;
  }

  try {
    // Only apply JWT validation to tokens that look like JWTs
    if (!token.includes('.') || token.split('.').length !== 3) {
      console.warn('Token has invalid format');
      return false;
    }

    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return false;
    }

    // Add padding if needed
    const padding = '='.repeat((4 - base64Url.length % 4) % 4);
    const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    try {
      const jsonPayload = decodeURIComponent(
        window.atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );

      const payload = JSON.parse(jsonPayload);
      if (!payload.exp) {
        console.warn('Token is missing expiration');
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      return now < payload.exp;
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      return false;
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

/**
 * Check if a token exists and is valid
 * Combines checking existence and validation in one step
 */
export const hasValidToken = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token && validateToken(token);
};

/**
 * Get current user information from token without API call
 * Useful when API is not available or to reduce API calls
 */
export const getUserFromToken = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }
  
  // Handle development token
  if (isDevToken(token) && isDevMode()) {
    return {
      user_id: 1,
      email: 'dev@example.com',
      first_name: 'Development',
      last_name: 'User',
      role: 'Admin', 
      is_active: true
    };
  }

  try {
    if (!token.includes('.') || token.split('.').length !== 3) {
      return null;
    }

    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }

    // Add padding if needed
    const padding = '='.repeat((4 - base64Url.length % 4) % 4);
    const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );

    const payload = JSON.parse(jsonPayload);
    
    // Extract user info from payload
    return {
      // Map common JWT fields to our user structure
      user_id: payload.sub || payload.id,
      email: payload.email || payload.sub,
      role: payload.role || 'User',
      is_active: true,
      first_name: payload.given_name,
      last_name: payload.family_name
    };
  } catch (error) {
    console.error('Error extracting user info from token:', error);
    return null;
  }
};
