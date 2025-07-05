import { useCallback, useEffect, useRef, useState } from 'react';
import { useActivityTracker } from './useActivityTracker';
import { tokenRefreshService, TokenRefreshEvent } from '../services/tokenRefreshService';
import { logError } from '../utils/errorHandler';

export interface SessionConfig {
  // Activity tracking
  activityDebounceMs?: number;
  
  // Token refresh
  refreshIntervalMs?: number;
  
  // Idle timeouts (in milliseconds)
  idleWarningTimeoutMs?: number;  // Show warning after this idle time
  logoutTimeoutMs?: number;       // Logout after this idle time
  
  // Features
  enableActivityTracking?: boolean;
  enableTokenRefresh?: boolean;
  enableIdleWarning?: boolean;
  enableAutoLogout?: boolean;
}

export interface SessionState {
  isActive: boolean;
  isVisible: boolean;
  lastActivity: number;
  timeUntilWarning: number;
  timeUntilLogout: number;
  isCloseToExpiry: boolean;
  showIdleWarning: boolean;
  tokenRefreshStatus: 'idle' | 'refreshing' | 'success' | 'failed';
}

const DEFAULT_CONFIG: Required<SessionConfig> = {
  activityDebounceMs: 1000,        // 1 second
  refreshIntervalMs: 15 * 60 * 1000, // 15 minutes
  idleWarningTimeoutMs: 25 * 60 * 1000, // 25 minutes
  logoutTimeoutMs: 30 * 60 * 1000,      // 30 minutes
  enableActivityTracking: true,
  enableTokenRefresh: true,
  enableIdleWarning: true,
  enableAutoLogout: true,
};

export const useSessionManager = (
  config: SessionConfig = {},
  onIdleWarning?: () => void,
  onSessionTimeout?: () => void
) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Activity tracking
  const {
    isActive,
    isVisible,
    lastActivity,
    markActivity,
    getTimeSinceLastActivity,
    isIdleFor,
  } = useActivityTracker({
    debounceMs: mergedConfig.activityDebounceMs,
    trackMouse: mergedConfig.enableActivityTracking,
    trackKeyboard: mergedConfig.enableActivityTracking,
    trackScroll: mergedConfig.enableActivityTracking,
    trackTouch: mergedConfig.enableActivityTracking,
    trackVisibility: mergedConfig.enableActivityTracking,
  });

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive,
    isVisible,
    lastActivity,
    timeUntilWarning: mergedConfig.idleWarningTimeoutMs,
    timeUntilLogout: mergedConfig.logoutTimeoutMs,
    isCloseToExpiry: false,
    showIdleWarning: false,
    tokenRefreshStatus: 'idle',
  });

  // Timers
  const idleWarningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (idleWarningTimerRef.current) {
      clearTimeout(idleWarningTimerRef.current);
      idleWarningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (sessionUpdateTimerRef.current) {
      clearTimeout(sessionUpdateTimerRef.current);
      sessionUpdateTimerRef.current = null;
    }
  }, []);

  // Use refs for callback dependencies to prevent recreating the function
  const onIdleWarningRef = useRef(onIdleWarning);
  const onSessionTimeoutRef = useRef(onSessionTimeout);

  // Update refs when callbacks change
  useEffect(() => {
    onIdleWarningRef.current = onIdleWarning;
    onSessionTimeoutRef.current = onSessionTimeout;
  }, [onIdleWarning, onSessionTimeout]);

  // Reset idle timers when activity is detected
  const resetIdleTimers = useCallback(() => {
    clearTimers();

    // Hide idle warning if it was shown
    setSessionState(prev => ({ ...prev, showIdleWarning: false }));

    if (mergedConfig.enableIdleWarning) {
      idleWarningTimerRef.current = setTimeout(() => {
        console.log('[SessionManager] User has been idle, showing warning');
        setSessionState(prev => ({ ...prev, showIdleWarning: true }));
        onIdleWarningRef.current?.();
      }, mergedConfig.idleWarningTimeoutMs);
    }

    if (mergedConfig.enableAutoLogout) {
      logoutTimerRef.current = setTimeout(() => {
        console.log('[SessionManager] User session timeout, logging out');
        onSessionTimeoutRef.current?.();
      }, mergedConfig.logoutTimeoutMs);
    }
  }, [
    clearTimers,
    mergedConfig.enableIdleWarning,
    mergedConfig.enableAutoLogout,
    mergedConfig.idleWarningTimeoutMs,
    mergedConfig.logoutTimeoutMs,
  ]);

  // Extend session (reset timers)
  const extendSession = useCallback(() => {
    markActivity();
    resetIdleTimers();
    
    // Try to refresh token if needed
    if (mergedConfig.enableTokenRefresh && tokenRefreshService.needsRefresh()) {
      tokenRefreshService.refreshToken().catch(error => {
        logError('Failed to refresh token during session extension', error);
      });
    }
  }, [markActivity, resetIdleTimers, mergedConfig.enableTokenRefresh]);

  // Dismiss idle warning
  const dismissIdleWarning = useCallback(() => {
    extendSession();
  }, [extendSession]);

  // Initialize session management (only run once on mount)
  useEffect(() => {
    let mounted = true;
    
    // Create a stable event handler that doesn't change on every render
    const handleTokenEvent = (event: TokenRefreshEvent) => {
      if (!mounted) return;
      
      switch (event.type) {
        case 'refresh-started':
          setSessionState(prev => ({ ...prev, tokenRefreshStatus: 'refreshing' }));
          break;
        case 'refresh-success':
          setSessionState(prev => ({ ...prev, tokenRefreshStatus: 'success' }));
          break;
        case 'refresh-failed':
          setSessionState(prev => ({ ...prev, tokenRefreshStatus: 'failed' }));
          break;
        case 'expiry-warning':
          setSessionState(prev => ({ ...prev, isCloseToExpiry: true }));
          break;
      }
    };

    // Start token refresh service
    if (mergedConfig.enableTokenRefresh) {
      tokenRefreshService.start();
      tokenRefreshService.addEventListener(handleTokenEvent);
    }

    // Start session state updates with a simple interval
    const updateLoop = () => {
      if (!mounted) return;
      
      const timeSinceLastActivity = getTimeSinceLastActivity();
      const timeUntilWarning = Math.max(0, mergedConfig.idleWarningTimeoutMs - timeSinceLastActivity);
      const timeUntilLogout = Math.max(0, mergedConfig.logoutTimeoutMs - timeSinceLastActivity);

      // Only update state if values have actually changed to prevent unnecessary re-renders
      setSessionState(prev => {
        const newState = {
          isActive,
          isVisible,
          lastActivity,
          timeUntilWarning,
          timeUntilLogout,
        };
        
        // Check if the values have actually changed
        const hasChanged = (
          prev.isActive !== newState.isActive ||
          prev.isVisible !== newState.isVisible ||
          prev.lastActivity !== newState.lastActivity ||
          Math.abs(prev.timeUntilWarning - newState.timeUntilWarning) > 1000 || // Only update if difference > 1 second
          Math.abs(prev.timeUntilLogout - newState.timeUntilLogout) > 1000
        );
        
        if (!hasChanged) {
          return prev; // Return previous state to prevent unnecessary re-render
        }
        
        return {
          ...prev,
          ...newState,
        };
      });
    };
    
    // Update immediately and then every second
    updateLoop();
    const intervalId = setInterval(updateLoop, 1000);

    // Initial setup of idle timers
    resetIdleTimers();

    return () => {
      mounted = false;
      clearInterval(intervalId);
      clearTimers();
      if (mergedConfig.enableTokenRefresh) {
        tokenRefreshService.removeEventListener(handleTokenEvent);
        tokenRefreshService.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - we want this to run only once on mount

  // Reset timers when activity changes
  useEffect(() => {
    if (isActive) {
      resetIdleTimers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // Removed resetIdleTimers from dependency array to prevent infinite loop

  // Manual token refresh
  const refreshToken = useCallback(async () => {
    if (mergedConfig.enableTokenRefresh) {
      return await tokenRefreshService.refreshToken();
    }
    return false;
  }, [mergedConfig.enableTokenRefresh]);

  // Check if user should be logged out due to inactivity
  const shouldLogoutDueToInactivity = useCallback(() => {
    return isIdleFor(mergedConfig.logoutTimeoutMs);
  }, [isIdleFor, mergedConfig.logoutTimeoutMs]);

  // Get session status
  const getSessionStatus = useCallback(() => {
    const timeSinceLastActivity = getTimeSinceLastActivity();
    
    if (timeSinceLastActivity > mergedConfig.logoutTimeoutMs) {
      return 'expired';
    } else if (timeSinceLastActivity > mergedConfig.idleWarningTimeoutMs) {
      return 'warning';
    } else if (isActive) {
      return 'active';
    } else {
      return 'idle';
    }
  }, [
    getTimeSinceLastActivity,
    mergedConfig.logoutTimeoutMs,
    mergedConfig.idleWarningTimeoutMs,
    isActive,
  ]);

  // Cleanup function to reset session state and clear all timers
  const cleanupSession = useCallback(() => {
    // Clear all timers
    clearTimers();
    
    // Reset session state to initial values
    setSessionState(prev => ({
      ...prev,
      showIdleWarning: false,
      timeUntilWarning: mergedConfig.idleWarningTimeoutMs,
      timeUntilLogout: mergedConfig.logoutTimeoutMs,
      isCloseToExpiry: false,
      tokenRefreshStatus: 'idle',
    }));
    
    console.log('[SessionManager] Session cleaned up - all timers cleared and state reset');
  }, [clearTimers, mergedConfig.idleWarningTimeoutMs, mergedConfig.logoutTimeoutMs]);

  return {
    // State
    sessionState,
    
    // Status checks
    shouldLogoutDueToInactivity,
    getSessionStatus,
    
    // Actions
    extendSession,
    dismissIdleWarning,
    refreshToken,
    markActivity,
    cleanupSession,
    
    // Utils
    getTimeSinceLastActivity,
    isIdleFor,
  };
};

export default useSessionManager;
