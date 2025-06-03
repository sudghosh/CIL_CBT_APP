import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { forceAdminStatusForDevMode } from '../utils/syncAuthState';
import { isDevMode } from '../utils/devMode';

/**
 * Component that maintains auth state consistency during navigation
 * This component doesn't render anything visible but works in the background
 * to ensure auth state is preserved correctly, especially for admin routes
 */
export const NavigationAuthGuard: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Function to check and fix auth state on navigation
    const syncAuthOnNavigation = () => {
      console.log('[DEBUG] Navigation detected to:', location.pathname);
      
      // Check if this is an admin route
      const isAdminRoute = ['/users', '/questions'].some(
        route => location.pathname.startsWith(route)
      );
      
      if (isAdminRoute) {
        console.log('[DEBUG] Navigating to admin route, ensuring admin status');
        
        // Force proper admin status in dev mode
        if (isDevMode()) {
          forceAdminStatusForDevMode();
        }
      }
    };

    // Run the sync on every navigation
    syncAuthOnNavigation();
    
  }, [location.pathname]);

  // This component doesn't render anything visible
  return null;
};
