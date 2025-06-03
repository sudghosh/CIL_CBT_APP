/**
 * Developer Tools for Authentication Testing
 * This file provides global helper functions for fixing authentication issues
 * during development. These functions are exposed globally in development mode.
 */

import { DEV_TOKEN } from './devMode';
import { forceDevModeAdmin } from './fixAuthIssues';
import { syncAuthState, forceAdminStatusForDevMode } from './syncAuthState';

// Make sure we're in development mode before creating global dev utilities
if (process.env.NODE_ENV === 'development') {  // Add global utilities
  (window as any).devTools = {
    /**
     * Force admin authentication for testing purposes
     */
    forceAdmin: () => {
      console.log('🔧 Forcing development mode admin authentication...');
      forceDevModeAdmin();
      forceAdminStatusForDevMode(); // Use the new utility for more robust fix
      console.log('✅ Admin authentication forced successfully!');
      console.log('📝 You should now have admin access to all features');
      console.log('🔄 If changes don\'t apply immediately, try refreshing the page');
    },
    
    /**
     * Synchronize authentication state - fixes navigation issues
     */    syncAuth: () => {
      console.log('🔄 Synchronizing authentication state...');
      const { user, isAdmin } = syncAuthState();
      console.log('✅ Auth state synchronized!');
      console.log(`- User authenticated: ${!!user}`);
      console.log(`- Admin status: ${isAdmin}`);
      return { user, isAdmin };
    },
    
    /**
     * Prevent logout by setting up a token monitor and auto-restore mechanism
     */
    preventLogout: () => {
      console.log('🛡️ Setting up logout prevention...');
      
      // Immediately restore token if missing
      if (!localStorage.getItem('token')) {
        console.log('🔄 Restoring missing dev token');
        localStorage.setItem('token', DEV_TOKEN);
      }
      
      // Set up a monitoring interval
      const intervalId = setInterval(() => {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('⚠️ Token was removed - auto-restoring');
          localStorage.setItem('token', DEV_TOKEN);
          forceAdminStatusForDevMode();
        }
      }, 1000); // Check every second
      
      console.log('✅ Logout prevention active - token will be auto-restored if removed');
      console.log('ℹ️ This will run until page reload or you call stopPreventLogout()');
      
      // Return a function to clear the interval
      (window as any).devTools.stopPreventLogout = () => {
        clearInterval(intervalId);
        console.log('⛔ Logout prevention disabled');
      };
      
      return true;
    },
    
    /**
     * Check current authentication state
     */
    checkAuth: () => {
      const token = localStorage.getItem('token');
      const isDevToken = token === DEV_TOKEN;
      const authCache = sessionStorage.getItem('auth_cache');
      const adminCache = sessionStorage.getItem('admin_check');
      const userCache = sessionStorage.getItem('user_cache');
      
      console.log('🔍 Authentication State Check:');
      console.log(`- Token exists: ${!!token}`);
      console.log(`- Is dev token: ${isDevToken}`);
      console.log(`- Auth cached: ${!!authCache}`);
      console.log(`- Admin cached: ${!!adminCache}`);
      console.log(`- User cached: ${!!userCache}`);
      
      if (userCache) {
        try {
          const userData = JSON.parse(userCache);
          console.log('- Cached user data:', userData.value);
          console.log(`- Cache expires: ${new Date(userData.expires).toLocaleTimeString()}`);
        } catch (e) {
          console.log('- Error parsing user cache');
        }
      }
      
      return {
        token,
        isDevToken,
        authCache: authCache ? JSON.parse(authCache) : null,
        adminCache: adminCache ? JSON.parse(adminCache) : null,
        userCache: userCache ? JSON.parse(userCache) : null
      };
    },
    
    /**
     * Reset authentication state completely
     */
    resetAuth: () => {
      console.log('🔄 Resetting all authentication data...');
      localStorage.removeItem('token');
      sessionStorage.removeItem('auth_cache');
      sessionStorage.removeItem('user_cache');
      sessionStorage.removeItem('admin_check');
      sessionStorage.removeItem('lastAuthCheck');
      sessionStorage.removeItem('lastAdminCheck');
      sessionStorage.removeItem('devLoginAttempted');
      sessionStorage.removeItem('devAuthInitialized');
      sessionStorage.removeItem('redirectAfterLogin');
      console.log('✅ Authentication reset complete. Refreshing page...');
      console.log('[DEBUG][HardRedirect][devTools] Redirecting to /login');
      setTimeout(() => window.location.href = '/login', 500);
    }
  };
    console.log('🔧 Development tools initialized. Access them using window.devTools');
  console.log('🔧 Available commands:');
  console.log('  - window.devTools.forceAdmin() - Force admin authentication');
  console.log('  - window.devTools.syncAuth() - Synchronize auth state (fixes navigation issues)');
  console.log('  - window.devTools.checkAuth() - Check current authentication state');
  console.log('  - window.devTools.resetAuth() - Reset all authentication data');
}
