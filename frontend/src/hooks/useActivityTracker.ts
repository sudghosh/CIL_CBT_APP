import { useCallback, useEffect, useRef, useState } from 'react';

interface ActivityTrackerConfig {
  debounceMs?: number;
  trackMouse?: boolean;
  trackKeyboard?: boolean;
  trackScroll?: boolean;
  trackTouch?: boolean;
  trackVisibility?: boolean;
}

interface ActivityState {
  isActive: boolean;
  lastActivity: number;
  isVisible: boolean;
}

const DEFAULT_CONFIG: Required<ActivityTrackerConfig> = {
  debounceMs: 1000, // 1 second debounce
  trackMouse: true,
  trackKeyboard: true,
  trackScroll: true,
  trackTouch: true,
  trackVisibility: true,
};

export const useActivityTracker = (config: ActivityTrackerConfig = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [activityState, setActivityState] = useState<ActivityState>({
    isActive: true,
    lastActivity: Date.now(),
    isVisible: !document.hidden,
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Debounced activity update function
  const updateActivity = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      lastActivityRef.current = now;
      setActivityState(prev => ({
        ...prev,
        isActive: true,
        lastActivity: now,
      }));
    }, mergedConfig.debounceMs);
  }, [mergedConfig.debounceMs]);

  // Activity event handlers
  const handleMouseActivity = useCallback((event: Event) => {
    // Only trigger on actual movement, not just mouse events
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.movementX !== 0 || mouseEvent.movementY !== 0) {
      updateActivity();
    }
  }, [updateActivity]);

  const handleClickActivity = useCallback((event: Event) => {
    updateActivity();
  }, [updateActivity]);

  const handleKeyboardActivity = useCallback((event: Event) => {
    updateActivity();
  }, [updateActivity]);

  const handleScrollActivity = useCallback((event: Event) => {
    updateActivity();
  }, [updateActivity]);

  const handleTouchActivity = useCallback((event: Event) => {
    updateActivity();
  }, [updateActivity]);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    setActivityState(prev => ({
      ...prev,
      isVisible,
    }));

    // If page becomes visible, consider it an activity
    if (isVisible) {
      updateActivity();
    }
  }, [updateActivity]);

  // Setup event listeners
  useEffect(() => {
    const events: Array<{
      event: string;
      handler: EventListener;
      enabled: boolean;
    }> = [
      { event: 'mousemove', handler: handleMouseActivity, enabled: mergedConfig.trackMouse },
      { event: 'mousedown', handler: handleClickActivity, enabled: mergedConfig.trackMouse },
      { event: 'mouseup', handler: handleClickActivity, enabled: mergedConfig.trackMouse },
      { event: 'keydown', handler: handleKeyboardActivity, enabled: mergedConfig.trackKeyboard },
      { event: 'keyup', handler: handleKeyboardActivity, enabled: mergedConfig.trackKeyboard },
      { event: 'scroll', handler: handleScrollActivity, enabled: mergedConfig.trackScroll },
      { event: 'wheel', handler: handleScrollActivity, enabled: mergedConfig.trackScroll },
      { event: 'touchstart', handler: handleTouchActivity, enabled: mergedConfig.trackTouch },
      { event: 'touchmove', handler: handleTouchActivity, enabled: mergedConfig.trackTouch },
      { event: 'touchend', handler: handleTouchActivity, enabled: mergedConfig.trackTouch },
    ];

    // Add event listeners
    events.forEach(({ event, handler, enabled }) => {
      if (enabled) {
        document.addEventListener(event, handler, { passive: true });
      }
    });

    // Add visibility change listener
    if (mergedConfig.trackVisibility) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      // Cleanup event listeners
      events.forEach(({ event, handler, enabled }) => {
        if (enabled) {
          document.removeEventListener(event, handler);
        }
      });

      if (mergedConfig.trackVisibility) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }

      // Clear debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    mergedConfig.trackMouse,
    mergedConfig.trackKeyboard,
    mergedConfig.trackScroll,
    mergedConfig.trackTouch,
    mergedConfig.trackVisibility,
    handleMouseActivity,
    handleClickActivity,
    handleKeyboardActivity,
    handleScrollActivity,
    handleTouchActivity,
    handleVisibilityChange,
  ]);

  // Function to manually mark activity (useful for API calls, etc.)
  const markActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  // Function to get time since last activity
  const getTimeSinceLastActivity = useCallback(() => {
    return Date.now() - lastActivityRef.current;
  }, []);

  // Function to check if user has been idle for specified duration
  const isIdleFor = useCallback((milliseconds: number) => {
    return getTimeSinceLastActivity() > milliseconds;
  }, [getTimeSinceLastActivity]);

  return {
    ...activityState,
    markActivity,
    getTimeSinceLastActivity,
    isIdleFor,
  };
};

export default useActivityTracker;
