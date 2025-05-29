import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Log environment variables (excluding sensitive data)
    console.log('API URL:', process.env.REACT_APP_API_URL);
    console.log('Google Client ID configured:', !!process.env.REACT_APP_GOOGLE_CLIENT_ID);
  }, []);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Google login response received:', {
        hasCredential: !!credentialResponse.credential,
        selectBy: credentialResponse.select_by,
      });

      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      // Log the API call (without exposing the token)
      console.log('Attempting to login with backend...');
      await login({ token: credentialResponse.credential });
      console.log('Login successful, navigating to home...');
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.response?.data?.detail || err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    console.error('Google sign-in failed');
    setError('Google sign-in failed. Please try again.');
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
            <Typography color="error" sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
              {error || authError}
            </Typography>
          )}

          <Box sx={{ mt: 3, position: 'relative' }}>
            {loading ? (
              <CircularProgress size={40} />
            ) : (
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                useOneTap
                theme="filled_blue"
                size="large"
                shape="rectangular"
                auto_select={false}
              />
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
