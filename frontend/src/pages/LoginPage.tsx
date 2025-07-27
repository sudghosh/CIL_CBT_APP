import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, CircularProgress, Button, Divider, Alert } from '@mui/material';
import OpenStaxLogo from '../assets/OpenStaxLogo.svg';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { logError } from '../utils/errorHandler';
import { isDevMode } from '../utils/devMode';

/// <reference types="react-scripts" />
 export const LoginPage: React.FC = (): React.ReactElement => {
  // Google login success handler
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
    <Box sx={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: {
        xs: '#f0f8ff',
        sm: 'linear-gradient(180deg, #f8fafc 0%, #f0f4f8 100%)',
      },
      transition: 'background 0.3s',
      p: { xs: 'env(safe-area-inset-top) 0 0 0', sm: 2 },
    }}>
      <Paper
        elevation={8}
        sx={{
          p: { xs: 4, sm: 4 },
          borderRadius: { xs: 16, sm: 5 },
          boxShadow: {
            xs: '0 8px 32px rgba(25, 118, 210, 0.15)',
            sm: '0 8px 32px rgba(25, 118, 210, 0.10)'
          },
          width: { xs: '92%', sm: 400 },
          maxWidth: { xs: 400, sm: 400 },
          minHeight: { xs: '90vh', sm: 'auto' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'rgba(255,255,255,0.98)',
        }}
      >
        {/* Enhanced mobile branding */}
        <Box sx={{
          mb: { xs: 4, sm: 2 },
          mt: { xs: 2, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img
              src={OpenStaxLogo}
              alt="OpenStax Logo"
              style={{
                width: '100px',
                height: '100px',
                margin: '0 auto',
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
              }}
            />
          </Box>
          <Typography
            component="h1"
            variant="h4"
            fontWeight={700}
            color="primary"
            gutterBottom
            sx={{
              textAlign: 'center',
              letterSpacing: 1,
              fontSize: { xs: '2.5rem', sm: '2.125rem' }
            }}
          >
            CBT Application
          </Typography>
        </Box>

        {/* Enhanced mobile subtitle */}
        <Typography
          variant="subtitle1"
          color="textSecondary"
          gutterBottom
          sx={{
            textAlign: 'center',
            fontSize: { xs: '1.25rem', sm: '1.15rem' },
            mb: { xs: 6, sm: 2 },
            maxWidth: '80%',
            lineHeight: 1.5
          }}
        >
          Sign in with your Google account to continue
        </Typography>

        {/* Error alerts with mobile-friendly styling */}
        {(error || authError) && (
          <Alert
            severity="error"
            sx={{
              mt: 2,
              mb: 4,
              width: '100%',
              borderRadius: 8,
              py: 2
            }}
            onClose={() => setError(null)}
          >
            {error || authError}
          </Alert>
        )}

        {googleLoadError && (
          <Alert
            severity="warning"
            sx={{
              mt: 2,
              mb: 4,
              width: '100%',
              borderRadius: 8,
              py: 2
            }}
          >
            There was a problem loading Google authentication. Please make sure you have an internet connection and cookies are enabled.
          </Alert>
        )}

        {/* Enhanced Google login button container */}
        <Box sx={{
          mt: { xs: 6, sm: 2 },
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 4, sm: 2 },
          px: { xs: 1, sm: 0 }
        }}>
          {loading ? (
            <CircularProgress
              size={64}
              sx={{
                my: 6,
                color: 'primary.main',
                thickness: 4
              }}
            />
          ) : (
            <>
              {clientId ? (
                <Box sx={{
                  width: '100%',
                  minHeight: { xs: 64, sm: 56 },
                  borderRadius: { xs: 12, sm: 2 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(66,133,244,0.2)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.01)',
                    boxShadow: '0 6px 16px rgba(66,133,244,0.25)'
                  }
                }}>
                  <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                    useOneTap={false}
                    theme="filled_blue"
                    size="large"
                    type="standard"
                    shape="rectangular"
                    width="100%"
                    text="signin_with"
                    logo_alignment="left"
                  />
                </Box>
              ) : (
                <Alert severity="error" sx={{ mb: 3, width: '100%', borderRadius: 8 }}>
                  Google Client ID is missing. Please check your configuration.
                </Alert>
              )}

              {/* Development login button with mobile styling */}
              {isDevMode() && (
                <>
                  <Divider
                    sx={{
                      width: '100%',
                      mt: 4,
                      mb: 4,
                      '&::before, &::after': {
                        borderColor: 'rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{
                        px: 2,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        letterSpacing: 1,
                        textTransform: 'uppercase'
                      }}
                    >
                      OR
                    </Typography>
                  </Divider>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleDevLogin}
                    sx={{
                      width: '100%',
                      borderRadius: 12,
                      py: { xs: 2, sm: 1.5 },
                      fontWeight: 700,
                      fontSize: { xs: '1.1rem', sm: '1rem' },
                      boxShadow: '0 4px 12px rgba(25,118,210,0.2)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(25,118,210,0.25)'
                      }
                    }}
                  >
                    Development Login (Bypass Google)
                  </Button>
                </>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};