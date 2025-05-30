import React from 'react';
import { Alert, AlertProps, Snackbar } from '@mui/material';

interface ErrorAlertProps extends Omit<AlertProps, 'onClose'> {
  error: string | null;
  onClose: () => void;
  autoHideDuration?: number;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onClose,
  autoHideDuration = 6000,
  ...alertProps
}) => {
  if (!error) return null;

  return (
    <Snackbar
      open={!!error}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        onClose={onClose} 
        severity="error" 
        variant="filled"
        {...alertProps}
      >
        {error}
      </Alert>
    </Snackbar>
  );
};
