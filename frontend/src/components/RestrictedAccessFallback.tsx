import React from 'react';
import { Alert, Box, Typography } from '@mui/material';

interface RestrictedAccessFallbackProps {
  message: string;
  fallbackContent?: React.ReactNode;
}

/**
 * Displays a helpful message and fallback content when access to personalized data is restricted
 */
const RestrictedAccessFallback: React.FC<RestrictedAccessFallbackProps> = ({ message, fallbackContent }) => {
  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        {message}
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2">
            This feature requires special permissions. You can continue using other features of the dashboard that are available to you.
          </Typography>
        </Box>
      </Alert>
      {fallbackContent && (
        <Box sx={{ mt: 2 }}>
          {fallbackContent}
        </Box>
      )}
    </>
  );
};

export default RestrictedAccessFallback;
