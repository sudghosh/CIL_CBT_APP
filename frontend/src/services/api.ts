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
  // Disable withCredentials for CORS with wildcard origin (*)
  withCredentials: false,
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
  getQuestions: (params?: { paper_id?: number; section_id?: number; page?: number; page_size?: number }) =>
    api.get('/questions', { params }),
  getQuestion: (id: number) => api.get(`/questions/${id}`),
  createQuestion: (data: QuestionData) => api.post('/questions', data),  uploadQuestions: (file: File) => {
    console.log(`Preparing to upload file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    
    // Additional validation to prevent empty files
    if (file.size === 0) {
      console.error('Attempted to upload an empty file');
      return Promise.reject(new Error('File is empty. Please ensure the file contains data.'));
    }
    
    // Read and log a small sample of the file to check content (for debugging)
    const debugFileCheck = async () => {
      try {
        // For text files only (CSV)
        if (file.type === 'text/csv') {
          const sample = await file.slice(0, 200).text();
          console.log('CSV file content sample:', sample);
          
          // Validate basic structure
          if (!sample.includes('question_text') || !sample.includes('option_0')) {
            console.warn('Warning: CSV may not contain required headers');
          }
        }
      } catch (e) {
        console.error('Debug file check failed:', e);
      }
    };
    
    // Run the debug check
    debugFileCheck();
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Debug: Log form data contents
    console.log('Form data entries:');
    // Use Array.from to avoid iterator issues with older TypeScript targets
    Array.from(formData.entries()).forEach(entry => {
      console.log(`- ${entry[0]}: ${entry[1] instanceof File ? `File(${(entry[1] as File).name})` : entry[1]}`);
    });
    
    // Set specific options for file uploads
    return api.post('/questions/upload', formData, {
      headers: { 
        // Let the browser set the Content-Type with boundary automatically
        // 'Content-Type' will be set automatically with the correct boundary by the browser
        'Accept': 'application/json'
      },
      // Longer timeout for large file uploads
      timeout: 120000, // 120 seconds
      // Add progress monitoring for large files
      onUploadProgress: (progressEvent) => {
        const total = progressEvent.total || 0;
        console.log(`Upload progress: ${total > 0 ? Math.round((progressEvent.loaded * 100) / total) : 0}%`);
      },
      validateStatus: function (status) {
        // Additional detailed logging for error status codes
        if (status === 422) {
          console.warn('Upload validation failed with 422 - the file likely has content that fails validation rules');
        } else if (status === 400) {
          console.warn('Upload validation failed with 400 - the file likely has missing required columns or incorrect structure');
        } else if (status === 500) {
          console.error('Server error during file upload - check server logs for details');
        }
        // Return default validation (status >= 200 && status < 300)
        return status >= 200 && status < 300;
      },
      // Capture errors during the request lifecycle
      transformRequest: [
        function (data, headers) {
          if (data instanceof FormData) {
            console.log('Sending FormData with file in transformRequest');
            
            // Clear any existing Content-Type to let the browser set the correct one with boundary
            if (headers && headers['Content-Type']) {
              delete headers['Content-Type'];
            }
          }
          return data;
        }
      ],
      // Custom error handling for upload-specific issues
      transformResponse: [
        function(data) {
          // Try to parse the response as JSON
          try {
            const parsedData = JSON.parse(data);
            
            // Look for specific database errors like foreign key violations
            if (parsedData.detail && typeof parsedData.detail === 'string') {
              const errorDetail = parsedData.detail;
              
              // Check for foreign key violation on paper_id
              if (errorDetail.includes('violates foreign key constraint') && 
                  errorDetail.includes('questions_paper_id_fkey') &&
                  errorDetail.includes('Key (paper_id)')) {
                
                // Extract the paper_id from the error message
                const paperIdMatch = errorDetail.match(/Key \(paper_id\)=\((\d+)\)/);
                const paperId = paperIdMatch ? paperIdMatch[1] : 'unknown';
                
                // Enhance error message
                parsedData.detail = `The paper with ID ${paperId} does not exist in the database. Please create this paper first or update your CSV to use an existing paper ID.`;
                parsedData.suggestion = "Run the create_sample_paper.ps1 script to create a sample paper with ID 1";
                parsedData.errorType = "PAPER_NOT_FOUND";
              }
            }
            
            return parsedData;
          } catch (e) {
            // If it's not valid JSON, return the original string
            return data;
          }
        }
      ]
    }).catch(error => {
      // Additional error processing for constraint violations
      if (error.response && error.response.data && error.response.data.detail) {
        // Handle foreign key errors
        if (error.response.data.detail.includes('foreign key constraint')) {
          // This is handled in transformResponse, but adding extra check here
          console.error('Database constraint violation:', error.response.data.detail);
        }
      }
      
      throw error; // Re-throw to maintain error chain
    });
  },
  updateQuestion: (id: number, data: any) => api.put(`/questions/${id}`, data),
  deactivateQuestion: (id: number) => api.put(`/questions/${id}/deactivate`),
  deleteQuestion: (id: number) => {
    console.log(`[DEBUG][API] Initiating DELETE request for question ID: ${id}`);
    return api.delete(`/questions/${id}`)
      .then(response => {
        console.log(`[DEBUG][API] DELETE question ${id} succeeded:`, response);
        return response;
      })
      .catch(error => {
        console.error(`[DEBUG][API] DELETE question ${id} failed:`, error);
        console.error(`[DEBUG][API] Error details:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
        throw error;
      });
  },
  downloadAllQuestions: () =>
    api.get('/questions/admin/download-all', { responseType: 'blob' }),
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
  getPapers: (params?: { page?: number; page_size?: number }) =>
    api.get('/papers', { params }),
  getPaper: (paperId: number) => api.get(`/papers/${paperId}`),
  createPaper: (data: any) => api.post('/papers', data),
  updatePaper: (paperId: number, data: any) => api.put(`/papers/${paperId}`, data),
  deletePaper: (paperId: number) => api.delete(`/papers/${paperId}`),
  activatePaper: (paperId: number) => api.put(`/papers/${paperId}/activate`),
  deactivatePaper: (paperId: number) => api.put(`/papers/${paperId}/deactivate`),
  // New function to create a sample paper with ID 1 for testing
  createSamplePaper: () => api.post('/papers', {
    paper_id: 1, // Request specific ID
    title: 'Sample Test Paper',
    description: 'This is a sample paper for testing question uploads',
    time_limit_minutes: 60,
    passing_percentage: 60,
    is_active: true,
    // The backend will use the authenticated user as created_by_user_id
  }),
};

// Sections API
export const sectionsAPI = {
  getSections: (params?: { paper_id?: number; page?: number; page_size?: number }) =>
    api.get('/sections', { params }),
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
