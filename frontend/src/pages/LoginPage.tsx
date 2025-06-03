import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, CircularProgress, Button, Divider, Alert } from '@mui/material';
import { GoogleLogin, CredentialResponse, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { logError } from '../utils/errorHandler';
import { DEV_TOKEN, isDevMode } from '../utils/devMode';
import { cacheAuthState } from '../utils/authCache';

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
      // Check if we already have a token - avoid duplicate login attempts
      const existingToken = localStorage.getItem('token');
      if (existingToken === DEV_TOKEN) {
        console.log('Already logged in with development token');
        
        // Still navigate to appropriate page
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          console.log(`Redirecting to saved URL: ${redirectUrl}`);
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectUrl);
        } else {
          console.log('Redirecting to home page');
          navigate('/');
        }
        
        return;
      }      setLoading(true);
      setError(null);
      console.log('Attempting development login bypass...');
      
      // Try to fetch a token from the backend's development endpoint
      try {
        // First attempt to use the backend's dev login endpoint with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/dev-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Development login succeeded via backend endpoint');
          localStorage.setItem('token', data.access_token);
          console.log('[DEBUG] Dev token set in localStorage (backend):', localStorage.getItem('token'));
          await login({ token: data.access_token });
          
          // Redirect after successful login
          const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
          if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
            navigate(redirectUrl);
          } else {
            navigate('/');
          }
        } else {
          throw new Error(`Backend dev login failed with status: ${response.status}`);
        }
      } catch (err) {
        console.warn('Backend dev login failed, using client-side dev token');
        try {
          localStorage.setItem('token', DEV_TOKEN);
          console.log('[DEBUG] Dev token set in localStorage (client):', localStorage.getItem('token'));
          
          // Cache auth state before login to prevent immediate re-verification
          sessionStorage.setItem('lastAuthCheck', Date.now().toString());
          sessionStorage.setItem('lastAdminCheck', Date.now().toString());
          
          // Import cacheAuthState and mark the user as an admin in the cache
          const mockUser = {
            user_id: 1,
            email: 'dev@example.com',
            first_name: 'Development',
            last_name: 'User',
            role: 'Admin',
            is_active: true,
            isVerifiedAdmin: true
          };
          
          // Cache auth state explicitly for development mode
          if (typeof window !== 'undefined') {
            // Store in session storage with long expiry
            const item = {
              value: true,
              expires: Date.now() + (30 * 60 * 1000) // 30 minutes
            };
            sessionStorage.setItem('auth_cache', JSON.stringify(item));
            sessionStorage.setItem('admin_check', JSON.stringify(item));
            sessionStorage.setItem('user_cache', JSON.stringify({
              value: mockUser,
              expires: Date.now() + (30 * 60 * 1000)
            }));
          }
          
          // Use the login function to set up auth context properly
          await login({ token: DEV_TOKEN });
          // After login, check if token is still present
          if (localStorage.getItem('token') !== DEV_TOKEN) {
            console.warn('[DEBUG] Dev token missing from localStorage after login!');
          }
          console.log('Development login completed with client-side token');
          
          // Redirect appropriately
          const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
          if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
            navigate(redirectUrl);
          } else {
            navigate('/');
          }
        } catch (clientErr) {
          console.error('Client-side dev login failed:', clientErr);
          throw clientErr; // Propagate the error to the outer catch
        }
      }    } catch (err: any) {
      console.error('Development login failed completely:', err);
      setError('Development login failed. Please try again or check console for errors.');
    } finally {
      setLoading(false);
    }
  };
  
  // Auto-login in development mode - comment this out if you want to see the login page
  useEffect(() => {
    // Only execute once when component mounts to prevent flickering
    const token = localStorage.getItem('token');
    const hasLoggedIn = token === DEV_TOKEN || (token && token.length > 0);
    const hasAttemptedAutoLogin = sessionStorage.getItem('devLoginAttempted') === 'true';
    
    if (isDevMode() && !hasLoggedIn && !hasAttemptedAutoLogin && !loading) {
      // Skip auto-login if query param is set
      const params = new URLSearchParams(window.location.search);      const skipAutoLogin = params.get('noautologin') === 'true';      if (!skipAutoLogin) {
        console.log('Auto-logging in with development account...');
        // Clear any previous auth-related session storage to avoid conflicts
        sessionStorage.removeItem('authError');
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Reset any stored auth check timestamps to force fresh checks
        sessionStorage.removeItem('lastAuthCheck');
        sessionStorage.removeItem('lastAdminCheck');
        sessionStorage.removeItem('auth_cache');
        sessionStorage.removeItem('user_cache');
        sessionStorage.removeItem('admin_check');
        
        // Mark that we've attempted auto-login to prevent duplicate attempts
        sessionStorage.setItem('devLoginAttempted', 'true');
        
        // Add a small delay to ensure all components are mounted
        const timer = setTimeout(() => {
          handleDevLogin();
        }, 500);
        
        return () => {
          clearTimeout(timer);
          // This ensures we can try again if the user logs out and comes back
          // Only reset if we're actually navigating away, not on component updates
          if (window.location.pathname !== '/login') {
            sessionStorage.removeItem('devLoginAttempted');
          }
        };
      }
    }
    
    // Return empty cleanup function for cases where no timer was set
    return () => {};
  }, []);  const handleSuccess = async (credentialResponse: CredentialResponse) => {
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
