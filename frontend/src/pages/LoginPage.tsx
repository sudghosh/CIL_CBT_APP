import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, CircularProgress, Button, Divider, Alert } from '@mui/material';
import { GoogleLogin, CredentialResponse, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { logError } from '../utils/errorHandler';

export const LoginPage: React.FC = (): JSX.Element => {
  const { login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoadError, setGoogleLoadError] = useState<boolean>(false);

  // Get client ID from environment
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // Clear errors when component mounts or location changes
  useEffect(() => {
    setError(null);
    if (clearError) clearError();
  }, [location, clearError]);

  // Check for session expired param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('session_expired') === 'true') {
      setError('Your session has expired. Please log in again.');
    }
  }, [location]);

  // Development bypass login
  const handleDevLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create a mock token for development
      const mockToken = 'dev-token-for-testing';
      
      try {
        await login({ token: mockToken });
        navigate('/');
      } catch (err) {
        console.error('Development login failed, trying direct navigation');
        // Force navigation even if login fails in development
        localStorage.setItem('token', 'dev-token-for-testing');
        navigate('/');
        window.location.reload();
      }
    } catch (err: any) {
      setError('Development login failed');
    } finally {
      setLoading(false);
    }
  };

  // Auto-login in development mode - comment this out if you want to see the login page
  useEffect(() => {
    const isDevMode = process.env.NODE_ENV === 'development';
    const urlParams = new URLSearchParams(window.location.search);
    const skipAutoLogin = urlParams.get('noautologin') === 'true';
    
    if (isDevMode && !skipAutoLogin) {
      console.log('Auto-logging in with development account...');
      handleDevLogin();
    }
  }, []);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Google login response received');

      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      await login({ token: credentialResponse.credential });
      navigate('/');
    } catch (err: any) {
      logError(err, { context: 'Google login success handler' });
      setError(err.response?.data?.detail || err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    setError('Google sign-in failed. Please try again.');
    setGoogleLoadError(true);
    console.error('Google sign-in failed');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            CIL CBT Application
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Please sign in with your Google account
          </Typography>

          {(error || authError) && (
            <Alert 
              severity="error" 
              sx={{ mt: 2, mb: 2, width: '100%' }}
              onClose={() => setError(null)}
            >
              {error || authError}
            </Alert>
          )}

          {googleLoadError && (
            <Alert 
              severity="warning" 
              sx={{ mt: 2, mb: 2, width: '100%' }}
            >
              There was a problem loading Google authentication. Please make sure you have an internet connection and cookies are enabled.
            </Alert>
          )}

          <Box sx={{ mt: 3, position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {loading ? (
              <CircularProgress size={40} />
            ) : (
              <>
                {clientId ? (
                  <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                    useOneTap
                    theme="filled_blue"
                    size="large" 
                    type="standard"
                    shape="rectangular"
                    width="300px"
                    context="signin"
                    text="signin_with"
                    logo_alignment="left"
                  />
                ) : (
                  <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
                    Google Client ID is missing. Please check your configuration.
                  </Alert>
                )}
                
                <Divider sx={{ width: '100%', mt: 3, mb: 3 }}>
                  <Typography variant="caption" color="textSecondary">OR</Typography>
                </Divider>
                
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={handleDevLogin}
                  sx={{ width: '300px' }}
                >
                  Development Login (Bypass Google)
                </Button>
              </>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
