# CIL HR Exam Question Bank - Authentication System

## Authentication System Overview

This document provides information about the authentication system in the CIL HR Exam Question Bank application, including recent fixes to development mode authentication.

## Authentication Methods

The application supports two authentication methods:

1. **Google OAuth Login**: The primary authentication method for production use.
2. **Development Login**: A simplified login process for local development and testing.

## Development Mode Authentication

The development mode authentication system has been enhanced to prevent session expiration issues and UI flickering during navigation. The latest updates improve reliability when navigating between pages, particularly for admin routes.

### Race Condition on Admin Routes (Fixed)

Previously, a race condition could occur where admin users would be redirected to `/login` despite having proper authentication. This happened because:

1. Route components would evaluate user/admin status before authentication had fully initialized
2. The `authChecked` flag wasn't being properly used to prevent premature redirects
3. Components would make routing decisions before the auth context was ready

We've fixed this issue by:

1. Exposing the `authChecked` flag in the auth context, making it accessible via `useAuth()`
2. Adding an explicit check in `AdminRoute` that prevents any routing decisions until `authChecked` is true
3. Adding enhanced logging to better trace navigation events and authentication state
4. Showing a loading state when auth is still being checked

### Key Components

- **DevModeAuthFix**: A UI component that appears only in development mode, providing a quick way to fix authentication issues.
- **NavigationAuthGuard**: A background component that ensures auth state is preserved during navigation between routes.
- **devTools.ts**: Global developer tools accessible in the browser console for managing authentication state.
- **authVerification.ts**: Tools to verify and diagnose authentication issues.
- **fixAuthIssues.ts**: Functions to fix common authentication problems.
- **syncAuthState.ts**: New utilities to synchronize auth state across storage and components.

### Using Development Mode Authentication

1. Start the application in development mode.
2. Use the "Development Login (Bypass Google)" button on the login page.
3. If you encounter any authentication issues, use the "Fix Admin Auth" button in the bottom-right corner.

### Browser Console Tools

In development mode, the following tools are available in the browser console:

```javascript
// Force admin authentication
window.devTools.forceAdmin();

// Synchronize auth state (fixes navigation issues)
window.devTools.syncAuth();

// Check current authentication state
window.devTools.checkAuth();

// Reset all authentication data
window.devTools.resetAuth();

// Verify authentication system
window.devTools.verify();

// Run a quick check and fix common issues
window.devTools.quickCheck();
```

## Troubleshooting Authentication During Navigation

The application now includes special handling to maintain authentication state during navigation between pages, which should prevent issues when accessing admin routes like "Manage Users" and "Manage Questions".

### Common Navigation Issues

If you encounter authentication issues when navigating between pages:

1. **Admin Routes Redirect to Home**: This typically happens when the admin status cache is inconsistent. Use the "Fix Admin Auth" button in the bottom right corner to resolve.

2. **Unexpected Logout**: If navigating between pages causes you to be logged out, check the browser console for authentication logs. The system now has a failsafe to prevent this, but if it occurs:
   - Try refreshing the page
   - Use `window.devTools.forceAdmin()` in the console
   - Click the "Fix Admin Auth" button

### How The Fix Works

The latest fixes include several mechanisms to ensure authentication persistence:

1. **Auth State Synchronization**: On navigation, the system automatically checks and synchronizes auth state across components and storage
2. **NavigationAuthGuard**: A dedicated component monitors navigation events and reinforces auth state for admin routes
3. **Enhanced Caching**: Admin status caching now has enhanced persistence in development mode
4. **Prevention of Race Conditions**: Fixed timing issues that could cause admin status to be lost during navigation

### Race Condition on Admin Routes (Development Mode)

If you experience being redirected to `/login` when accessing admin routes in development mode, even though you are authenticated as admin, this is likely due to a race condition:

- The admin route guard was checking `user`/`isAdmin` before the authentication context was fully initialized.
- This caused a brief moment where `user` was `null`, triggering a redirect.

**Solution:**
- The admin route now waits for `authChecked` (or `loading` to be `false`) before checking `user`/`isAdmin`.
- This prevents unwanted redirects and ensures the context is fully ready before any admin check.

If you still see issues, use the dev tools (`window.devTools.forceAdmin()`, `window.devTools.syncAuth()`) or the "Fix Admin Auth" button, and check the console for `[DEBUG]` logs.

### Debug Logging for Authentication (Development Only)

To help diagnose issues with authentication state, debug logs are printed to the browser console on every render of the authentication context. These logs show:

- The current token in localStorage
- The current authentication and admin cache in sessionStorage
- When the dev token is set or removed

If you are unexpectedly logged out or see session issues, check the console for `[DEBUG]` logs to trace when the token or cache changes.

### Failsafe: Dev Token Restoration (Development Only)

If you are in development mode and see that the token in localStorage is missing (but the session cache is present), the app will now automatically restore the dev token. This prevents unexpected logouts due to localStorage issues in development.

If you still see issues:

- Make sure your browser or extensions are not clearing localStorage.
- Check the console for `[DEBUG] Failsafe: Dev token restored in localStorage`.
- If the problem persists, try running `window.devTools.forceAdmin()` or `window.devTools.resetAuth()` in the console.

## Common Issues and Solutions

### Session Expiration

If you see "Your session has expired. Please log in again" when navigating between pages:

1. Click the "Fix Admin Auth" button in the bottom-right corner.
2. If that doesn't work, open the browser console and run `window.devTools.resetAuth()`.
3. **Check the console for `[DEBUG]` logs** to see if the dev token is being set or removed unexpectedly.

### Admin Access Issues

If admin routes are not accessible:

1. Click the "Fix Admin Auth" button.
2. Verify admin status using `window.devTools.checkAuth()` in the console.

### UI Flickering

If the UI flickers during navigation (showing login page briefly):

1. This is fixed by improved caching of authentication state.
2. If it persists, run `window.devTools.quickCheck()` in the console.

## Advanced Troubleshooting: Tracing Unexpected Redirects

If you experience unexpected redirects to `/login` even when authentication context is correct:

1. The app now logs the call stack in the browser console whenever navigation to `/login` is detected (see `NavigationAuthGuard`).
2. Check the console for `[DEBUG][NavGuard] Navigation to /login call stack:` and review the stack trace to identify the source of navigation.
3. This can help pinpoint if a third-party component, stale effect, or external code is causing the redirect.

If you find the source, remove or fix the offending code. If the stack trace points to a library or browser extension, try disabling it or updating your code accordingly.

## Architecture

The authentication system uses:

- **Local Storage**: Stores the authentication token.
- **Session Storage**: Caches authentication state for better performance.
- **Context API**: Provides authentication state throughout the application.

## Recent Improvements

1. Enhanced development token validation
2. Improved caching of authentication state
3. Added UI-based authentication fix for development mode
4. Added global developer tools for authentication management
5. Added verification tools to diagnose authentication issues
6. Extended cache expiration time from 30 to 60 minutes
7. **Added debug logging for authentication troubleshooting in development mode**

## Security Note

Development mode authentication is only available in the development environment and should never be used in production.

## Production Readiness Checklist

When preparing the app for production, ensure the following steps are taken to remove all development authentication logic and tools:

1. **Remove Development Login UI:**
   - Delete the "Development Login (Bypass Google)" button from the login page.
   - Remove the `DevModeAuthFix` component from the app.

2. **Remove Dev Tools:**
   - Delete or comment out all code in `devTools.ts` and any references to `window.devTools` in the codebase.

3. **Remove Development Auth Logic:**
   - Remove all code that sets or checks for the dev token (e.g., `dev-token-for-testing`).
   - Remove all logic that forces admin status or bypasses Google OAuth in development mode.
   - Remove or disable any code in `syncAuthState.ts`, `fixAuthIssues.ts`, or similar files that is only used for development authentication.

4. **Remove Debug Logging:**
   - Delete all `[DEBUG]` logs related to authentication, admin status, or dev mode.

5. **Update Documentation:**
   - Clearly state in the documentation that only Google OAuth is supported in production.
   - Remove or archive all development-only troubleshooting steps.

6. **Test Production Build:**
   - Build the app with `NODE_ENV=production` and verify that only Google OAuth login is available and all dev tools are gone.

---

> **Tip:** Before deploying, search the codebase for keywords like `dev`, `bypass`, `forceAdmin`, `debug`, and `window.devTools` to ensure all development authentication logic is removed.

---
