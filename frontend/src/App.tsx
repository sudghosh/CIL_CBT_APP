import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box, LinearProgress, Typography, Button } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './contexts/ThemeContext';
import { authAPI } from './services/api';
import { shouldReauthenticate, timeSinceLastAuthCheck, recordAuthCheck, recordAdminCheck } from './utils/authOptimization';
import { isAuthenticatedFromCache, cacheAuthState } from './utils/authCache';
import { isDevToken, isDevMode } from './utils/devMode';
import { forceAdminStatusForDevMode } from './utils/syncAuthState';
import { setupTokenMonitor } from './utils/tokenMonitor';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { MockTestPage } from './pages/MockTestPage';
import { PracticeTestPage } from './pages/PracticeTestPage';
import { ResultsPage } from './pages/ResultsPage';
import { QuestionManagement } from './pages/QuestionManagement';
import { PaperManagement } from './pages/PaperManagement';
import { UserManagement } from './pages/UserManagement';
import { PerformanceDashboard } from './pages/PerformanceDashboard';
import HealthCheck from './pages/HealthCheck';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevModeAuthFix } from './components/DevModeAuthFix';
import { NavigationAuthGuard } from './components/NavigationAuthGuard';

// Theme is now managed by ThemeContext

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, refreshAuthStatus, authChecked } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  // Track initial mount to prevent first-render redirects
  const isInitialMount = React.useRef(true);
  
  // Debug log
  console.log('[DEBUG][ProtectedRoute] user:', user, 'loading:', loading, 'authChecked:', authChecked, 'isInitialMount:', isInitialMount.current);
    // Check token validity when accessing protected routes
  useEffect(() => {
    // On first render, mark as no longer initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    
    // Prevent refreshing auth status on every re-render
    // Only do it when necessary (no user or first time accessing a protected route)
    const token = localStorage.getItem('token');
    const authCheckInterval = 5 * 60 * 1000; // 5 minutes
    
    // Skip authentication check if:
    // 1. We already have authentication cached
    // 2. We've checked recently (within 5 minutes)
    // 3. We're in development mode with dev token
    if (token && user && (!shouldReauthenticate() || timeSinceLastAuthCheck() < authCheckInterval)) {
      // No need to verify
      return;
    }
    
    // Otherwise, perform authentication check
    if (token) {
      setIsVerifying(true);
      refreshAuthStatus().then(success => {
        if (success && user) {
          // Cache the authentication result for better performance
          cacheAuthState(user);
        }
      }).finally(() => {
        setIsVerifying(false);
        // Record that we performed an auth check
        recordAuthCheck();
      });
    }
  }, [user, refreshAuthStatus]);

  if (loading || isVerifying) {
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Loading your profile...</Typography>
      </Box>
    );
  }  if (!user) {
    // Check for development mode token before redirecting
    const token = localStorage.getItem('token');
    const isDevUser = isDevMode() && token && isDevToken(token);
    
    // If we're in dev mode with a dev token but no user, wait for auth context to update
    if (isDevUser && !user && !isInitialMount.current) {
      console.log('[DEBUG][ProtectedRoute] Dev token detected but no user - waiting for auth check');
      return (
        <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LinearProgress sx={{ width: '50%', mb: 2 }} />
          <Typography variant="body1">Restoring development authentication...</Typography>
        </Box>
      );
    }
    
    // Only redirect after the initial mount is complete and authentication is checked
    if (!isInitialMount.current && authChecked) {
      // Save the current URL for redirecting back after login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      console.log('[DEBUG][Redirect][AppRoute] Redirecting to /login because user is:', user, 'token:', token, 'loading:', loading);
      return <Navigate to="/login" replace />;
    }
    // Show loading instead of redirecting during initial mount
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Verifying authentication status...</Typography>
      </Box>
    );
  }

  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, refreshAuthStatus, authChecked } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  // Track initial mount to prevent first-render redirects
  const isInitialMount = React.useRef(true);
  
  // Debug log
  console.log('[DEBUG][AdminRoute] user:', user, 'isAdmin:', isAdmin, 'loading:', loading, 'authChecked:', authChecked, 'isInitialMount:', isInitialMount.current);
    // Refresh auth status when accessing admin routes to ensure fresh token validation
  useEffect(() => {
    // Track if component is mounted
    let isMounted = true;
    
    async function verifyAuth() {
      // On first render, mark as no longer initial mount
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
      
      // Always do an initial admin check when the component mounts
      console.log('[DEBUG] AdminRoute checking authentication');
      
      if (!user) {
        console.log('[DEBUG] AdminRoute: No user found');
        if (isMounted) setIsVerifying(false);
        return;
      }
      
      // For dev token, immediately set admin status and exit
      const token = localStorage.getItem('token');
      if (token && isDevToken(token) && isDevMode()) {
        console.log('[DEBUG] AdminRoute: Dev token detected, setting admin status');
        // Always mark as admin in dev mode with dev token
        const userWithAdmin = {...user, role: 'Admin', isVerifiedAdmin: true};
        cacheAuthState(userWithAdmin);
        
        // Force set additional flags for development mode
        sessionStorage.setItem('admin_check', JSON.stringify({
          value: true,
          expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours for dev mode
        }));
        sessionStorage.setItem('lastAdminCheck', Date.now().toString());
        
        // No need to verify for dev token
        if (isMounted) setIsVerifying(false);
        return; 
      }
      
      const adminCheckInterval = 10 * 60 * 1000; // 10 minutes
      const lastAdminCheck = sessionStorage.getItem('lastAdminCheck');
      const now = Date.now();
      const timeSinceLastCheck = lastAdminCheck ? (now - parseInt(lastAdminCheck, 10)) : Infinity;
      
      // Check if admin status is cached and recent
      const adminCacheRaw = sessionStorage.getItem('admin_check');
      const hasAdminCache = adminCacheRaw && JSON.parse(adminCacheRaw)?.value === true;
      
      // Skip check if we have a cached admin status that's still valid
      if (hasAdminCache && timeSinceLastCheck < adminCheckInterval) {
        console.log('[DEBUG] AdminRoute: Using cached admin status');
        if (isMounted) setIsVerifying(false); // Ensure we're not stuck in verification state
        return;
      }
      
      // Otherwise perform admin verification
      if (isMounted) setIsVerifying(true);
      console.log('[DEBUG] AdminRoute: Verifying admin status'); 
        
      try {
        // Double check authentication status for admin routes
        await refreshAuthStatus();
        if (user && isAdmin) {
          console.log('[DEBUG] AdminRoute: User confirmed as admin, updating cache');
          // Cache the admin status for future checks
          cacheAuthState({...user, isVerifiedAdmin: true});
        } else {
          console.log('[DEBUG] AdminRoute: User is not admin');
        }
        // Record that we checked
        recordAdminCheck();
      } catch (error) {
        console.error('[DEBUG] AdminRoute: Error verifying admin status', error);
        // Prevent getting stuck due to errors
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    }
    
    verifyAuth();
    
    // Add a safety timeout to prevent eternal verification state
    const safetyTimeout = setTimeout(() => {
      if (isMounted && isVerifying) {
        console.log('[DEBUG] AdminRoute: Safety timeout triggered to prevent eternal verification');
        setIsVerifying(false);
      }
    }, 5000); // 5 seconds max wait time
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [user, refreshAuthStatus, isAdmin]);

  // Add state for tracking verification timeout
  const [verificationTimeout, setVerificationTimeout] = useState(false);

  // Set a timeout to detect when verification is taking too long
  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (isVerifying) {
      // After 8 seconds, show a timeout message
      timeoutId = window.setTimeout(() => {
        setVerificationTimeout(true);
      }, 8000);
    } else {
      setVerificationTimeout(false);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isVerifying]);

  if (loading || isVerifying) {
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Verifying administrator access...</Typography>
        
        {/* Show retry option if verification is taking too long */}
        {verificationTimeout && (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              Verification is taking longer than expected.
            </Typography>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                setVerificationTimeout(false);
                setIsVerifying(false);
                // Force a refresh by updating URL parameters
                window.location.search = `?refresh=${Date.now()}`;
              }}
            >
              Retry Now
            </Button>
          </Box>
        )}
      </Box>
    );
  }  // Wait for authChecked to be true before proceeding (prevents race condition)
  if (!authChecked) {
    console.log('[DEBUG][AdminRoute] Waiting for authentication check to complete');
      // In development mode, log detailed auth state for debugging
    if (isDevMode()) {
      console.log('[DEBUG][AdminRoute] Auth not checked yet, waiting for initialization');
      // Log authentication state
      const token = localStorage.getItem('token');
      const adminCacheRaw = sessionStorage.getItem('admin_check');      console.log('[DEBUG][AdminRoute] Current auth state:', {
        token: token ? 'exists' : 'null',
        isDev: isDevMode(),
        isDevToken: token && isDevToken(token),
        adminCache: adminCacheRaw ? JSON.parse(adminCacheRaw) : null
      });
    }
    
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Waiting for authentication...</Typography>
      </Box>
    );
  }  if (!user) {
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
    
    // Only redirect after the initial mount is complete and authentication is checked
    if (!isInitialMount.current && authChecked) {
      // Save the current URL for redirecting back after login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      console.log('[DEBUG][Redirect][AdminRoute] Redirecting to /login because user is:', user, 'token:', token, 'isAdmin:', isAdmin, 'loading:', loading);
      return <Navigate to="/login" replace />;
    }
    // Show loading instead of redirecting during initial mount
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Verifying authentication status...</Typography>
      </Box>
    );
  }
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
  const [apiHealth, setApiHealth] = useState<boolean | null>(null);
  
  // Check API health on startup
  useEffect(() => {
    // Add flag to track if component is still mounted
    let isMounted = true;

    // Check if health was already verified in this session or the last 30 minutes
    const cachedHealth = sessionStorage.getItem('apiHealthChecked');
    const lastCheck = sessionStorage.getItem('apiHealthLastChecked');
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    if (cachedHealth === 'true' && lastCheck && (now - parseInt(lastCheck)) < thirtyMinutes) {
      console.log('Using cached API health status from the last 30 minutes');
      setApiHealth(true);
      return;
    }
    
    const checkApiHealth = async () => {
      try {
        // Only attempt health check once per session
        await authAPI.healthCheck();
        if (isMounted) {
          setApiHealth(true);
          // Store health check result with timestamp
          sessionStorage.setItem('apiHealthChecked', 'true');
          sessionStorage.setItem('apiHealthLastChecked', now.toString());
          console.log('API is healthy');
        }
      } catch (error) {
        console.error('API Health check failed:', error);
        if (isMounted) {
          // If we're in development mode, fake a successful health check
          if (process.env.NODE_ENV === 'development') {
            console.log('In development mode, proceeding despite health check failure');
            setApiHealth(true);
            sessionStorage.setItem('apiHealthChecked', 'true');
            sessionStorage.setItem('apiHealthLastChecked', now.toString());
          } else {
            setApiHealth(false);
          }
        }
      }
    };
    
    // Only check health once when the component mounts
    checkApiHealth();
    
    // Log environment information to help with debugging
    console.log('Environment:', process.env.NODE_ENV);
    console.log('API URL:', process.env.REACT_APP_API_URL);
    console.log('Google Client ID configured:', !!clientId);
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
    // Don't add clientId to dependency array to avoid repeated checks
  }, []);

  if (!clientId) {
    return (
      <ThemeProvider>
        <CssBaseline />
        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Configuration Error
          </Typography>
          <Typography variant="body1">
            Google Client ID is missing. Please check your environment configuration.
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }
  // Show loading indicator while initial API health check is in progress
  if (apiHealth === null) {
    return (
      <ThemeProvider>
        <CssBaseline />
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LinearProgress sx={{ width: '50%', mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Initializing Question Bank Application
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Please wait while we connect to the server...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (apiHealth === false) {
    return (
      <ThemeProvider>
        <CssBaseline />
        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            API Connection Error
          </Typography>
          <Typography variant="body1" gutterBottom>
            Cannot connect to the API server. Please check that the backend service is running.
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            If you're running in development mode, try restarting the backend server.
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }
  // Setup error logging function for the ErrorBoundary
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('App Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    // Here you could send the error to your monitoring service
    // e.g., Sentry, LogRocket, etc.
  };
  
  return (
    <ErrorBoundary onError={handleError}>
      <GoogleOAuthProvider 
        clientId={clientId}
        onScriptLoadError={() => console.error('Google API script failed to load')}
      >
        <ThemeProvider>
          <CssBaseline />
          <AuthProvider>
            <BrowserRouter>
              {/* Dev mode auth fix button - only appears in development mode */}
              <DevModeAuthFix />
              {/* Auth state guard for navigation - maintains consistent auth state */}
              <NavigationAuthGuard />
              <Routes>
                <Route path="/health" element={<HealthCheck />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mock-test"
                  element={
                    <ProtectedRoute>
                      <MockTestPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/practice-test"
                  element={
                    <ProtectedRoute>
                      <PracticeTestPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/results"
                  element={
                    <ProtectedRoute>
                      <ResultsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/performance-dashboard"
                  element={
                    <ProtectedRoute>
                      <PerformanceDashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Admin Routes */}
                <Route
                  path="/questions"
                  element={
                    <AdminRoute>
                      <QuestionManagement />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/papers"
                  element={
                    <AdminRoute>
                      <PaperManagement />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/manage/users"
                  element={
                    <AdminRoute>
                      <UserManagement />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/performance-dashboard"
                  element={
                    <AdminRoute>
                      <PerformanceDashboard />
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
};

export default App;
