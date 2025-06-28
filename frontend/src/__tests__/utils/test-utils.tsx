import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock AuthProvider with default test values
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-auth-provider">{children}</div>
  ),
  useAuth: () => ({
    user: { 
      user_id: 1, 
      email: 'test@example.com', 
      first_name: 'Test',
      last_name: 'User',
      role: 'Admin',
      is_active: true
    },
    isAdmin: true,
    loading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    refreshAuthStatus: jest.fn().mockResolvedValue(true),
    clearError: jest.fn(),
    authChecked: true
  }),
}));

// Mock ThemeProvider
jest.mock('../../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-theme-provider">{children}</div>
  ),
  useTheme: () => ({
    mode: 'light',
    toggleTheme: jest.fn()
  }),
}));

// Custom render with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Create mock API response helpers
export const createApiSuccessResponse = (data: any) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {}
});

export const createApiErrorResponse = (status: number, message?: string, detail?: string, error?: string) => {
  const data: any = {};
  if (detail) data.detail = detail;
  if (message) data.message = message;
  if (error) data.error = error;

  return {
    response: {
      data,
      status,
      statusText: status === 403 ? 'Forbidden' : 'Error',
      headers: {},
      config: {}
    }
  };
};

export * from '@testing-library/react';
export { customRender as render };
