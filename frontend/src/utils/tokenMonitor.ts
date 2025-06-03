/**
 * Token Monitor - Ensures token persistence during navigation
 * 
 * This utility addresses the issue where React navigation between pages can cause
 * the token to be lost, leading to unwanted redirects to the login page.
 */

import { DEV_TOKEN, isDevMode, isDevToken } from './devMode';
import { forceAdminStatusForDevMode } from './syncAuthState';

// Store original localStorage methods to avoid recursion
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalGetItem = localStorage.getItem.bind(localStorage);

// Track if we're in a user-initiated logout
let intentionalLogout = false;

/**
 * Setup a token monitor that will prevent accidental token loss
 * during navigation between pages in development mode
 */
export function setupTokenMonitor(): void {
  if (!isDevMode()) return;
  console.log('[TokenMonitor] Setting up token persistence monitor for development mode');
  
  // Replace localStorage.removeItem to intercept token removal
  localStorage.removeItem = function(key: string): void {
    // If we're removing the token in dev mode, check if it's intentional
    if (key === 'token' && isDevMode() && !intentionalLogout) {
      const currentToken = originalGetItem('token');
      
      // If this is a dev token, prevent removal and log a warning
      if (currentToken && isDevToken(currentToken)) {
        console.warn('[TokenMonitor] Prevented accidental removal of dev token');
        return; // Don't remove the token
      }
    }
    
    // For all other cases or intentional logout, proceed normally
    originalRemoveItem(key);
  };
  
  // Setup monitoring interval to restore token if it's accidentally lost
  const intervalId = setInterval(() => {
    const token = originalGetItem('token');
    
    // In dev mode, if token is missing, restore it
    if (isDevMode() && !token) {
      console.warn('[TokenMonitor] Token missing - restoring dev token');
      originalSetItem('token', DEV_TOKEN);
      // Also restore auth state in session storage
      forceAdminStatusForDevMode();
    }
  }, 1000);
  
  // Create a cleanup function
  const cleanup = () => {
    clearInterval(intervalId);
    // Restore original methods
    localStorage.removeItem = originalRemoveItem;
    localStorage.setItem = originalSetItem;
    console.log('[TokenMonitor] Token monitor stopped and methods restored');
  };
  
  // Add the cleanup function to window for manual cleanup if needed
  if (typeof window !== 'undefined') {
    (window as any).__tokenMonitorCleanup = cleanup;
  }
  
  // Return to original behavior when component unmounts
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }
}

/**
 * Mark a logout as intentional so the monitor doesn't prevent it
 */
export function markLogoutIntentional(): void {
  intentionalLogout = true;
  // Reset after a short delay
  setTimeout(() => { intentionalLogout = false; }, 1000);
}

/**
 * Restore dev token if it's missing (helpful after navigation)
 * @returns boolean True if the token was restored, false if no action was needed
 */
export function restoreDevTokenIfMissing(): boolean {
  if (!isDevMode()) return false;
  
  const token = originalGetItem('token');
  if (!token) {
    console.log('[TokenMonitor] Restoring missing dev token after navigation');
    originalSetItem('token', DEV_TOKEN);
    forceAdminStatusForDevMode();
    return true;
  }
  
  return false;
}

// Auto-setup the monitor in development mode
if (isDevMode() && typeof window !== 'undefined') {
  setupTokenMonitor();
}
