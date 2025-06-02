import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { logError } from '../utils/errorHandler';
import { isTokenExpired } from '../utils/cacheManager';
import { DEV_TOKEN, isDevToken, isDevMode } from '../utils/devMode';
import { validateToken, getUserFromToken } from '../utils/tokenUtils';

interface User {
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const clearError = () => setError(null);
  
  // Handle session initialization on mount  
  useEffect(() => {
    // Add a flag to track if the component is still mounted
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found in localStorage');
          if (isMounted) {
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }

        console.log(`Found token in localStorage: ${token.substring(0, 10)}...`);
        
        // If token is our development token, use mock user
        if (isDevToken(token) && isDevMode()) {
          console.log('Using development user account');
          if (isMounted) {
            setUser(mockUser);
            setLoading(false);
            setAuthChecked(true);
          }
          
          // Create a custom event to notify that authentication is complete
          const authEvent = new CustomEvent('auth-status-changed', { 
            detail: { authenticated: true, user: mockUser } 
          });
          window.dispatchEvent(authEvent);
          
          // Store a flag to prevent repeated auth checks during the session
          sessionStorage.setItem('devAuthInitialized', 'true');
          return;
        }

        try {
          // Verify token validity by making a request to getCurrentUser
          const response = await authAPI.getCurrentUser();
          console.log('Current user:', response.data);
          if (isMounted) {
            setUser(response.data);
            setError(null);
          }
        } catch (err: any) {
          console.error('Error fetching current user:', err);
          // Check if it's an authentication error (401)
          if (err.status === 401 || err.response?.status === 401) {
            console.log('Token is invalid or expired. Clearing token from localStorage.');
            localStorage.removeItem('token');
            // Don't show an error on initial load if token expired
            // setError('Session expired. Please log in again.');
          } else {
            // For other errors, keep the token but show the error
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
        console.error("Error during auth initialization:", error);
        if (isMounted) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };

    initializeAuth();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);
  // Handle Google login
  const login = async (tokenInfo: { token: string }) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting login with token:', tokenInfo.token ? 'Token provided' : 'No token');
        
      // Handle development token
      if (isDevToken(tokenInfo.token)) {
        console.log('Using development login');
        
        try {
          // First try to get user information using the token
          const userResponse = await authAPI.getCurrentUser();
          console.log('Development user data retrieved:', userResponse.data);
          setUser(userResponse.data);
        } catch (err) {
          console.log('Could not get user with dev token, using mock user');
          // If API call fails, use mock user
          localStorage.setItem('token', DEV_TOKEN);
          setUser(mockUser);
        }
        
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
      throw err;
    } finally {
      setLoading(false);
    }
  };  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);    // Optionally redirect to login page
    // window.location.href = '/login';
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
      setUser(mockUser);
      setError(null);
      setLoading(false);
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
      refreshAuthStatus 
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
