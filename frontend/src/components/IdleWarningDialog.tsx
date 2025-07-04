import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';

interface IdleWarningDialogProps {
  open: boolean;
  timeUntilLogout: number; // in milliseconds
  onExtendSession: () => void;
  onLogout: () => void;
  onClose?: () => void;
  autoLogoutEnabled?: boolean;
}

export const IdleWarningDialog: React.FC<IdleWarningDialogProps> = ({
  open,
  timeUntilLogout,
  onExtendSession,
  onLogout,
  onClose,
  autoLogoutEnabled = true,
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(timeUntilLogout / 1000));

  // Update countdown every second
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      const newCountdown = Math.ceil(timeUntilLogout / 1000);
      setCountdown(newCountdown);

      // Auto logout when countdown reaches 0
      if (newCountdown <= 0 && autoLogoutEnabled) {
        onLogout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, timeUntilLogout, onLogout, autoLogoutEnabled]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  // Calculate progress percentage
  const progressPercentage = Math.max(0, Math.min(100, (countdown / (5 * 60)) * 100)); // Assuming 5 minute warning

  // Determine severity
  const getSeverity = () => {
    if (countdown <= 30) return 'error';
    if (countdown <= 60) return 'warning';
    return 'info';
  };

  const handleExtendSession = () => {
    onExtendSession();
    onClose?.();
  };

  const handleLogout = () => {
    onLogout();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={countdown <= 30} // Prevent accidental close when critical
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-description"
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
          boxShadow: (theme) => theme.shadows[20],
        },
      }}
    >
      <DialogTitle
        id="idle-warning-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
        }}
      >
        <WarningIcon color={getSeverity()} />
        <Typography variant="h6" component="span">
          Session Timeout Warning
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Chip
            label={formatTime(countdown)}
            color={getSeverity()}
            variant="filled"
            size="small"
            sx={{ fontWeight: 'bold', minWidth: 60 }}
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity={getSeverity()} sx={{ mb: 2 }}>
            <Typography variant="body2">
              You've been inactive for a while. Your session will automatically 
              {autoLogoutEnabled ? ' expire' : ' end'} soon for security reasons.
            </Typography>
          </Alert>

          <Typography variant="body1" gutterBottom>
            {countdown > 60 
              ? `Your session will timeout in ${formatTime(countdown)} due to inactivity.`
              : `Your session will timeout in ${formatTime(countdown)}!`
            }
          </Typography>

          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Time remaining:
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              color={getSeverity()}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "Stay Logged In" to continue your session, or "Logout" to securely sign out.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={handleLogout}
          color="secondary"
          variant="outlined"
          startIcon={<LogoutIcon />}
          sx={{ minWidth: 120 }}
        >
          Logout Now
        </Button>
        <Button
          onClick={handleExtendSession}
          color="primary"
          variant="contained"
          startIcon={<RefreshIcon />}
          sx={{ minWidth: 120 }}
          autoFocus
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IdleWarningDialog;
