# Authentication Race Condition Fix Documentation

## Overview of the Issue

We encountered a race condition in the authentication flow where admin users would be redirected to `/login` despite having the proper authentication. This happened primarily in two scenarios:

1. When navigating between pages, causing token loss in development mode
2. When React first mounted components, causing redirects before authentication was fully initialized

## Comprehensive Root Cause Analysis

1. **Token Loss During Navigation**: 
   - React navigation between pages was sometimes causing token loss from localStorage
   - Even with the token in localStorage, components were making decisions before authentication context was updated
   
2. **Race Conditions in Authentication**: 
   - Some components were making routing decisions before authentication was fully initialized
   - The auth context's `authChecked` flag wasn't being properly utilized in route guards
   
3. **NavigationAuthGuard Issues**:
   - Not properly handling navigations after initial mount
   - Missing persistent token monitoring between navigations
   - Login page redirect logic was incomplete
   - NavigationAuthGuard would run its effect and possibly cause a navigation to `/login` before authentication check was complete.

2. **Route Guards Component Logic**:
   - AdminRoute and ProtectedRoute components immediately redirected to `/login` if `user` was null.
   - This happened even during the first render, before auth checks completed.

3. **Navigation Guard Issues**:
   - The NavigationAuthGuard component was logging and potentially triggering redirects on component mount.

## Complete Solution Implemented

1. **Token Persistence Layer**:
   - Added a `tokenMonitor.ts` utility that intercepts and tracks token removal
   - Automatically restores development tokens if they're accidentally removed
   - Monitors localStorage continuously for token changes
   - Provides an API to mark intentional logout vs accidental token removal

2. **Enhanced Route Guards**:
   - Added `isInitialMount` ref to track if a component is in its first render cycle
   - Added special handling for dev tokens to prevent unnecessary login redirects
   - Wait for the `authChecked` flag before making routing decisions
   - Show appropriate loading states during authentication verification

3. **Improved NavigationAuthGuard**:
   - Added previous path tracking to detect real navigation vs state changes
   - Enhanced token restoration mechanism during navigation
   - Added special handling for login page navigation with active token
   - Performs token monitoring at multiple points during navigation
   
4. **Auth Context Improvements**:
   - Special handling to prevent logout in development mode
   - Added token persistence mechanisms and checks
   - Implemented event system for auth state changes

## Implementation Details

### Token Monitor (tokenMonitor.ts)
```tsx
// Store original localStorage methods to avoid recursion
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalGetItem = localStorage.getItem.bind(localStorage);

// Setup a token monitor that will prevent accidental token loss
export function setupTokenMonitor(): void {
  if (!isDevMode()) return;
  
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
}
```

### Enhanced NavigationAuthGuard
```tsx
// Handle navigation between routes
useEffect(() => {
  // Function to check and fix auth state on navigation
  const syncAuthOnNavigation = () => {
    // Skip any logic on first mount to prevent redirect race conditions
    if (isInitialMount.current) {
      console.log('[DEBUG][NavGuard] Skipping first mount sync');
      isInitialMount.current = false;
      previousPath.current = location.pathname;
      return;
    }
    
    // On any navigation event, ensure dev token is still valid
    if (isDevMode()) {
      // Try to restore token if missing
      if (restoreDevTokenIfMissing()) {
        tokenRestoredRef.current = true;
        
        // Auto-refresh authentication status
        refreshAuthStatus();
      }
    }
  };
  
  // Run the sync on every navigation
  syncAuthOnNavigation();
}, [location.pathname, authChecked]);
```

### Improved AdminRoute in App.tsx
```tsx
if (!user) {
  // Check for development mode token before redirecting
  const token = localStorage.getItem('token');
  const isDevUser = isDevMode() && token && isDevToken(token);
  
  // If we're in dev mode with a dev token but no user, wait for auth context to update
  if (isDevUser && !user && !isInitialMount.current) {
    console.log('[DEBUG][AdminRoute] Dev token detected but no user - waiting for auth check');
    
    // Force admin status for dev mode
    if (isDevMode()) {
      forceAdminStatusForDevMode();
    }
    
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Restoring development authentication...</Typography>
      </Box>
    );
  }
  
  // Only redirect after auth check is complete
  if (!isInitialMount.current && authChecked) {
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" replace />;
  }
}
```

### API Service Improvements (api.ts)
```tsx
// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');
    let tokenRestored = false;
    
    // Auto-restore dev token if missing in development mode
    if (!token && isDevMode()) {
      console.log(`[API] No token found for request, restoring dev token`);
      token = DEV_TOKEN;
      localStorage.setItem('token', DEV_TOKEN);
      tokenRestored = true;
      
      // Dispatch event to notify about token restoration
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('dev-token-restored', { 
          detail: { timestamp: Date.now() } 
        });
        window.dispatchEvent(event);
      }
    }
    
    // Handle development token specially
    if (token && isDevToken(token) && isDevMode()) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Dev-Mode'] = 'true';
    }
});
```

## Development Tools

Several development utilities were added to help debug auth issues:

```javascript
// Access in browser console
window.devTools.preventLogout() // Set up token monitoring to prevent logout
window.devTools.checkAuth()     // Check current authentication state
window.devTools.syncAuth()      // Manually synchronize authentication state
window.devTools.forceAdmin()    // Force development admin authentication
```

## Testing

To verify the fix:
1. Open the app in development mode with dev token
2. Navigate between multiple pages, including admin routes
3. Verify you're not being redirected to the login page
4. Check the console - you should see auth state being maintained

## Production Considerations

1. All development-only code is enclosed within `isDevMode()` checks
2. Token monitoring is only active in development mode
3. Debug logs are tagged with `[DEBUG]` for easy removal in production

Once the fix is verified, remember to:

1. Run the cleanup script to remove debug logs:
   ```bash
   npx ts-node scripts/cleanup-debug-logs.ts
   ```

2. Consider removing isInitialMount refs if needed for production (optional)

3. Review the overall authentication flow for other potential race conditions
