import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { forceAdminStatusForDevMode } from '../utils/syncAuthState';
import { isDevMode, isDevToken, DEV_TOKEN } from '../utils/devMode';
import { useAuth } from '../contexts/AuthContext';
import { restoreDevTokenIfMissing } from '../utils/tokenMonitor';
import { logAuthState } from '../utils/authDebugger';

/**
 * Component that maintains auth state consistency during navigation
 * This component doesn't render anything visible but works in the background
 * to ensure auth state is preserved correctly, especially for admin routes
 */
export const NavigationAuthGuard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Get auth context including authChecked flag to prevent race conditions
  const { authChecked, user, isAdmin, refreshAuthStatus } = useAuth();
  
  // Track if this is the initial mount to prevent first-render redirects
  const isInitialMount = useRef(true);
  // Track previous path to detect actual navigation vs initial render
  const previousPath = useRef(location.pathname);
  // Track if token was restored during navigation
  const tokenRestoredRef = useRef(false);
    // Handle auth state on page load and token updates
  useEffect(() => {
    if (isDevMode() && authChecked) {
      // First time the auth context is checked, monitor token
      const token = localStorage.getItem('token');
      if (!token && user) {
        console.log('[DEBUG][NavGuard] Token missing at initialization');
        localStorage.setItem('token', DEV_TOKEN);
        tokenRestoredRef.current = true;
      }
    }
  }, [authChecked, user]);

  // Handle navigation between routes
  useEffect(() => {
    // Function to check and fix auth state on navigation
    const syncAuthOnNavigation = () => {
      // Skip any logic on first mount to prevent redirect race conditions
      if (isInitialMount.current) {
        console.log('[DEBUG][NavGuard] Skipping first mount sync to prevent redirect race conditions');
        isInitialMount.current = false;
        previousPath.current = location.pathname;
        return;
      }
      
      // Skip if this isn't a real navigation (same path)
      if (previousPath.current === location.pathname) {
        return;
      }
      
      console.log('[DEBUG] Navigation detected from:', previousPath.current, 'to:', location.pathname);
      previousPath.current = location.pathname;
      
      // Log auth state for debugging
      if (isDevMode()) {
        logAuthState('Navigation Auth State');
      }
      
      // Skip synchronization if authentication hasn't been checked yet
      if (!authChecked) {
        console.log('[DEBUG][NavGuard] Skipping auth sync - auth not yet checked');
        return;
      }
      
      // On any navigation event, ensure dev token is still valid if in development mode
      if (isDevMode()) {
        // Try to restore token if missing
        if (restoreDevTokenIfMissing()) {
          tokenRestoredRef.current = true;
          
          // Auto-refresh authentication status to prevent logout
          refreshAuthStatus().then(success => {
            if (success) {
              console.log('[DEBUG][NavGuard] Successfully restored authentication after token loss');
            } else {
              console.log('[DEBUG][NavGuard] Failed to restore authentication, trying force admin');
              // As a fallback, use the direct force mechanism
              forceAdminStatusForDevMode();
            }
          });
        }
      }
      
      // Monitor local storage for token changes that might happen during navigation
      const monitorLocalStorage = () => {
        const currentToken = localStorage.getItem('token');
        if (isDevMode() && !currentToken && user) {
          console.log('[DEBUG][NavGuard] Token unexpectedly removed during navigation monitoring');
          localStorage.setItem('token', DEV_TOKEN);
          forceAdminStatusForDevMode();
          tokenRestoredRef.current = true;
        }
      };
      
      // Check multiple times to catch async changes
      monitorLocalStorage();
      setTimeout(monitorLocalStorage, 100);
      setTimeout(monitorLocalStorage, 500);
          // Special handling for login page navigation - we want to avoid unwanted redirects
      if (location.pathname === '/login') {
        // If we already have a token and navigating to login, this might be an unwanted redirect
        const currentToken = localStorage.getItem('token');
        if (currentToken && isDevMode() && isDevToken(currentToken) && user) {
          console.log('[DEBUG][NavGuard] Detected potential unwanted redirect to login with active token');
          
          // Log auth state and call stack for debugging
          console.log('[DEBUG][NavGuard] Navigation to /login call stack:', new Error().stack);
          logAuthState('Login Redirect Prevention');
          
          // Fix the auth state to ensure it's consistent
          console.log('[DEBUG][NavGuard] Attempting to restore auth state...');
          
          // Force admin status directly for immediate effect
          forceAdminStatusForDevMode();
          
          // Then refresh auth status for React state update
          refreshAuthStatus().then(success => {
            if (success) {
              console.log('[DEBUG][NavGuard] Auth state restored successfully');
              
              // If we just restored the token, redirect back to home
              if (tokenRestoredRef.current) {
                console.log('[DEBUG][NavGuard] Redirecting back to home after token restoration');
                // Use navigate instead of location to avoid reload
                navigate('/');
                tokenRestoredRef.current = false;
              }
            }
          });
          
          // Try to prevent the redirect to login
          return;
        }
        
        // Regular login page navigation logic
        console.log('[DEBUG][NavGuard] Navigation to /login detected');
        const adminCacheRaw = sessionStorage.getItem('admin_check');
        console.log('[DEBUG][NavGuard] Auth state on /login navigation:', {
          token: currentToken ? 'exists' : 'null',
          isDev: isDevMode(),
          isDevToken: currentToken && isDevToken(currentToken),
          adminCache: adminCacheRaw ? JSON.parse(adminCacheRaw) : null
        });
      }
        // Check if this is an admin route
      const isAdminRoute = ['/manage/users', '/manage/questions'].some(
        route => location.pathname.startsWith(route)
      );
      
      if (isAdminRoute) {
        console.log('[DEBUG] Navigating to admin route, ensuring admin status');
        
        // Enhanced logging for admin route navigation
        const currentToken = localStorage.getItem('token');
        const adminCacheRaw = sessionStorage.getItem('admin_check');
        const authCacheRaw = sessionStorage.getItem('auth_cache');
        
        console.log('[DEBUG][NavGuard] Auth state on admin navigation:', {
          token: currentToken ? 'exists' : 'null',
          isDev: isDevMode(),
          isDevToken: currentToken && isDevToken(currentToken),
          adminCache: adminCacheRaw ? JSON.parse(adminCacheRaw) : null,
          authCache: authCacheRaw ? JSON.parse(authCacheRaw) : null
        });
        
        // Force proper admin status in dev mode
        if (isDevMode()) {
          forceAdminStatusForDevMode();
        }
      }
    };
      // Run the sync on every navigation    syncAuthOnNavigation();
    
  }, [location.pathname, authChecked, user, isAdmin, refreshAuthStatus]);

  // This component doesn't render anything visible
  return null;
};
