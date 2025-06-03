/**
 * Authentication Verification Utility
 * This utility provides a comprehensive check of the authentication system
 * to ensure all components are working correctly, especially for development mode.
 */

import { isDevToken, isDevMode, DEV_TOKEN } from './devMode';
import { isAuthenticatedFromCache, isAdminFromCache, getCachedUser } from './authCache';
import { forceDevModeAdmin } from './fixAuthIssues';

/**
 * Detailed verification of the authentication system
 * Returns a report of all authentication systems status
 */
export const verifyAuthSystem = (): Record<string, any> => {
  // Check localStorage
  const token = localStorage.getItem('token');
  const isDevTokenActive = token === DEV_TOKEN;
  
  // Check sessionStorage
  const authCache = sessionStorage.getItem('auth_cache');
  const adminCache = sessionStorage.getItem('admin_check');
  const userCache = sessionStorage.getItem('user_cache');
  const lastAuthCheck = sessionStorage.getItem('lastAuthCheck');
  const lastAdminCheck = sessionStorage.getItem('lastAdminCheck');
  const devAuthInitialized = sessionStorage.getItem('devAuthInitialized');
  
  // Parse cache data (if exists)
  let authCacheData = null;
  let adminCacheData = null;
  let userCacheData = null;
  
  try {
    if (authCache) authCacheData = JSON.parse(authCache);
    if (adminCache) adminCacheData = JSON.parse(adminCache);
    if (userCache) userCacheData = JSON.parse(userCache);
  } catch (error) {
    console.error('Error parsing cache data:', error);
  }
  
  // Check user and admin status
  const authenticated = isAuthenticatedFromCache();
  const adminAccess = isAdminFromCache();
  const cachedUser = getCachedUser();
  
  // Check expiration times
  const now = Date.now();
  const authExpired = authCacheData?.expires ? authCacheData.expires < now : true;
  const adminExpired = adminCacheData?.expires ? adminCacheData.expires < now : true;
  const userExpired = userCacheData?.expires ? userCacheData.expires < now : true;
  
  // Time since last checks
  const timeSinceAuthCheck = lastAuthCheck 
    ? Math.round((now - parseInt(lastAuthCheck, 10)) / 1000 / 60) // minutes
    : null;
    
  const timeSinceAdminCheck = lastAdminCheck
    ? Math.round((now - parseInt(lastAdminCheck, 10)) / 1000 / 60) // minutes
    : null;

  // Check development mode status
  const devMode = isDevMode();
  
  // Build verification report
  const report = {
    overview: {
      authenticated,
      adminAccess,
      isDevMode: devMode,
      isDevToken: isDevTokenActive,
      devAuthInitialized: !!devAuthInitialized,
    },
    token: {
      exists: !!token,
      isDevToken: isDevTokenActive,
      tokenPreview: token ? `${token.substring(0, 10)}...` : null,
    },
    cache: {
      authCached: !!authCache,
      adminCached: !!adminCache,
      userCached: !!userCache,
      authExpired,
      adminExpired,
      userExpired,
      timeSinceAuthCheck: timeSinceAuthCheck !== null ? `${timeSinceAuthCheck} minutes ago` : 'never',
      timeSinceAdminCheck: timeSinceAdminCheck !== null ? `${timeSinceAdminCheck} minutes ago` : 'never',
    },
    user: cachedUser,
    timestamp: new Date().toISOString(),
  };
  
  return report;
};

/**
 * Run a quick check of the authentication system and fix any issues found
 * Particularly useful during development if authentication is behaving unexpectedly
 * 
 * @returns {boolean} true if everything is working correctly, false if issues were detected and fixed
 */
export const quickAuthCheck = (): boolean => {
  console.log('🔍 Running quick authentication check...');
  
  const report = verifyAuthSystem();
  
  // Check for common issues
  const issues: string[] = [];
  
  // 1. Check if in dev mode but not using dev token
  if (isDevMode() && !report.token.isDevToken) {
    issues.push('Development mode detected but not using dev token');
  }
  
  // 2. Check if using dev token but not marked as admin
  if (report.token.isDevToken && !report.overview.adminAccess) {
    issues.push('Using dev token but not marked as admin');
  }
  
  // 3. Check for expired caches
  if (report.cache.authExpired || report.cache.adminExpired || report.cache.userExpired) {
    issues.push('One or more authentication caches have expired');
  }
  
  // If issues detected, fix them
  if (issues.length > 0) {
    console.log('⚠️ Authentication issues detected:');
    issues.forEach(issue => console.log(`- ${issue}`));
    
    // Apply fixes
    console.log('🔧 Applying fixes...');
    if (isDevMode()) {
      forceDevModeAdmin(false);
    }
    
    console.log('✅ Fixes applied. Please refresh the page to see changes.');
    return false;
  }
  
  console.log('✅ Authentication system working correctly!');
  return true;
};

// Expose the verification tools globally in development mode
if (process.env.NODE_ENV === 'development') {
  // Add to existing devTools or create if not exists
  (window as any).devTools = {
    ...(window as any).devTools || {},
    verify: verifyAuthSystem,
    quickCheck: quickAuthCheck
  };

  console.log('🔧 Authentication verification tools added to window.devTools');
  console.log('  - window.devTools.verify() - Generate a detailed auth verification report');
  console.log('  - window.devTools.quickCheck() - Run a quick check and fix common issues');
}
