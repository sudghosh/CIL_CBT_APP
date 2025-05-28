import React from 'react';
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const handleSuccess = async (credentialResponse: any) => {
    try {
      console.log('Google login response:', credentialResponse);
      await login({ token: credentialResponse.credential });
      navigate('/');
    } catch (err: any) {
      console.error('Login failed:', err);
      setLoginError(err.response?.data?.detail || 'Failed to login');
    }
  };

  const handleError = () => {
    setLoginError('Google login failed. Please try again.');
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

          {(error || loginError) && (
            <Typography color="error" sx={{ mt: 2, mb: 2 }}>
              {error || loginError}
            </Typography>
          )}

          {loading ? (
            <CircularProgress sx={{ mt: 3 }} />
          ) : (
            <Box sx={{ mt: 3 }}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                useOneTap
                theme="filled_black"
                size="large"
                type="standard"
                shape="rectangular"
                locale="en"
              />
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};
