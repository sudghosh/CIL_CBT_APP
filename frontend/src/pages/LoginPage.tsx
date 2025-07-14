import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Typography, Paper, CircularProgress, Button, Divider, Alert } from '@mui/material';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { logError } from '../utils/errorHandler';
import { isDevMode } from '../utils/devMode';

export const LoginPage: React.FC = (): JSX.Element => {
  const { login, developmentLogin, error: authError, clearError } = useAuth();
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
  
  // Development login handler
  const handleDevLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting development login...');
      
      // Use the new development login function from context
      await developmentLogin();
      
      console.log('Development login successful');
      
      // Redirect after successful login
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectUrl);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Development login failed:', err);
      setError(err.message || 'Development login failed');
    } finally {
      setLoading(false);
    }
  }, [developmentLogin, navigate]);
  
  // Remove auto-login - users must explicitly choose login method

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Google login response received');

      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      // Add retry logic for login
      let loginSuccess = false;
      let loginAttempts = 0;
      const maxAttempts = 2;
      let lastError: any = null;
      
      while (!loginSuccess && loginAttempts < maxAttempts) {
        try {
          loginAttempts++;
          console.log(`Google login attempt ${loginAttempts} of ${maxAttempts}`);
          
          // Time the login process for debugging
          const startTime = performance.now();
          await login({ token: credentialResponse.credential });
          const endTime = performance.now();
          console.log(`Login completed in ${(endTime - startTime).toFixed(0)}ms`);
          
          loginSuccess = true;
        } catch (err: any) {
          lastError = err;
          console.error(`Login attempt ${loginAttempts} failed:`, err);
          
          // Check if we should retry
          if (loginAttempts < maxAttempts) {
            console.log(`Retrying login in 1 second...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If all attempts failed, throw the last error
      if (!loginSuccess) {
        throw lastError || new Error('All login attempts failed');
      }
      
      // Check if we need to redirect to a specific page after login
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectUrl);
      } else {
        // Default redirect to home
        navigate('/');
      }
      
      // Display any stored auth error messages
      const authErrorMsg = sessionStorage.getItem('authError');
      if (authErrorMsg) {
        sessionStorage.removeItem('authError');
        // Use a setTimeout to ensure the error appears after navigation
        setTimeout(() => {
          setError(authErrorMsg);
        }, 100);
      }
    } catch (err: any) {
      logError(err, { context: 'Google login success handler' });
      
      // Provide more helpful error messages based on error type
      let errorMessage = err.response?.data?.detail || err.message || 'Failed to login';
      
      if (err.message && err.message.includes('timeout')) {
        errorMessage = 'Login request timed out. Please check your connection and try again.';
      }
      
      if (err.response?.status === 401) {
        errorMessage = 'Your email is not authorized for this application. Please contact an administrator.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    console.error('Google sign-in failed');
    
    // Check if this is a FedCM-related error
    const isFedCMError = window.location.href.includes('localhost') && 
                        navigator.userAgent.includes('Chrome');
    
    if (isFedCMError) {
      setError('Google sign-in is restricted by browser policy. If you see this error, try: 1) Clicking "Development Login" below, or 2) Enabling third-party cookies in Chrome settings, or 3) Using a different browser.');
    } else {
      setError('Google sign-in failed. Please try again.');
    }
    setGoogleLoadError(true);
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
                    useOneTap={false}
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
