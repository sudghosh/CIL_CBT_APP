import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';
import { useSessionManager, SessionState } from '../hooks/useSessionManager';
import { IdleWarningDialog } from '../components/IdleWarningDialog';

interface SessionContextType {
  sessionState: SessionState;
  extendSession: () => void;
  refreshToken: () => Promise<boolean>;
  getSessionStatus: () => 'active' | 'idle' | 'warning' | 'expired';
  markActivity: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
  config?: {
    activityDebounceMs?: number;
    refreshIntervalMs?: number;
    idleWarningTimeoutMs?: number;
    logoutTimeoutMs?: number;
    enableActivityTracking?: boolean;
    enableTokenRefresh?: boolean;
    enableIdleWarning?: boolean;
    enableAutoLogout?: boolean;
  };
  onSessionTimeout?: () => void;
  enableSessionManagement?: boolean;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
  children,
  config = {},
  onSessionTimeout,
  enableSessionManagement = true,
}) => {
  const navigate = useNavigate();
  const [showTokenRefreshSuccess, setShowTokenRefreshSuccess] = useState(false);
  const [showTokenRefreshError, setShowTokenRefreshError] = useState(false);
  
  // Refs to track timeout callbacks for cleanup
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear notification timeouts
  const clearNotificationTimeouts = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  };

  // Handle session timeout
  const handleSessionTimeout = () => {
    console.log('[SessionProvider] Session timeout - cleaning up and redirecting to login');
    
    // Clear all session-related timers and state
    cleanupSession();
    
    // Clear notification timeouts
    clearNotificationTimeouts();
    
    // Reset notification states
    setShowTokenRefreshSuccess(false);
    setShowTokenRefreshError(false);
    
    // Clear tokens
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    
    // Clear any cached user data
    localStorage.removeItem('user');
    localStorage.removeItem('userCache');
    
    // Call custom timeout handler if provided
    onSessionTimeout?.();
    
    // Navigate to login page
    navigate('/login');
  };

  // Handle idle warning
  const handleIdleWarning = () => {
    console.log('[SessionProvider] User idle warning triggered');
  };

  // Session manager hook
  const {
    sessionState,
    extendSession,
    dismissIdleWarning,
    refreshToken,
    getSessionStatus,
    markActivity,
    cleanupSession,
  } = useSessionManager(
    {
      // Default configuration optimized for testing scenarios
      activityDebounceMs: 1000,
      refreshIntervalMs: 15 * 60 * 1000, // 15 minutes
      idleWarningTimeoutMs: 25 * 60 * 1000, // 25 minutes
      logoutTimeoutMs: 30 * 60 * 1000, // 30 minutes
      enableActivityTracking: enableSessionManagement,
      enableTokenRefresh: enableSessionManagement,
      enableIdleWarning: enableSessionManagement,
      enableAutoLogout: enableSessionManagement,
      ...config,
    },
    handleIdleWarning,
    handleSessionTimeout
  );

  // Handle token refresh success/failure notifications
  useEffect(() => {
    clearNotificationTimeouts(); // Clear timeouts on every render
    if (sessionState.tokenRefreshStatus === 'success') {
      setShowTokenRefreshSuccess(true);
      successTimeoutRef.current = setTimeout(() => setShowTokenRefreshSuccess(false), 3000);
    } else if (sessionState.tokenRefreshStatus === 'failed') {
      setShowTokenRefreshError(true);
      errorTimeoutRef.current = setTimeout(() => setShowTokenRefreshError(false), 5000);
    }
  }, [sessionState.tokenRefreshStatus]);

  // Cleanup effect to clear timeouts on unmount
  useEffect(() => {
    return () => {
      clearNotificationTimeouts();
    };
  }, []);

  // Enhanced refresh token function with user feedback
  const handleRefreshToken = async (): Promise<boolean> => {
    const success = await refreshToken();
    if (success) {
      setShowTokenRefreshSuccess(true);
      successTimeoutRef.current = setTimeout(() => setShowTokenRefreshSuccess(false), 3000);
    } else {
      setShowTokenRefreshError(true);
      errorTimeoutRef.current = setTimeout(() => setShowTokenRefreshError(false), 5000);
    }
    return success;
  };

  // Enhanced extend session function
  const handleExtendSession = () => {
    extendSession();
    dismissIdleWarning();
  };

  const contextValue: SessionContextType = {
    sessionState,
    extendSession: handleExtendSession,
    refreshToken: handleRefreshToken,
    getSessionStatus,
    markActivity,
  };

  if (!enableSessionManagement) {
    // If session management is disabled, just provide a basic context
    return (
      <SessionContext.Provider value={contextValue}>
        {children}
      </SessionContext.Provider>
    );
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
      
      {/* Idle Warning Dialog */}
      <IdleWarningDialog
        open={sessionState.showIdleWarning}
        timeUntilLogout={sessionState.timeUntilLogout}
        onExtendSession={handleExtendSession}
        onLogout={handleSessionTimeout}
        onClose={dismissIdleWarning}
        autoLogoutEnabled={config?.enableAutoLogout !== false}
      />

      {/* Token Refresh Success Notification */}
      <Snackbar
        open={showTokenRefreshSuccess}
        autoHideDuration={3000}
        onClose={() => setShowTokenRefreshSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowTokenRefreshSuccess(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Session refreshed successfully
        </Alert>
      </Snackbar>

      {/* Token Refresh Error Notification */}
      <Snackbar
        open={showTokenRefreshError}
        autoHideDuration={5000}
        onClose={() => setShowTokenRefreshError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowTokenRefreshError(false)}
          severity="warning"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Session refresh failed. Please log in again if you experience issues.
        </Alert>
      </Snackbar>
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default SessionProvider;
