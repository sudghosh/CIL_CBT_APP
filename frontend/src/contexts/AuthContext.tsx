import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { logError } from '../utils/errorHandler';
import { isTokenExpired } from '../utils/cacheManager';
import { DEV_TOKEN, isDevToken, isDevMode } from '../utils/devMode';
import { validateToken, getUserFromToken } from '../utils/tokenUtils';
import { cacheAuthState } from '../utils/authCache';
import { syncAuthState, forceAdminStatusForDevMode } from '../utils/syncAuthState';

interface User {
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  isVerifiedAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (tokenInfo: { token: string }) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  clearError: () => void;
  refreshAuthStatus: () => Promise<boolean>;
  authChecked: boolean;
}

// Create a mock user for development purposes
const mockUser: User = {
  user_id: 1,
  email: 'dev@example.com',
  first_name: 'Development',
  last_name: 'User',
  role: 'Admin',
  is_active: true
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous dev mode user setup for initial state only
  const devToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isDev = isDevMode() && devToken && isDevToken(devToken);
  const [user, setUser] = useState<User | null>(isDev ? { ...mockUser, isVerifiedAdmin: true } : null);
  const [loading, setLoading] = useState(isDev ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(isDev ? true : false);

  const clearError = () => setError(null);

  useEffect(() => {
    if (isDev) {
      // Ensure admin cache is set for dev mode
      forceAdminStatusForDevMode();
      setUser({ ...mockUser, isVerifiedAdmin: true });
      setLoading(false);
      setAuthChecked(true);
      return;
    }
    // Handle session initialization on mount  
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (isMounted) {
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }
        try {
          const response = await authAPI.getCurrentUser();
          if (isMounted) {
            setUser(response.data);
            setError(null);
          }
        } catch (err: any) {
          if (err.status === 401 || err.response?.status === 401) {
            localStorage.removeItem('token');
          } else {
            if (isMounted) {
              setError(`Error initializing session: ${err.message}`);
            }
          }
          if (isMounted) {
            setUser(null);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
            setAuthChecked(true);
          }
        }
      } catch (error) {
        if (isMounted) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };
    if (!isDev) initializeAuth();
    return () => { isMounted = false; };
  }, [isDev]);
  
  // Handle Google login
  const login = async (tokenInfo: { token: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Always clear previous auth cache before login
      sessionStorage.removeItem('auth_cache');
      sessionStorage.removeItem('user_cache');
      sessionStorage.removeItem('admin_check');
      
      console.log('Attempting login with token:', tokenInfo.token ? 'Token provided' : 'No token');
      
      // Handle development token
      if (isDevToken(tokenInfo.token)) {
        console.log('Using development login');
        // Always use mockUser for dev mode
        localStorage.setItem('token', DEV_TOKEN);
        console.log('[DEBUG] Dev token set in localStorage:', localStorage.getItem('token'));
        setUser(mockUser);
        // Cache the mock user data
        cacheAuthState({...mockUser, isVerifiedAdmin: true});
        // Record authentication check timestamps
        sessionStorage.setItem('lastAuthCheck', Date.now().toString());
        sessionStorage.setItem('lastAdminCheck', Date.now().toString());
        setError(null);
        // Create a custom event to notify that authentication is complete
        const authEvent = new CustomEvent('auth-status-changed', {
          detail: { authenticated: true, user: mockUser }
        });
        window.dispatchEvent(authEvent);
        return;
      }

      // Check token before making API request
      if (!tokenInfo.token) {
        throw new Error("No Google token received");
      }

      // Execute the Google login call
      const response = await authAPI.googleLogin(tokenInfo);
      console.log('Login response:', response.data);
      
      if (!response.data.access_token) {
        throw new Error("No access token received from server");
      }
      
      // Store the token securely
      localStorage.setItem('token', response.data.access_token);
      console.log('[DEBUG] Token set in localStorage:', localStorage.getItem('token'));
      
      try {
        // Get user profile with the new token
        const userResponse = await authAPI.getCurrentUser();
        console.log('User data:', userResponse.data);
                setUser(userResponse.data);
        setError(null);
      } catch (userErr) {
        logError(userErr, { context: 'Fetching user data after login' });
        throw new Error("Could not retrieve user details.");
      }
    } catch (err: any) {
      logError(err, { context: 'Google login' });
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to login';
      console.error('Login error message:', errorMessage);
      setError(errorMessage);
      setUser(null);
      localStorage.removeItem('token');
      console.log('[DEBUG] Token removed from localStorage');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Special handling for dev mode - never actually logout
    if (isDevMode() && isDevToken(localStorage.getItem('token') || '')) {
      console.log('[DEBUG] Preventing logout in development mode with dev token');
      // Instead of logging out, refresh admin status
      forceAdminStatusForDevMode();
      setUser({ ...mockUser, isVerifiedAdmin: true });
      // Dispatch an event to notify components that auth status was preserved
      const authEvent = new CustomEvent('auth-status-preserved', {
        detail: { preserved: true, user: mockUser }
      });
      window.dispatchEvent(authEvent);
      return;
    }
    
    // Normal logout flow for production
    localStorage.removeItem('token');
    console.log('[DEBUG] Token removed from localStorage (logout)');
    setUser(null);
    // Clear session storage as well
    sessionStorage.removeItem('auth_cache');
    sessionStorage.removeItem('admin_check');
    sessionStorage.removeItem('user_cache');
  };
  
  const refreshAuthStatus = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    
    // No token case
    if (!token) {
      console.log('No token found during refresh');
      setUser(null);
      setLoading(false);
      return false;
    }

    // Check if we're using the development token
    if (isDevToken(token) && isDevMode()) {
      console.log('Using development user with mocked token');
      
      // Always ensure dev user has admin role and is verified
      const devUser = {...mockUser, isVerifiedAdmin: true};
      setUser(devUser);
      setError(null);
      setLoading(false);
      
      // Cache the mock user in session with proper expiration
      cacheAuthState(devUser);
      
      // Record that we refreshed auth status
      sessionStorage.setItem('lastAuthCheck', Date.now().toString());
      sessionStorage.setItem('lastAdminCheck', Date.now().toString());
      
      // Force set additional flags for development mode
      sessionStorage.setItem('admin_check', JSON.stringify({
        value: true,
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours for dev mode
      }));
      
      return true;
    }
    
    // Check token expiration
    try {
      if (isTokenExpired(token)) {
        console.log('Token expired during refresh');
        setUser(null);
        setLoading(false);
        return false;
      }
    } catch (err) {
      console.error('Error checking token expiration, treating as expired:', err);
      setUser(null);
      setLoading(false);
      return false;
    }
    
    try {
      setLoading(true);
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
      setError(null);
      console.log('Auth status refreshed successfully');
      return true;
    } catch (err: any) {
      console.error('Failed to refresh auth status:', err);
      if (err.status === 401 || err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'Admin';

  // Robust debug logging on every render
  useEffect(() => {
    console.log('[DEBUG][AuthContext] Rendered with:', {
      user,
      isAdmin: user?.role === 'Admin',
      loading,
      authChecked,
      token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
      auth_cache: typeof window !== 'undefined' ? sessionStorage.getItem('auth_cache') : null,
      admin_check: typeof window !== 'undefined' ? sessionStorage.getItem('admin_check') : null,
      user_cache: typeof window !== 'undefined' ? sessionStorage.getItem('user_cache') : null,
    });
    
    // Persistent token check - ensure dev token stays consistent in dev mode
    if (isDevMode() && user) {
      const token = localStorage.getItem('token');
      if (!token && isDev) {
        console.log('[DEBUG][AuthContext] Restoring missing dev token');
        localStorage.setItem('token', DEV_TOKEN);
      }
    }
  });

  // Harden dev mode: never allow user to be null in dev mode
  if (isDev) {
    if (!user || !user.isVerifiedAdmin) {
      setUser({ ...mockUser, isVerifiedAdmin: true });
    }
    if (loading) setLoading(false);
    if (!authChecked) setAuthChecked(true);
  }

  // Only render children once auth check is complete
  if (!authChecked && loading) {
    return <div>Initializing application...</div>;
  }
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      logout, 
      isAdmin, 
      clearError, 
      refreshAuthStatus,
      authChecked
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Failsafe: Always restore dev token if in dev mode and cache is present but token is missing (runs before React renders)
if (isDevMode()) {
  const token = localStorage.getItem('token');
  const authCache = sessionStorage.getItem('auth_cache');
  if (!token && authCache) {
    localStorage.setItem('token', DEV_TOKEN);
    // Optionally: console.log('[DEBUG] Failsafe: Dev token restored in localStorage (module scope)');
  }
}
