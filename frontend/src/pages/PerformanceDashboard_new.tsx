import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import ConstructionIcon from '@mui/icons-material/Construction';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

/**
 * Performance Dashboard component - Modern implementation under construction
 * 
 * @returns React component
 */
export const PerformanceDashboard: React.FC = () => {
  const { user } = useAuth();

  // Show authentication check while user loads
  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  // Show construction message
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 4,
        textAlign: 'center',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 6,
          maxWidth: 600,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <ConstructionIcon sx={{ fontSize: 64, color: 'warning.main' }} />
        
        <Typography variant="h4" gutterBottom>
          Performance Dashboard
        </Typography>
        
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Under Construction
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          We're rebuilding the Performance Dashboard with a modern, maintainable architecture.
          This will provide better performance, improved user experience, and enhanced data visualizations.
        </Typography>
        
        <Alert severity="info" sx={{ width: '100%' }}>
          <Typography variant="body2">
            The new dashboard will feature:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>Enhanced performance metrics and analytics</li>
            <li>Interactive charts and visualizations</li>
            <li>Responsive design for all devices</li>
            <li>Real-time data updates</li>
          </Box>
        </Alert>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="body2" color="text.secondary">
            Thank you for your patience while we improve your experience
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
