import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { logError } from '../utils/errorHandler';
import { isTokenExpired } from '../utils/cacheManager';
import { DEV_TOKEN, isDevToken, isDevMode } from '../utils/devMode';
import { cacheAuthState } from '../utils/authCache';
import { markLoginFlowStart, markLoginFlowEnd } from '../utils/tokenMonitor';

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
  developmentLogin: () => Promise<void>;
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
  // Initialize state without auto-login - always start at login page
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const clearError = () => setError(null);

  useEffect(() => {
    // Initialize auth state - check for existing valid authentication
    let isMounted = true;
    
    const initializeAuth = async () => {
      if (isMounted) {
        console.log('[AuthContext] Initializing auth context - checking for existing auth');
        
        try {
          // Check for existing token in localStorage
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (token && !isTokenExpired(token)) {
            console.log('[AuthContext] Found valid token, attempting to restore session');
            
            // Check if it's a dev token
            if (isDevToken(token)) {
              console.log('[AuthContext] Restoring development session');
              setUser(mockUser);
              setError(null);
              setLoading(false);
              setAuthChecked(true);
              
              // Cache the auth state
              cacheAuthState({...mockUser, isVerifiedAdmin: true});
              
              // Dispatch auth event
              const authEvent = new CustomEvent('auth-status-changed', {
                detail: { authenticated: true, user: mockUser }
              });
              window.dispatchEvent(authEvent);
              return;
            }
            
            // For regular tokens, try to get user info
            try {
              const userResponse = await authAPI.getCurrentUser();
              const userInfo = userResponse.data as User;
              if (isMounted && userInfo) {
                console.log('[AuthContext] Successfully restored user session');
                setUser(userInfo);
                setError(null);
                cacheAuthState(userInfo);
                
                // Dispatch auth event
                const authEvent = new CustomEvent('auth-status-changed', {
                  detail: { authenticated: true, user: userInfo }
                });
                window.dispatchEvent(authEvent);
              }
            } catch (error) {
              console.log('[AuthContext] Token invalid or expired, clearing auth');
              localStorage.removeItem('access_token');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          } else {
            console.log('[AuthContext] No valid token found, starting at login');
            
            // Clear any stale authentication state
            localStorage.removeItem('token');
            sessionStorage.removeItem('auth_cache');
            sessionStorage.removeItem('admin_check');
            sessionStorage.removeItem('user_cache');
            sessionStorage.removeItem('lastAuthCheck');
            sessionStorage.removeItem('lastAdminCheck');
          }
        } catch (error) {
          console.error('[AuthContext] Error during initialization:', error);
        } finally {
          if (isMounted) {
            setLoading(false);
            setAuthChecked(true);
            console.log('[AuthContext] Initialization complete');
          }
        }
      }
    };

    initializeAuth();
    return () => { isMounted = false; };
  }, []);
  
  // Handle Google login
  const login = async (tokenInfo: { token: string }) => {
    markLoginFlowStart(); // Prevent token monitor interference
    
    try {
      setLoading(true);
      setError(null);
      
      // Always clear previous auth cache before login
      sessionStorage.removeItem('auth_cache');
      sessionStorage.removeItem('user_cache');
      sessionStorage.removeItem('admin_check');
      
      console.log('Attempting login with token:', tokenInfo.token ? 'Token provided' : 'No token');
      
      // Check token before making API request
      if (!tokenInfo.token) {
        throw new Error("No token received");
      }

      // Handle legacy development token (only for dev-token-* format)
      if (isDevToken(tokenInfo.token)) {
        console.log('Using development login with dev token');
        localStorage.setItem('token', DEV_TOKEN);
        console.log('[DEBUG] Dev token set in localStorage:', localStorage.getItem('token'));
        setUser(mockUser);
        cacheAuthState({...mockUser, isVerifiedAdmin: true});
        sessionStorage.setItem('lastAuthCheck', Date.now().toString());
        sessionStorage.setItem('lastAdminCheck', Date.now().toString());
        setError(null);
        const authEvent = new CustomEvent('auth-status-changed', {
          detail: { authenticated: true, user: mockUser }
        });
        window.dispatchEvent(authEvent);
        return;
      }

      // For all other tokens (including Google Auth JWT tokens), validate with backend
      console.log('Validating token with backend API');
      const response = await authAPI.googleLogin(tokenInfo);
      console.log('Login response:', response.data);
      
      if (!response.data || !(response.data as any).access_token) {
        throw new Error("No access token received from server");
      }
      
      // Store the token securely
      localStorage.setItem('token', (response.data as any).access_token);
      console.log('[DEBUG] Token set in localStorage:', localStorage.getItem('token'));
      
      try {
        // Get user profile with the new token
        const userResponse = await authAPI.getCurrentUser();
        console.log('User data:', userResponse.data);
                setUser(userResponse.data as User);
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
      markLoginFlowEnd(); // Re-enable token monitor
    }
  };

  // Development login function - only available in dev mode
  const developmentLogin = async () => {
    if (!isDevMode()) {
      throw new Error('Development login is only available in development mode');
    }

    try {
      setLoading(true);
      setError(null);

      // Clear any existing auth cache
      sessionStorage.removeItem('auth_cache');
      sessionStorage.removeItem('user_cache');
      sessionStorage.removeItem('admin_check');

      console.log('Performing development login via backend...');

      // Call the backend dev-login endpoint to get a real JWT token
      const response = await authAPI.developmentLogin();
      console.log('Development login response:', response.data);
      
      if (!response.data || !(response.data as any).access_token) {
        throw new Error("No access token received from development login");
      }
      
      // Store the real JWT token from backend
      localStorage.setItem('token', (response.data as any).access_token);
      console.log('[DEBUG] Real dev token set in localStorage');

      try {
        // Get user profile with the new token
        const userResponse = await authAPI.getCurrentUser();
        console.log('Development user data:', userResponse.data);
        setUser(userResponse.data as User);
        setError(null);
      } catch (userErr) {
        logError(userErr, { context: 'Fetching user data after development login' });
        throw new Error("Could not retrieve user details after development login.");
      }

      console.log('Development login successful');
      setError(null);

      // Create a custom event to notify that authentication is complete
      const authEvent = new CustomEvent('auth-status-changed', {
        detail: { authenticated: true, user: (await authAPI.getCurrentUser()).data }
      });
      window.dispatchEvent(authEvent);
    } catch (err: any) {
      console.error('Development login error:', err);
      setError(err.message || 'Development login failed');
      setUser(null);
      localStorage.removeItem('token');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Normal logout flow
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
      
      // Add a timeout to the API call to prevent hanging indefinitely
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Authentication request timed out after 10 seconds'));
        }, 10000); // 10 second timeout
      });
      
      // Race between the API call and the timeout
      const response = await Promise.race([
        authAPI.getCurrentUser(),
        timeoutPromise
      ]);
      
      setUser(response.data as User);
      setError(null);
      console.log('Auth status refreshed successfully');
      return true;
    } catch (err: any) {
      console.error('Failed to refresh auth status:', err);
      if (err.status === 401 || err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      } else if (err.message && err.message.includes('timed out')) {
        // If timed out, try to reuse cached user data if available
        const cachedUserData = sessionStorage.getItem('user_cache');
        if (cachedUserData) {
          try {
            const cachedUser = JSON.parse(cachedUserData);
            setUser(cachedUser);
            console.log('Using cached user data after timeout');
            return true;
          } catch (cacheErr) {
            console.error('Error parsing cached user data:', cacheErr);
          }
        }
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
    

  });

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
      developmentLogin,
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

// Failsafe disabled to prevent interference with login flows
// Note: This failsafe was automatically restoring dev tokens and preventing Google Auth
// if (isDevMode()) {
//   const token = localStorage.getItem('token');
//   const authCache = sessionStorage.getItem('auth_cache');
//   if (!token && authCache) {
//     localStorage.setItem('token', DEV_TOKEN);
//     // Optionally: console.log('[DEBUG] Failsafe: Dev token restored in localStorage (module scope)');
//   }
// }
