import React, { useState } from 'react';
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = (): JSX.Element => {
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Google login response:', credentialResponse);

      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      await login({ token: credentialResponse.credential });
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    setError('Google sign-in failed. Please try again.');
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
                type="standard"
                shape="rectangular"
                width="300px"
              />
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
