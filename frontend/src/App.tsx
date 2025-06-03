import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, LinearProgress, Typography } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { MockTestPage } from './pages/MockTestPage';
import { PracticeTestPage } from './pages/PracticeTestPage';
import { ResultsPage } from './pages/ResultsPage';
import { QuestionManagement } from './pages/QuestionManagement';
import { UserManagement } from './pages/UserManagement';
import HealthCheck from './pages/HealthCheck';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevModeAuthFix } from './components/DevModeAuthFix';
import { authAPI } from './services/api';
import { shouldReauthenticate, timeSinceLastAuthCheck, recordAuthCheck, recordAdminCheck } from './utils/authOptimization';
import { isAuthenticatedFromCache, cacheAuthState } from './utils/authCache';
import { isDevToken, isDevMode } from './utils/devMode';

// Create theme with better accessibility and consistent styling
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#4791db',
      dark: '#115293',
    },
    secondary: {
      main: '#dc004e',
      light: '#e33371',
      dark: '#9a0036',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none', // Don't uppercase button text
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, refreshAuthStatus } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Check token validity when accessing protected routes
  useEffect(() => {
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
  }

  if (!user) {
    // Save the current URL for redirecting back after login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, refreshAuthStatus } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Refresh auth status when accessing admin routes to ensure fresh token validation
  useEffect(() => {
    // Track if component is mounted
    let isMounted = true;
    
    async function verifyAuth() {
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
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    }
    
    verifyAuth();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, refreshAuthStatus, isAdmin]);

  if (loading || isVerifying) {
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Verifying administrator access...</Typography>
      </Box>
    );
  }

  if (!user) {
    // Save the current URL for redirecting back after login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
  const [apiHealth, setApiHealth] = useState<boolean | null>(null);
  
  // Import NavigationAuthGuard
  const NavigationAuthGuard = React.lazy(() => import('./components/NavigationAuthGuard').then(
    module => ({ default: module.NavigationAuthGuard })
  ));
  
  // Check API health on startup
  useEffect(() => {
    // Add flag to track if component is still mounted
    let isMounted = true;

    // Check if health was already verified in this session or the last 10 minutes
    const cachedHealth = sessionStorage.getItem('apiHealthChecked');
    const lastCheck = sessionStorage.getItem('apiHealthLastChecked');
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    if (cachedHealth === 'true' && lastCheck && (now - parseInt(lastCheck)) < tenMinutes) {
      console.log('Using cached API health status from the last 10 minutes');
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
      <ThemeProvider theme={theme}>
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LinearProgress sx={{ width: '50%', mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Initializing CIL CBT Application
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
      <ThemeProvider theme={theme}>
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
        <ThemeProvider theme={theme}>
          <CssBaseline />          <AuthProvider>
            <BrowserRouter>
              {/* Dev mode auth fix button - only appears in development mode */}
              <DevModeAuthFix />
              {/* Auth state guard for navigation - maintains consistent auth state */}
              <React.Suspense fallback={null}>
                <NavigationAuthGuard />
              </React.Suspense>
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
                {/* Admin Routes */}
                <Route
                  path="/manage/questions"
                  element={
                    <AdminRoute>
                      <QuestionManagement />
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
