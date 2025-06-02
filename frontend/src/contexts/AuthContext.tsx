import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { logError } from '../utils/errorHandler';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const clearError = () => setError(null);

  // Handle session initialization on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      // If token is our development token, use mock user
      if (token === 'dev-token-for-testing') {
        console.log('Using development user account');
        setUser(mockUser);
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      try {
        const response = await authAPI.getCurrentUser();
        console.log('Current user:', response.data);
        setUser(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching current user:', err);
        localStorage.removeItem('token');
        setUser(null);
        // Don't show an error on initial load if token expired
        // setError('Session expired. Please log in again.');
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };

    initializeAuth();
  }, []);

  // Handle Google login
  const login = async (tokenInfo: { token: string }) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting login with token:', tokenInfo.token ? 'Token provided' : 'No token');
      
      // Handle development token
      if (tokenInfo.token === 'dev-token-for-testing') {
        console.log('Using development login');
        localStorage.setItem('token', tokenInfo.token);
        setUser(mockUser);
        setError(null);
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
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    // Optionally redirect to login page
    // window.location.href = '/login';
  };

  const isAdmin = user?.role === 'Admin';

  // Only render children once auth check is complete
  if (!authChecked && loading) {
    return <div>Initializing application...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, isAdmin, clearError }}>
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
