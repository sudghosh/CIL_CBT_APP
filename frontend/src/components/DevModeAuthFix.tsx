/**
 * Developer Mode Authentication Fix Button
 * This component will only appear in development mode and provides
 * a way to fix authentication issues with a single click
 */

import React, { useEffect } from 'react';
import { Button, Box, Typography } from '@mui/material';
import { forceDevModeAdmin, fixSessionState } from '../utils/fixAuthIssues';
import { isDevMode } from '../utils/devMode';

export const DevModeAuthFix: React.FC = () => {
  // Only render in development mode
  if (!isDevMode()) {
    return null;
  }
  
  // Clean up any event listeners when component unmounts
  useEffect(() => {
    return () => {
      // Nothing to clean up for now, but this is a good practice
      // to have in place if we need it in the future
    };
  }, []);
    const handleFixAuth = () => {
    // Clear any existing session data first
    fixSessionState();
    
    // Force admin authentication
    forceDevModeAdmin();
    
    // Verify changes were applied successfully
    const token = localStorage.getItem('token');
    const adminCheck = sessionStorage.getItem('admin_check');
    
    // Show appropriate message
    if (token && adminCheck) {
      alert('Authentication fixed! You should now have admin access.\nIf not, try refreshing the page.');
    } else {
      alert('Error applying authentication fix.\nPlease check console for more details.');
      console.error('Auth fix failed - token or admin check missing:', { token, adminCheck });
    }
    
    // Show testing advice
    console.log('----------');
    console.log('TIP: If you still have issues, try these steps:');
    console.log('1. Open browser console (F12)');
    console.log('2. Run: window.devTools.resetAuth()');
    console.log('3. Refresh the page and try again');
    console.log('----------');
  };
    // Check current authentication status
  const token = localStorage.getItem('token');
  const adminCheck = sessionStorage.getItem('admin_check');
  const isAuthenticated = !!token;
  const isAdminCached = !!adminCheck;
  
  return (
    <Box 
      position="fixed" 
      bottom={16} 
      right={16} 
      zIndex={9999}
      bgcolor="rgba(0,0,0,0.6)"
      color="white"
      p={2}
      borderRadius={2}
      boxShadow={3}
    >
      <Typography variant="body2" gutterBottom>
        Development Mode
      </Typography>
      <Box sx={{ mb: 1, fontSize: '0.75rem', opacity: 0.8 }}>
        Status: {isAuthenticated ? (isAdminCached ? '✅ Admin' : '⚠️ User') : '❌ Not logged in'}
      </Box>
      <Button 
        variant="contained" 
        color="secondary" 
        size="small"
        onClick={handleFixAuth}
        fullWidth
      >
        Fix Admin Auth
      </Button>
    </Box>
  );
};
