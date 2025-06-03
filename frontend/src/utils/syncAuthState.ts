/**
 * Auth State Synchronization
 * Helps to recover from potential race conditions and state inconsistencies
 * between different auth mechanisms
 */

import { isDevMode, isDevToken, DEV_TOKEN } from './devMode';
import { cacheAuthState, isAdminFromCache } from './authCache';

interface User {
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  isVerifiedAdmin?: boolean;
}

// Mock user for development purposes - kept in sync with AuthContext
const mockUser: User = {
  user_id: 1,
  email: 'dev@example.com',
  first_name: 'Development',
  last_name: 'User',
  role: 'Admin',
  is_active: true,
  isVerifiedAdmin: true
};

/**
 * Synchronizes auth state across localStorage, sessionStorage and state.
 * Call this function whenever auth state might be inconsistent.
 * 
 * @returns Object with synchronized user state
 */
export const syncAuthState = (): { user: User | null, isAdmin: boolean } => {
  console.log('[DEBUG] Synchronizing auth state');
  
  const token = localStorage.getItem('token');
  const authCache = sessionStorage.getItem('auth_cache');
  
  // No token or cache means not authenticated
  if (!token && !authCache) {
    console.log('[DEBUG] No token or auth cache found, auth state is unauthenticated');
    return { user: null, isAdmin: false };
  }
  
  // Development mode with dev token
  if (isDevMode() && token && isDevToken(token)) {
    console.log('[DEBUG] Dev mode with dev token, ensuring consistent auth state');
    
    // Ensure token is in localStorage
    if (token !== DEV_TOKEN) {
      localStorage.setItem('token', DEV_TOKEN);
    }
    
    // Ensure admin status is cached
    if (!isAdminFromCache()) {
      console.log('[DEBUG] Fixing admin cache for dev mode');
      cacheAuthState({...mockUser, isVerifiedAdmin: true});
      
      // Set timestamps for auth checks
      sessionStorage.setItem('lastAuthCheck', Date.now().toString());
      sessionStorage.setItem('lastAdminCheck', Date.now().toString());
    }
    
    return { user: mockUser, isAdmin: true };
  }
  
  // TODO: Handle non-dev mode synchronization if needed
  
  // Return current state based on cache
  const isAdmin = isAdminFromCache();
  console.log('[DEBUG] Auth state synchronized, isAdmin:', isAdmin);
  return { user: null, isAdmin }; // Return null user as we don't have enough info to reconstruct
};

/**
 * Force admin status for dev mode, correcting any inconsistencies
 * Call this when admin routes fail despite having dev token
 */
export const forceAdminStatusForDevMode = (): void => {
  if (!isDevMode()) return;
  
  console.log('[DEBUG] Forcing admin status for dev mode');
  
  const token = localStorage.getItem('token');
  if (!token || !isDevToken(token)) {
    localStorage.setItem('token', DEV_TOKEN);
  }
  
  // Set admin cache with long expiration
  sessionStorage.setItem('admin_check', JSON.stringify({
    value: true,
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }));
  
  // Update timestamps
  sessionStorage.setItem('lastAuthCheck', Date.now().toString());
  sessionStorage.setItem('lastAdminCheck', Date.now().toString());
  
  // Ensure auth cache exists
  const authCache = sessionStorage.getItem('auth_cache');
  if (!authCache) {
    sessionStorage.setItem('auth_cache', JSON.stringify({
      value: true,
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));
  }
  
  // Cache the mock user
  cacheAuthState({...mockUser, isVerifiedAdmin: true});
};
