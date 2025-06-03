import axios from 'axios';
import { handleAPIError, APIError, logError } from '../utils/errorHandler';
import { DEV_TOKEN, isDevToken, isDevMode } from '../utils/devMode';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Define types for API requests
interface GoogleLoginRequest {
  token: string;
}

interface QuestionData {
  question_text: string;
  paper_id: number;
  section_id: number;
  default_difficulty_level: string;
  options: Array<{
    option_text: string;
    option_order: number;
  }>;
  correct_option_index: number;
  explanation?: string;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to prevent hanging requests
  timeout: 20000,
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');
    let tokenRestored = false;
    
    // Auto-restore dev token if missing in development mode
    if (!token && isDevMode()) {
      console.log(`[API] No token found for request: ${config.method?.toUpperCase()} ${config.url}, restoring dev token`);
      token = DEV_TOKEN;
      localStorage.setItem('token', DEV_TOKEN);
      tokenRestored = true;
      
      // Dispatch event to notify about token restoration
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('dev-token-restored', { 
          detail: { timestamp: Date.now() } 
        });
        window.dispatchEvent(event);
      }
    }
    
    // Handle development token specially
    if (token && isDevToken(token) && isDevMode()) {
      if (tokenRestored) {
        console.log(`[API] Using restored development token for request: ${config.method?.toUpperCase()} ${config.url}`);
      } else {
        console.log(`[API] Using development token for request: ${config.method?.toUpperCase()} ${config.url}`);
      }
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Dev-Mode'] = 'true';
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Log token being used (hide actual value in production)
      if (isDevMode()) {
        console.log(`[API] Using token for request: ${token.substring(0, 10)}...`);
      }
    } else {
      console.warn(`[API] No token found for API request to ${config.url}`);
    }
    
    // Log outgoing requests in development
    if (isDevMode()) {
      console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`, config);
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add error handling interceptor with detailed error messages
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (isDevMode()) {
      console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },  (error) => {
    // Check if this is a development environment with a dev token
    const token = localStorage.getItem('token');
    const isDevTokenRequest = token && isDevToken(token) && isDevMode();
    
    // In dev mode with dev token, we'll mock successful responses for certain endpoints
    if (isDevTokenRequest && error.config) {
      const url = error.config.url || '';
      
      // For development mode with dev token, bypass certain API errors
      // This allows the app to function even if the backend is missing endpoints
      if (url.includes('/auth/me')) {
        console.warn('Mocking /auth/me response in development mode');
        return Promise.resolve({
          data: {
            user_id: 1,
            email: 'dev@example.com',
            first_name: 'Development',
            last_name: 'User',
            role: 'Admin',
            is_active: true
          },
          status: 200
        });
      }
      
      // Also mock the health endpoint for development mode to prevent excessive API calls
      if (url.includes('/health')) {
        console.warn('Mocking health check response in development mode');
        return Promise.resolve({
          data: {
            status: 'healthy',
            database: 'connected',
            mode: 'development-mock'
          },
          status: 200
        });
      }
    }
    
    // Log the error with context
    logError(error, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      devMode: isDevMode(),
      devToken: isDevTokenRequest
    });
    
    // Get the current URL path
    const currentPath = window.location.pathname;
    
    // Handle different types of errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      
      // Don't redirect to login if we're already on the login page
      // This prevents infinite redirect loops
      if (!currentPath.includes('/login')) {
        // Store the current path to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        console.log('[DEBUG][HardRedirect][api.ts] Redirecting to /login?session_expired=true');
        window.location.href = '/login?session_expired=true';
      }
      
      throw new APIError('Your session has expired. Please log in again.', 401);
    }
    if (error.response?.status === 403) {
      throw new APIError('You do not have permission to perform this action.', 403);
    }
    if (error.response?.status === 404) {
      throw new APIError('The requested resource was not found.', 404);
    }
    if (error.response?.status === 422) {
      throw new APIError('Invalid input data. Please check your submission.', 422);
    }
    throw handleAPIError(error);
  }
);

// Auth API
export const authAPI = {
  googleLogin: (tokenInfo: GoogleLoginRequest) => api.post('/auth/google-callback', tokenInfo),
  getCurrentUser: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  whitelistEmail: (email: string) => api.post('/auth/whitelist-email', { email }),
  updateUserStatus: (userId: number, isActive: boolean) => 
    api.put(`/auth/users/${userId}/status`, { is_active: isActive }),  updateUserRole: (userId: number, role: string) =>
    api.put(`/auth/users/${userId}/role`, { role }),
  // Health check for API with caching to prevent excessive requests
  healthCheck: () => {
    // Get current timestamp
    const now = Date.now();
    // Only call health check API once per minute max
    const lastCheck = parseInt(sessionStorage.getItem('lastHealthCheck') || '0', 10);
    
    if (now - lastCheck < 30000) { // 30 seconds
      console.log('Using cached health check result');
      const cachedResult = sessionStorage.getItem('healthCheckResult');
      return Promise.resolve(JSON.parse(cachedResult || '{"status":"cached"}'));
    }
    
    // Store timestamp of this check
    sessionStorage.setItem('lastHealthCheck', now.toString());
    
    // Make actual API call
    return api.get('/health').then(response => {
      sessionStorage.setItem('healthCheckResult', JSON.stringify(response.data));
      return response;
    });
  },
};

// Questions API
export const questionsAPI = {
  getQuestions: (params?: { paper_id?: number; section_id?: number }) =>
    api.get('/questions', { params }),
  getQuestion: (id: number) => api.get(`/questions/${id}`),
  createQuestion: (data: QuestionData) => api.post('/questions', data),
  uploadQuestions: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/questions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateQuestion: (id: number, data: any) => api.put(`/questions/${id}`, data),
  deactivateQuestion: (id: number) => api.put(`/questions/${id}/deactivate`),
};

// Tests API
export const testsAPI = {
  getTemplates: () => api.get('/tests/templates'),
  createTemplate: (data: any) => api.post('/tests/templates', data),
  startTest: (templateId: number) => api.post('/tests/start', { template_id: templateId }),
  submitAnswer: (attemptId: number, data: any) =>
    api.post(`/tests/submit/${attemptId}/answer`, data),
  finishTest: (attemptId: number) => api.post(`/tests/finish/${attemptId}`),
  getAttempts: () => api.get('/tests/attempts'),
  getQuestions: (attemptId: number) => api.get(`/tests/questions/${attemptId}`),
  getAttemptDetails: (attemptId: number) => api.get(`/tests/attempts/${attemptId}/details`),
  toggleMarkForReview: (attemptId: number, questionId: number) =>
    api.post(`/tests/${attemptId}/mark-review/${questionId}`),
};

// Papers API
export const papersAPI = {
  getPapers: () => api.get('/papers'),
  createPaper: (data: any) => api.post('/papers', data),
  activatePaper: (paperId: number) => api.put(`/papers/${paperId}/activate`),
  deactivatePaper: (paperId: number) => api.put(`/papers/${paperId}/deactivate`),
};
