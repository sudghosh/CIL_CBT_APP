import axios from 'axios';
import { APIError } from '../../utils/errorHandler';

// Define mock types
type MockedAxios = typeof axios & {
  create: jest.Mock;
};

interface MockInterceptors {
  request: { use: jest.Mock };
  response: { use: jest.Mock };
}

interface MockAxiosInstance {
  interceptors: MockInterceptors;
}

// Mock axios
jest.mock('axios', () => {
  return {
    create: jest.fn().mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    })
  };
});

describe('API Interceptors', () => {
  let api: any;
  let requestInterceptorSuccess: any;
  let requestInterceptorError: any;
  let responseInterceptorSuccess: any;
  let responseInterceptorError: (error: any) => Promise<never>;

  beforeEach(() => {
    // Reset axios mock
    jest.clearAllMocks();
    
    // Reset console mocks
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();

    // Mock axios.create
    const mockAxiosInstance: MockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    (axios as MockedAxios).create.mockReturnValue(mockAxiosInstance);
    
    // Import the API to trigger the interceptor setup
    jest.isolateModules(() => {
      require('../api');
    });
      // Get the interceptors that were registered
    const mockInstance = (axios as MockedAxios).create();
    // Cast to any to access the mock property
    const requestUseMock = mockInstance.interceptors.request.use as any;
    const responseUseMock = mockInstance.interceptors.response.use as any;
    
    requestInterceptorSuccess = requestUseMock.mock.calls[0][0];
    requestInterceptorError = requestUseMock.mock.calls[0][1];
    responseInterceptorSuccess = responseUseMock.mock.calls[0][0];
    responseInterceptorError = responseUseMock.mock.calls[0][1];
  });

  describe('Response error interceptor', () => {
    it('should handle 403 Forbidden errors with detail field', async () => {
      // Create a mock 403 error with detail field
      const errorResponse = {
        response: {
          status: 403,
          data: {
            detail: 'You do not have access to this feature'
          }
        },
        config: { url: '/test-url' }
      };

      // Test the interceptor with the error response
      try {
        await responseInterceptorError(errorResponse);
        fail('The interceptor should throw an error');
      } catch (err: unknown) {
        const error = err as APIError;
        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(403);
        expect(error.message).toBe('You do not have access to this feature');
      }
    });

    it('should handle 403 Forbidden errors with message field', async () => {
      // Create a mock 403 error with message field
      const errorResponse = {
        response: {
          status: 403,
          data: {
            message: 'Access denied by policy'
          }
        },
        config: { url: '/test-url' }
      };

      // Test the interceptor with the error response
      try {
        await responseInterceptorError(errorResponse);
        fail('The interceptor should throw an error');
      } catch (err: unknown) {
        const error = err as APIError;
        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(403);
        expect(error.message).toBe('Access denied by policy');
      }
    });

    it('should handle 403 Forbidden errors with error field', async () => {
      // Create a mock 403 error with error field
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: 'Permission denied'
          }
        },
        config: { url: '/test-url' }
      };

      // Test the interceptor with the error response
      try {
        await responseInterceptorError(errorResponse);
        fail('The interceptor should throw an error');
      } catch (err: unknown) {
        const error = err as APIError;
        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(403);
        expect(error.message).toBe('Permission denied');
      }
    });

    it('should use default message for 403 Forbidden errors with no specific message', async () => {
      // Create a mock 403 error with no specific message fields
      const errorResponse = {
        response: {
          status: 403,
          data: {}
        },
        config: { url: '/test-url' }
      };

      // Test the interceptor with the error response
      try {
        await responseInterceptorError(errorResponse);
        fail('The interceptor should throw an error');
      } catch (err: unknown) {
        const error = err as APIError;
        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(403);
        expect(error.message).toBe('You do not have permission to perform this action. Please contact an administrator for access if you need these features.');
      }
    });

    // Also test other error status codes to ensure the interceptor handles them correctly
    it('should handle 401 Unauthorized errors', async () => {
      // Create a mock 401 error
      const errorResponse = {
        response: {
          status: 401,
          data: {}
        },
        config: { url: '/test-url' }
      };

      // Mock window.location to prevent redirect
      const originalLocation = window.location;
      // Use Object.defineProperty instead of direct assignment
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { href: '' },
      });
      
      // Test the interceptor with the error response
      try {
        await responseInterceptorError(errorResponse);
        fail('The interceptor should throw an error');
      } catch (err: unknown) {
        const error = err as APIError;
        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(401);
        expect(window.location.href).toContain('/login?session_expired=true');
      }
      
      // Restore window.location
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    });

    it('should handle 404 Not Found errors', async () => {
      // Create a mock 404 error
      const errorResponse = {
        response: {
          status: 404,
          data: {}
        },
        config: { url: '/test-url' }
      };

      // Test the interceptor with the error response
      try {
        await responseInterceptorError(errorResponse);
        fail('The interceptor should throw an error');
      } catch (err: unknown) {
        const error = err as APIError;
        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(404);
        expect(error.message).toBe('The requested resource was not found.');
      }
    });

    it('should handle 422 Validation errors', async () => {
      // Create a mock 422 error
      const errorResponse = {
        response: {
          status: 422,
          data: {}
        },
        config: { url: '/test-url' }
      };

      // Test the interceptor with the error response
      try {
        await responseInterceptorError(errorResponse);
        fail('The interceptor should throw an error');
      } catch (err: unknown) {
        const error = err as APIError;
        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(422);
        expect(error.message).toBe('Invalid input data. Please check your submission.');
      }
    });
  });
});
