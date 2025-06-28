import React from 'react';
import { Alert, Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

interface ChartRestrictedAccessProps {
  /**
   * Message explaining the restriction
   */
  message: string;
  
  /**
   * Content to display as a fallback
   */
  fallbackContent?: React.ReactNode;
  
  /**
   * Optional callback for contact/request access button
   */
  onRequestAccess?: () => void;
  
  /**
   * Optional feature name
   */
  featureName?: string;
  
  /**
   * Is this feature available with a premium upgrade
   */
  upgradable?: boolean;
  
  /**
   * Optional callback for upgrade button
   */
  onUpgradeClick?: () => void;
}

/**
 * Enhanced component for displaying restricted access messages specifically for chart components
 */
const ChartRestrictedAccess: React.FC<ChartRestrictedAccessProps> = ({
  message,
  fallbackContent,
  onRequestAccess,
  featureName = 'this feature',
  upgradable = false,
  onUpgradeClick
}) => {
  return (
    <>
      <Alert 
        severity="info" 
        sx={{ mb: 2 }}
        icon={<LockIcon />}
        action={
          <>
            {onRequestAccess && (
              <Button color="inherit" size="small" onClick={onRequestAccess} sx={{ mr: 1 }}>
                Request Access
              </Button>
            )}
            {upgradable && onUpgradeClick && (
              <Button color="primary" size="small" onClick={onUpgradeClick} variant="contained">
                Upgrade
              </Button>
            )}
          </>
        }
      >
        <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
          Feature Restricted
        </Typography>
        <Typography variant="body2">
          {message}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            This visualization of {featureName} requires special permissions. You can continue using other dashboard features that are available to you.
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

export { ChartRestrictedAccess };
export default ChartRestrictedAccess;
