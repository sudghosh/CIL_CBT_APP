# CIL HR Exam Question Bank - Authentication System

## Authentication System Overview

This document provides information about the authentication system in the CIL HR Exam Question Bank application, including recent fixes to development mode authentication.

## Authentication Methods

The application supports two authentication methods:

1. **Google OAuth Login**: The primary authentication method for production use.
2. **Development Login**: A simplified login process for local development and testing.

## Development Mode Authentication

The development mode authentication system has been enhanced to prevent session expiration issues and UI flickering during navigation. The latest updates improve reliability when navigating between pages, particularly for admin routes.

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
