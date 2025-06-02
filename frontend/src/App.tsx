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
import { authAPI } from './services/api';

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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Loading your profile...</Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography variant="body1">Loading your profile...</Typography>
      </Box>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
  const [apiHealth, setApiHealth] = useState<boolean | null>(null);

  // Check API health on startup
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await authAPI.healthCheck();
        setApiHealth(true);
        console.log('API is healthy');
      } catch (error) {
        console.error('API Health check failed:', error);
        setApiHealth(false);
      }
    };
    
    checkApiHealth();
    
    // Log environment information to help with debugging
    console.log('Environment:', process.env.NODE_ENV);
    console.log('API URL:', process.env.REACT_APP_API_URL);
    console.log('Google Client ID configured:', !!clientId);
  }, [clientId]);

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

  if (apiHealth === false) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            API Connection Error
          </Typography>
          <Typography variant="body1">
            Cannot connect to the API server. Please check that the backend service is running.
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
          <CssBaseline />
          <AuthProvider>
            <BrowserRouter>
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
