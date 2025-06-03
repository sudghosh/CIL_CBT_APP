/**
 * Auth Debugger - Utilities to help diagnose authentication issues
 * This file contains tools to help debug authentication issues in development
 */

import { isDevMode, isDevToken } from './devMode';

/**
 * Creates a snapshot of the current authentication state
 * Useful for debugging auth issues and race conditions
 */
export function createAuthSnapshot(): Record<string, any> {
  // Get all authentication-related values from storage
  const token = localStorage.getItem('token');
  const adminCheckRaw = sessionStorage.getItem('admin_check');
  const adminCheck = adminCheckRaw ? JSON.parse(adminCheckRaw) : null;
  const authCacheRaw = sessionStorage.getItem('auth_cache');
  const authCache = authCacheRaw ? JSON.parse(authCacheRaw) : null;
  const userCacheRaw = sessionStorage.getItem('user_cache');
  const userCache = userCacheRaw ? JSON.parse(userCacheRaw) : null;
  const lastAuthCheck = sessionStorage.getItem('lastAuthCheck');
  const lastAdminCheck = sessionStorage.getItem('lastAdminCheck');
  const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');

  // Create the snapshot object
  const snapshot = {
    timestamp: new Date().toISOString(),
    token: {
      exists: !!token,
      isDev: token && isDevToken(token),
    },
    adminCheck: {
      exists: !!adminCheck,
      value: adminCheck?.value,
      expired: adminCheck ? Date.now() > adminCheck.expires : null,
      expiresAt: adminCheck?.expires ? new Date(adminCheck.expires).toISOString() : null,
    },
    authCache: {
      exists: !!authCache,
      value: authCache?.value,
      expired: authCache ? Date.now() > authCache.expires : null,
      expiresAt: authCache?.expires ? new Date(authCache.expires).toISOString() : null,
    },
    userCache: {
      exists: !!userCache,
      isAdmin: userCache?.role === 'Admin' || userCache?.isVerifiedAdmin,
    },
    timestamps: {
      lastAuthCheck: lastAuthCheck ? new Date(parseInt(lastAuthCheck, 10)).toISOString() : null,
      lastAdminCheck: lastAdminCheck ? new Date(parseInt(lastAdminCheck, 10)).toISOString() : null,
      timeSinceLastAuth: lastAuthCheck ? Date.now() - parseInt(lastAuthCheck, 10) : null,
      timeSinceLastAdminCheck: lastAdminCheck ? Date.now() - parseInt(lastAdminCheck, 10) : null,
    },
    navigation: {
      redirectAfterLogin,
      url: window.location.href,
      path: window.location.pathname,
    },
    devMode: isDevMode(),
  };

  return snapshot;
}

/**
 * Logs the current authentication state
 * @param label An optional label to identify this snapshot in logs
 */
export function logAuthState(label = 'Auth State Snapshot'): void {
  if (!isDevMode()) return;
  
  const snapshot = createAuthSnapshot();
  console.log(`[DEBUG][${label}]`, snapshot);
  
  // Quick summary of auth status
  const summaryItems = [];
  
  if (snapshot.token.exists) {
    summaryItems.push('✅ Token exists');
    if (snapshot.token.isDev) summaryItems.push('👨‍💻 Dev token');
  } else {
    summaryItems.push('❌ No token');
  }
  
  if (snapshot.adminCheck.exists && !snapshot.adminCheck.expired) {
    summaryItems.push('✅ Valid admin cache');
  } else if (snapshot.adminCheck.expired) {
    summaryItems.push('⚠️ Admin cache expired');
  } else {
    summaryItems.push('❌ No admin cache');
  }
  
  if (snapshot.authCache.exists && !snapshot.authCache.expired) {
    summaryItems.push('✅ Valid auth cache');
  } else if (snapshot.authCache.expired) {
    summaryItems.push('⚠️ Auth cache expired');
  } else {
    summaryItems.push('❌ No auth cache');
  }
  
  console.log('[DEBUG][Summary]', summaryItems.join(' | '));
}

// Add to window object in dev mode for console access
if (isDevMode() && typeof window !== 'undefined') {
  (window as any).logAuthState = logAuthState;
  (window as any).createAuthSnapshot = createAuthSnapshot;
}
