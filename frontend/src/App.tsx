import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box, LinearProgress, Typography, Button } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { authAPI } from './services/api';
import { isDevMode, isDevToken } from './utils/devMode';
import { cacheAuthState } from './utils/authCache';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { MockTestPage } from './pages/MockTestPage';
import { PracticeTestPage } from './pages/PracticeTestPage';
import { ResultsPage } from './pages/ResultsPage';
import { QuestionManagement } from './pages/QuestionManagement';
import { PaperManagement } from './pages/PaperManagement';
import { UserManagement } from './pages/UserManagement';
import { PerformanceDashboard } from './pages/PerformanceDashboard/';
import HealthCheck from './pages/HealthCheck';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevModeAuthFix } from './components/DevModeAuthFix';
import { NavigationAuthGuard } from './components/NavigationAuthGuard';

// Theme is now managed by ThemeContext

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, authChecked } = useAuth();
  
  console.log('[DEBUG][ProtectedRoute] user:', user, 'loading:', loading, 'authChecked:', authChecked);

  // Show loading while auth state is being determined
  if (loading || !authChecked) {
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Checking authentication...</Typography>
      </Box>
    );
  }

  // If no user is authenticated, redirect to login
  if (!user) {
    console.log('[DEBUG][ProtectedRoute] No user authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render protected content
  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin, authChecked } = useAuth();

  console.log('[DEBUG][AdminRoute] user:', user, 'isAdmin:', isAdmin, 'loading:', loading, 'authChecked:', authChecked);

  // Show loading while auth state is being determined
  if (loading || !authChecked) {
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Checking authentication...</Typography>
      </Box>
    );
  }

  // If no user is authenticated, redirect to login
  if (!user) {
    console.log('[DEBUG][AdminRoute] No user authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If user is not admin, redirect to home
  if (!isAdmin) {
    console.log('[DEBUG][AdminRoute] User is not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // User is authenticated and is admin, render protected content
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
