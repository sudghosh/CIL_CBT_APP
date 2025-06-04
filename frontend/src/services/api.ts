import axios from 'axios';
import { handleAPIError, APIError, logError } from '../utils/errorHandler';
import { DEV_TOKEN, isDevToken, isDevMode } from '../utils/devMode';
import { axiosWithRetry } from '../utils/apiRetry';

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
    // Log detailed error information in development mode
    if (isDevMode()) {
      console.error('API Error Details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
          headers: error.config?.headers ? { ...error.config.headers, Authorization: '[REDACTED]' } : undefined
        }
      });
      
      // Special handling for timeout errors
      if (error.message && error.message.includes('timeout')) {
        console.error('API TIMEOUT ERROR: Request timed out', error.config?.url);
      }
    }
    
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
    throw handleAPIError(error);  }
);

// Auth API with retry capabilities for critical endpoints
export const authAPI = {
  googleLogin: (tokenInfo: GoogleLoginRequest) => 
    // Use retry for Google login which is critical to the authentication flow
    axiosWithRetry.post('/auth/google-callback', tokenInfo, {
      baseURL: API_URL,
      timeout: 12000, // 12 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
      }
    }, {
      retries: 2, // Retry twice
      retryDelay: 800 // Start with 800ms delay
    }),
    
  getCurrentUser: () => 
    // Use retry for current user which is critical to maintaining authentication
    axiosWithRetry.get('/auth/me', {
      baseURL: API_URL,
      timeout: 8000, // 8 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
      }
    }, {
      retries: 1, // Retry once
      retryDelay: 500 // Start with 500ms delay
    }),  getUsers: () => api.get('/auth/users'),
  whitelistEmail: (email: string) => api.post('/admin/allowed-emails', { email: email }),
  getAllowedEmails: () => api.get('/admin/allowed-emails'),
  deleteAllowedEmail: (emailId: number) => api.delete(`/admin/allowed-emails/${emailId}`),
  updateUserStatus: (userId: number, isActive: boolean) => 
    api.put(`/auth/users/${userId}/status`, { is_active: isActive }),updateUserRole: (userId: number, role: string) =>
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
  getPaper: (paperId: number) => api.get(`/papers/${paperId}`),
  createPaper: (data: any) => api.post('/papers', data),
  updatePaper: (paperId: number, data: any) => api.put(`/papers/${paperId}`, data),
  deletePaper: (paperId: number) => api.delete(`/papers/${paperId}`),
  activatePaper: (paperId: number) => api.put(`/papers/${paperId}/activate`),
  deactivatePaper: (paperId: number) => api.put(`/papers/${paperId}/deactivate`),
};

// Sections API
export const sectionsAPI = {
  getSections: (paperId?: number) => {
    const params = paperId ? { paper_id: paperId } : {};
    return api.get('/sections', { params });
  },
  getSection: (sectionId: number) => api.get(`/sections/${sectionId}`),
  createSection: (data: any) => api.post('/sections', data),
  updateSection: (sectionId: number, data: any) => api.put(`/sections/${sectionId}`, data),
  deleteSection: (sectionId: number) => api.delete(`/sections/${sectionId}`),
};

// Subsections API
export const subsectionsAPI = {
  getSubsections: (sectionId?: number) => {
    const params = sectionId ? { section_id: sectionId } : {};
    return api.get('/subsections', { params });
  },
  getSubsection: (subsectionId: number) => api.get(`/subsections/${subsectionId}`),
  createSubsection: (data: any) => api.post('/subsections', data),
  updateSubsection: (subsectionId: number, data: any) => api.put(`/subsections/${subsectionId}`, data),
  deleteSubsection: (subsectionId: number) => api.delete(`/subsections/${subsectionId}`),
};
