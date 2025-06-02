import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { authAPI } from '../services/api';

const HealthCheck: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Checking API connection...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await authAPI.healthCheck();
        setApiStatus('healthy');
        setMessage('API is connected and healthy');
      } catch (error) {
        console.error('Health check error:', error);
        setApiStatus('error');
        setMessage('Failed to connect to the API server');
      }
    };

    checkHealth();
  }, []);

  // Simple response for automated health checks
  if (window.navigator.userAgent.includes('curl') || 
      window.navigator.userAgent.includes('wget') ||
      window.location.search.includes('plain=true')) {
    return <div>OK</div>;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100vh',
      p: 2
    }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          CIL CBT Application Health
        </Typography>
        
        {apiStatus === 'loading' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography>{message}</Typography>
          </Box>
        )}
        
        {apiStatus === 'healthy' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" color="success.main" sx={{ fontWeight: 'bold' }}>
              {message}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Frontend application is also running correctly.
            </Typography>
          </Box>
        )}
        
        {apiStatus === 'error' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>
              {message}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Frontend application is running, but cannot connect to the backend service.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default HealthCheck;
