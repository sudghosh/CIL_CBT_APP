import axios from 'axios';
import { handleAPIError, APIError, logError } from '../utils/errorHandler';
import { DEV_TOKEN, isDevToken, isDevMode } from '../utils/devMode';
import { axiosWithRetry } from '../utils/apiRetry';
import { 
  mockOverallPerformance, 
  mockTopicPerformance, 
  mockDifficultyPerformance, 
  mockTimePerformance,
  getMockNextQuestion,
} from '../utils/mockData';
import {
  OverallSummary,
  TopicSummary,
  ChartTimePeriod,
  ApiTimePeriod
} from '../types';
import {
  DifficultyTrendsResponse,
  TopicMasteryResponse,
  RecommendationsResponse,
  PerformanceComparisonResponse
} from '../components/charts_legacy/types';

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

export const api = axios.create({
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
    }    if (error.response?.status === 403) {
      // Check if the error response contains a specific message
      const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.message || 
                           error.response?.data?.error ||
                           'You do not have permission to perform this action. Please contact an administrator for access if you need these features.';
      throw new APIError(errorMessage, 403);
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
    }),
    
  developmentLogin: () => 
    // Call the backend dev-login endpoint to get a real JWT token
    axiosWithRetry.post('/auth/dev-login', {}, {
      baseURL: API_URL,
      timeout: 8000, // 8 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      retries: 1, // Retry once  
      retryDelay: 500 // Start with 500ms delay
    }),
    
  getUsers: () => api.get('/auth/users'),
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
  getTemplates: () => api.get('/tests/templates'),  createTemplate: (data: any) => {
    console.log('Creating template with data:', JSON.stringify(data, null, 2));
      // Ensure data is in proper format for backend
    const normalizedData = { ...data };
    
    // Make sure template_name and test_type are always included
    if (!normalizedData.template_name) {
      normalizedData.template_name = `Template ${new Date().toISOString()}`;
    }
    
    if (!normalizedData.test_type) {
      normalizedData.test_type = "Practice";
    }
    
    // Handle both formats - ensure sections array exists even if legacy format
    if (!normalizedData.sections) {
      // If old format is used (paper_id directly), create sections array
      if (normalizedData.paper_id) {
        normalizedData.sections = [
          {
            paper_id: normalizedData.paper_id,
            section_id: normalizedData.section_id || null,
            subsection_id: normalizedData.subsection_id || null,
            question_count: normalizedData.question_count || 10
          }
        ];
      } else {
        // If neither format provided, initialize empty array
        normalizedData.sections = [];
      }
    }
      // Make sure we always have the sections array properly formatted for the backend
    if (normalizedData.sections && Array.isArray(normalizedData.sections)) {
      // Make sure each section uses the proper field names
      normalizedData.sections = normalizedData.sections.map((section: any) => ({
        paper_id: section.paper_id,
        section_id: section.section_id, // Backend will map this to section_id_ref
        subsection_id: section.subsection_id || null,
        question_count: section.question_count
      }));
    }
    
    // For debugging
    console.log('Sending normalized template data:', JSON.stringify(normalizedData, null, 2));
    
    return api.post('/tests/templates', normalizedData)
      .then(response => {
        console.log('Template creation successful. Response:', JSON.stringify(response.data, null, 2));
        return response;
      })
      .catch(error => {
        console.error('Template creation failed with error:', error);
        console.error('Request payload was:', JSON.stringify(normalizedData, null, 2));
        
        // Enhanced error handling
        if (error.response) {
          console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
          console.error('Error response status:', error.response.status);
          
          // Store section errors for UI reference
          if (error.response.status === 404 && error.response.data?.detail?.includes('Section with ID')) {
            try {
              const sectionMatch = error.response.data.detail.match(/Section with ID (\d+) not found in paper (\d+)/);
              if (sectionMatch && sectionMatch.length === 3) {
                const sectionId = parseInt(sectionMatch[1]);
                const paperId = parseInt(sectionMatch[2]);
                
                const sectionErrors = JSON.parse(sessionStorage.getItem('section_errors') || '{}');
                sectionErrors[`${paperId}-${sectionId}`] = 404;
                sessionStorage.setItem('section_errors', JSON.stringify(sectionErrors));
              }
            } catch (e) {
              console.error('Error storing section error information:', e);
            }
          }
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Error setting up request:', error.message);
        }
        throw error;
      });
  },  startTest: (templateId: number, durationMinutes: number = 60, adaptiveOptions?: { 
    adaptive: boolean; 
    adaptiveStrategy?: 'progressive' | 'easy-first' | 'hard-first' | 'random';
    questionCount?: number;
  }) => {
    console.log('Starting test with template ID:', templateId, 'and duration:', durationMinutes, 
                adaptiveOptions ? 'with adaptive options: ' + JSON.stringify(adaptiveOptions) : '');
    
    const payload: any = { 
      test_template_id: templateId,
      duration_minutes: durationMinutes 
    };
      // Add adaptive options if provided
    if (adaptiveOptions?.adaptive) {
      payload.is_adaptive = true;
      
      // Add question count limit for adaptive tests if provided
      if (adaptiveOptions.questionCount && adaptiveOptions.questionCount > 0) {
        console.log(`Setting adaptive test question limit to ${adaptiveOptions.questionCount}`);
        payload.max_questions = adaptiveOptions.questionCount;
      }
      
      if (adaptiveOptions.adaptiveStrategy) {
        // Map frontend strategies to backend expected values
        const strategyMap: Record<string, string> = {
          'progressive': 'adaptive',
          'easy-first': 'easy_to_hard',
          'hard-first': 'hard_to_easy',
          'random': 'random'
        };
        
        const mappedStrategy = strategyMap[adaptiveOptions.adaptiveStrategy] || 'adaptive';
        console.log(`Mapping adaptive strategy from '${adaptiveOptions.adaptiveStrategy}' to backend value '${mappedStrategy}'`);
        payload.adaptive_strategy = mappedStrategy;
      }
    }
    
    return api.post('/tests/start', payload)
    .then(response => {
      console.log('Test started successfully. Response:', JSON.stringify(response.data, null, 2));
      return response;
    })
    .catch(error => {
      console.error('Failed to start test:', error);
      throw error;
    });
  },

  abandonTest: (attemptId: number) => {
    console.log('Abandoning test with attempt ID:', attemptId);
    return api.post(`/tests/abandon/${attemptId}`)
      .then(response => {
        console.log('Test abandoned successfully. Response:', JSON.stringify(response.data, null, 2));
        return response;
      })
      .catch(error => {
        console.error('Failed to abandon test:', error);
        throw error;
      });
  },  getAvailableQuestionCount: (paperId: number, sectionId?: number, subsectionId?: number) => {
    // FALLBACK METHOD 
    // If we continue having issues with the backend endpoint, 
    // use an alternative approach by counting available questions
    const useFallbackMethod = true;  // Set to true to force using the fallback method
      // Fallback implementation that gets all questions and counts them client-side
    const fallbackMethod = async () => {
      console.log(`[API] Using fallback method to count questions for paper=${paperId}, section=${sectionId || 'all'}`);
        try {
        // Get all questions for this paper - using maximum allowed page size
        const response = await api.get('/questions', { 
          params: { 
            paper_id: paperId,
            section_id: sectionId,
            page: 1,
            page_size: 100  // Maximum allowed by backend
          } 
        });
        
        // If we have a total from the API response, use that directly
        if (response?.data?.total !== undefined) {
          const totalCount = response.data.total;
          console.log(`[API] Fallback method: API returned total count of ${totalCount}`);
          return totalCount;
        }
        
        // Count the items returned
        const items = response?.data?.items || [];
        const count = items.length;
        
        console.log(`[API] Fallback method found ${count} questions`);
        return count;      } catch (err: any) {
        console.error('[API] Fallback method failed:', err);
        
        // Store error information for UI to provide better feedback
        if (sectionId) {
          const cacheKey = `${paperId}-${sectionId}`;
          try {
            const knownErrors = JSON.parse(window.sessionStorage.getItem('section_errors') || '{}');
            
            if (err?.response?.status === 404) {
              // Section doesn't exist
              console.warn(`[API] Section ID ${sectionId} does not exist. Returning 0.`);
              knownErrors[cacheKey] = 404;
            } else if (err?.response?.status === 422) {
              // Validation error
              console.warn(`[API] Validation error for section ID ${sectionId}. Returning 0.`);
              knownErrors[cacheKey] = 422;
            }
            
            window.sessionStorage.setItem('section_errors', JSON.stringify(knownErrors));
          } catch (storageErr) {
            console.error('[API] Error storing section error info:', storageErr);
          }
        }
        
        return 0;
      }
    };
    
    // If using fallback method, don't even try the problematic endpoint
    if (useFallbackMethod) {
      return fallbackMethod();
    }
    
    // Original implementation as a backup
    // Validate input parameters before making the request
    if (!paperId || paperId <= 0) {
      console.error('[API] Invalid paperId provided to getAvailableQuestionCount:', paperId);
      return Promise.resolve(0);
    }
    
    const params: any = { paper_id: paperId };
    
    // Only include section_id if it's a valid value
    if (sectionId !== undefined && sectionId !== null && sectionId > 0) {
      params.section_id = sectionId;
    }
    
    // Only include subsection_id if it's a valid value
    if (subsectionId !== undefined && subsectionId !== null && subsectionId > 0) {
      params.subsection_id = subsectionId;
    }
    
    console.log(`[API] Fetching available count with params:`, params);
    
    return api.get(`/questions/available-count`, { params })
    .then(response => {
      if (response?.data?.count !== undefined) {
        console.log(`[API] Available count: ${response.data.count} for paper: ${paperId}, section: ${sectionId || 'all'}`);
        return response.data.count;
      }
      console.warn('[API] Question count response missing count field:', response.data);
      // If the regular endpoint fails, try our fallback
      return fallbackMethod();
    })
    .catch(error => {
      console.error('[API] Failed to get available question count:', error);
      
      // Check for specific error types
      if (error.response?.status === 422) {
        console.error('[API] Invalid input data for question count. Using fallback method.');
        return fallbackMethod();
      } else if (error.response?.status === 401) {
        console.error('[API] Authentication error when fetching question count.');
      } else {
        console.error('[API] Server error when fetching question count:', error.message);
      }
      
      // Use fallback for any error
      return fallbackMethod();
    });
  },
  submitAnswer: (attemptId: number, data: any) =>
    api.post(`/tests/submit/${attemptId}/answer`, data),
  finishTest: (attemptId: number) => api.post(`/tests/finish/${attemptId}`),
  getAttempts: () => api.get('/tests/attempts'),
  getQuestions: (attemptId: number) => api.get(`/tests/questions/${attemptId}`),
  getAttemptDetails: (attemptId: number) => api.get(`/tests/attempts/${attemptId}/details`),
  toggleMarkForReview: (attemptId: number, questionId: number) =>
    api.post(`/tests/${attemptId}/mark-review/${questionId}`),
  /**
   * Submit answer and get the next question in an adaptive test
   * @param attemptId - Test attempt ID
   * @param questionId - Current question ID
   * @param selectedOptionId - Selected answer option ID
   * @param timeTakenSeconds - Time taken to answer in seconds
   * @returns Promise with next question data or test completion status
   */
  submitAnswerAndGetNextQuestion: (
    attemptId: number, 
    questionId: number, 
    selectedOptionId: number, 
    timeTakenSeconds: number
  ) => {
    console.log(`Submitting answer for question ${questionId} and getting next question`);
    return api.post(`/tests/${attemptId}/next_question`, {
      question_id: questionId,
      selected_option_id: selectedOptionId,
      time_taken_seconds: timeTakenSeconds
    })
    .then(response => {
      console.log('Answer submitted, next question response:', JSON.stringify(response.data, null, 2));
      return response.data;
    })
    .catch(error => {
      console.error('Failed to submit answer and get next question:', error);      console.warn('Using mock data for next question');
      
      // Use mock data as fallback
      // Calculate mock difficulty based on question ID (for testing only)
      let mockDifficulty = 'Medium';
      if (questionId % 3 === 0) mockDifficulty = 'Hard';
      else if (questionId % 3 === 1) mockDifficulty = 'Easy';
      
      const nextQuestion = getMockNextQuestion(questionId, mockDifficulty);
      
      // Create a response that matches the expected format
      const mockResponse: any = {};
      
      if (nextQuestion) {
        mockResponse.next_question = nextQuestion;
        mockResponse.time_taken_seconds = timeTakenSeconds;
        mockResponse.is_correct = selectedOptionId === nextQuestion.options[0].id;
      } else {
        mockResponse.test_completed = true;
        mockResponse.score = 75; // Mock score
      }
      
      return Promise.resolve(mockResponse);
    });
  },
};

/**
 * API functions for user performance metrics and dashboard data
 */
export const performanceAPI = {
  /**
   * Get a user's overall performance summary
   * @returns Promise with UserOverallSummary data
   */
  getOverallPerformance: () => {
    const endpoint = '/performance/overall';
    return api.get(endpoint)
      .then(response => {
        console.log('Overall performance retrieved:', JSON.stringify(response.data, null, 2));
        return response.data;
      })
      .catch(error => {
        console.error('Failed to get overall performance:', error);
        console.warn('Using mock overall performance data');
        return Promise.resolve(mockOverallPerformance);
      });
  },
  
  /**
   * Get a user's topic-specific performance data
   * @param filters - Optional filters to limit results by paper, section, or difficulty
   * @returns Promise with array of UserTopicSummary data
   */
  getTopicPerformance: (filters?: {
    paperId?: number;
    sectionId?: number;
    difficulty?: string;
  }) => {
    const endpoint = '/performance/topics';
    // Build query parameters
    const params: any = {};
    if (filters?.paperId) params.paper_id = filters.paperId;
    if (filters?.sectionId) params.section_id = filters.sectionId;
    if (filters?.difficulty) params.difficulty = filters.difficulty;
    return api.get(endpoint, { params })
      .then(response => {
        console.log('Topic performance retrieved:', JSON.stringify(response.data, null, 2));
        return response.data;
      })
      .catch(error => {
        console.error('Failed to get topic performance:', error);
        console.warn('Using mock topic performance data');
        return Promise.resolve(mockTopicPerformance);
      });
  },
  
  /**
   * Get difficulty-based performance breakdown
   * @returns Promise with difficulty performance data
   */
  getDifficultyPerformance: () => {
    const endpoint = '/performance/difficulty';
    return api.get(endpoint)
      .then(response => {
        console.log('Difficulty performance retrieved:', JSON.stringify(response.data, null, 2));
        return response.data;
      })
      .catch(error => {
        console.error('Failed to get difficulty performance:', error);
        console.warn('Using mock difficulty performance data');
        return Promise.resolve(mockDifficultyPerformance);
      });
  },
  
  /**
   * Get time-based performance metrics
   * @param filters - Optional filters to limit results
   * @returns Promise with time-based performance data
   */
  getTimePerformance: (filters?: {
    paperId?: number;
    difficulty?: string;
    timePeriod?: 'week' | 'month' | 'year';
  }) => {
    const endpoint = '/performance/time';
    // Build query parameters
    const params: any = {};
    if (filters?.paperId) params.paper_id = filters.paperId;
    if (filters?.difficulty) params.difficulty = filters.difficulty;
    if (filters?.timePeriod) params.time_period = filters.timePeriod;
    return api.get(endpoint, { params })
      .then(response => {
        console.log('Time performance retrieved:', JSON.stringify(response.data, null, 2));
        return response.data;
      })
      .catch(error => {
        console.error('Failed to get time performance:', error);
        console.warn('Using mock time performance data');
        return Promise.resolve(mockTimePerformance);
      });
  },
  /**
   * Get difficulty trend visualization data
   * Shows how difficulty ratings change over time
   * @param filters - Optional filters to limit results
   * @returns Promise with difficulty trend data for visualizations
   */  getDifficultyTrends: (filters?: {
    timePeriod?: ApiTimePeriod;
  }): Promise<DifficultyTrendsResponse> => {
    // Build query parameters
    const params: any = {};
    if (filters?.timePeriod) params.time_period = filters.timePeriod;
    
    return api.get<DifficultyTrendsResponse>('/performance/difficulty-trends', { params })
      .then(response => {
        console.log('Difficulty trends retrieved:', JSON.stringify(response.data, null, 2));
        return response.data;
      }).catch(error => {
        console.error('Failed to get difficulty trends:', error);
        // If 403 Forbidden, return specific message
        if (error.response?.status === 403) {
          return {
            status: 'error',
            message: 'You do not have access to personalized difficulty trend data. Please contact an administrator.',
            data: null
          };
        }        // Return empty data structure
        return {
          status: 'error',
          message: 'Could not retrieve difficulty trends',
          data: { overall: [], by_topic: {} }
        };
      });
  },
    /**
   * Get topic mastery progression data for visualizations
   * Shows how a user's mastery of different topics has evolved over time
   * @returns Promise with topic mastery data
   */  getTopicMastery: (): Promise<TopicMasteryResponse> => {
    return api.get<TopicMasteryResponse>('/performance/topic-mastery')
      .then(response => {
        console.log('Topic mastery retrieved:', JSON.stringify(response.data, null, 2));
        return response.data;
      })
      .catch(error => {
        console.error('Failed to get topic mastery:', error);
        // If 403 Forbidden, return specific message
        if (error.response?.status === 403) {
          return {
            status: 'error',
            message: 'You do not have access to personalized topic mastery data. Please contact an administrator.',
            data: null
          };
        }
        // Return empty data structure
        return {
          status: 'error',
          message: 'Could not retrieve topic mastery data',
          data: { topic_mastery: {}, mastery_progression: [] }
        };
      });
  },
    /**
   * Get personalized test recommendations
   * Provides recommendations for topics to focus on, areas for improvement,
   * and suggested questions to practice
   * @param maxRecommendations - Maximum number of recommendations to return
   * @returns Promise with recommendations data
   */  getRecommendations: (maxRecommendations: number = 5): Promise<RecommendationsResponse> => {
    return api.get<RecommendationsResponse>('/performance/recommendations', { params: { max_recommendations: maxRecommendations } })
      .then(response => {
        console.log('Recommendations retrieved:', JSON.stringify(response.data, null, 2));
        return response.data;
      })
      .catch(error => {
        console.error('Failed to get recommendations:', error);
        // If 403 Forbidden, return specific message
        if (error.response?.status === 403) {
          return {
            status: 'error',
            message: 'You do not have access to personalized recommendations. Please contact an administrator.',
            data: null
          } as RecommendationsResponse;
        }
        // Return empty data structure
        return {
          status: 'error',
          message: 'Could not retrieve recommendations',
          data: {
            recommendations: [],
            insights: []
          }
        } as RecommendationsResponse;
      });
  },
    /**
   * Get performance comparison data
   * Compares user's performance against overall averages
   * @returns Promise with comparison data
   */  getPerformanceComparison: (): Promise<PerformanceComparisonResponse> => {
    return api.get<PerformanceComparisonResponse>('/performance/performance-comparison')
      .then(response => {
        console.log('Performance comparison retrieved:', JSON.stringify(response.data, null, 2));
        return response.data;
      })
      .catch(error => {
        console.error('Failed to get performance comparison:', error);
        // If 403 Forbidden, return specific message
        if (error.response?.status === 403) {
          return {
            status: 'error',
            message: 'You do not have access to personalized performance comparison data. Please contact an administrator.',
            data: null
          } as PerformanceComparisonResponse;
        }
        // Return empty data structure
        return {
          status: 'error',
          message: 'Could not retrieve performance comparison data',
          data: {
            metrics: [],
            difficulty_comparison: {
              easy: { user_accuracy: 0, average_accuracy: 0, user_time: 0, average_time: 0 },
              medium: { user_accuracy: 0, average_accuracy: 0, user_time: 0, average_time: 0 },
              hard: { user_accuracy: 0, average_accuracy: 0, user_time: 0, average_time: 0 }
            }
          }
        } as PerformanceComparisonResponse;
      });
  }
};

export const papersAPI = {
  /**
   * Get all available papers with their sections
   * @param params - Optional pagination parameters
   */
  getPapers: async (params?: { page?: number; page_size?: number }) => {
    try {
      // First try to fetch papers from the API
      const url = params 
        ? `${API_URL}/api/papers/?page=${params.page || 1}&page_size=${params.page_size || 10}` 
        : `${API_URL}/api/papers/`;
      
      const response = await axiosWithRetry.get(url);
      return { data: response.data, success: true };
    } catch (error) {
      // Log and handle specific API errors
      const apiError = handleAPIError(error as Error);
      logError('Failed to fetch papers', apiError);
      
      // Use mock data in dev mode if API is not available
      if (isDevMode()) {
        console.warn('Using mock papers data in development mode');
        return {
          data: {
            items: [
              {
                paper_id: 1,
                paper_name: "Mock Paper 1",
                description: "Sample paper for testing",
                total_marks: 100,
                active: true,
                sections: [
                  { section_id: 1, section_name: "General Knowledge", paper_id: 1 },
                  { section_id: 2, section_name: "Reasoning", paper_id: 1 }
                ]
              },
              {
                paper_id: 2,
                paper_name: "Mock Paper 2",
                description: "Another sample paper",
                total_marks: 150,
                active: true,
                sections: [
                  { section_id: 3, section_name: "Mathematics", paper_id: 2 },
                  { section_id: 4, section_name: "Computer Science", paper_id: 2 }
                ]
              }
            ],
            total: 2
          },
          success: true
        };
      }
      
      throw apiError;
    }
  },

  /**
   * Create a new paper
   * @param paperData - Paper data to create
   */
  createPaper: async (paperData: any) => {
    try {
      const response = await axiosWithRetry.post(`${API_URL}/api/papers/`, paperData);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to create paper', apiError);
      throw apiError;
    }
  },

  /**
   * Update an existing paper
   * @param paperId - ID of the paper to update
   * @param paperData - Updated paper data
   */
  updatePaper: async (paperId: number, paperData: any) => {
    try {
      const response = await axiosWithRetry.put(`${API_URL}/api/papers/${paperId}/`, paperData);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to update paper', apiError);
      throw apiError;
    }
  },

  /**
   * Delete a paper
   * @param paperId - ID of the paper to delete
   */
  deletePaper: async (paperId: number) => {
    try {
      const response = await axiosWithRetry.delete(`${API_URL}/api/papers/${paperId}/`);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to delete paper', apiError);
      throw apiError;
    }
  },

  /**
   * Activate a paper
   * @param paperId - ID of the paper to activate
   */  activatePaper: async (paperId: number) => {
    try {
      // Using the improved axiosWithRetry that properly includes auth tokens
      const response = await axiosWithRetry.post(`${API_URL}/api/papers/${paperId}/activate/`, {});
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to activate paper', apiError);
      throw apiError;
    }
  },

  /**
   * Deactivate a paper
   * @param paperId - ID of the paper to deactivate
   */  deactivatePaper: async (paperId: number) => {
    try {
      // Using the improved axiosWithRetry that properly includes auth tokens
      const response = await axiosWithRetry.post(`${API_URL}/api/papers/${paperId}/deactivate/`, {});
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to deactivate paper', apiError);
      throw apiError;
    }
  },

  /**
   * Create a sample paper for testing
   */
  createSamplePaper: async () => {
    try {
      const response = await axiosWithRetry.post(`${API_URL}/api/papers/create-sample/`, {});
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to create sample paper', apiError);
      throw apiError;
    }
  }
};

/**
 * API functions for sections management
 */
export const sectionsAPI = {
  /**
   * Get sections by paper ID
   * @param paperId - ID of the paper
   */
  getSectionsByPaperId: async (paperId: number) => {
    try {
      const response = await axiosWithRetry.get(`${API_URL}/api/papers/${paperId}/sections/`);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to fetch sections', apiError);
      
      // Use mock data in dev mode
      if (isDevMode()) {
        console.warn('Using mock sections data in development mode');
        return {
          data: [
            { section_id: 1, section_name: "General Knowledge", paper_id: paperId },
            { section_id: 2, section_name: "Reasoning", paper_id: paperId }
          ],
          success: true
        };
      }
      
      throw apiError;
    }
  },

  /**
   * Create a new section
   * @param sectionData - Section data to create
   */
  createSection: async (sectionData: any) => {
    try {
      const response = await axiosWithRetry.post(`${API_URL}/api/sections/`, sectionData);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to create section', apiError);
      throw apiError;
    }
  },

  /**
   * Update an existing section
   * @param sectionId - ID of the section to update
   * @param sectionData - Updated section data
   */
  updateSection: async (sectionId: number, sectionData: any) => {
    try {
      const response = await axiosWithRetry.put(`${API_URL}/api/sections/${sectionId}/`, sectionData);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to update section', apiError);
      throw apiError;
    }
  },

  /**
   * Delete a section
   * @param sectionId - ID of the section to delete
   */
  deleteSection: async (sectionId: number) => {
    try {
      const response = await axiosWithRetry.delete(`${API_URL}/api/sections/${sectionId}/`);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to delete section', apiError);
      throw apiError;
    }
  }
};

/**
 * API functions for subsections management
 */
export const subsectionsAPI = {
  /**
   * Get subsections by section ID
   * @param sectionId - ID of the section
   */
  getSubsections: async (sectionId: number) => {
    try {
      const response = await axiosWithRetry.get(`${API_URL}/api/sections/${sectionId}/subsections/`);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to fetch subsections', apiError);
      
      // Use mock data in dev mode
      if (isDevMode()) {
        console.warn('Using mock subsections data in development mode');
        return {
          data: [
            { subsection_id: 1, subsection_name: "Basic", section_id: sectionId },
            { subsection_id: 2, subsection_name: "Advanced", section_id: sectionId }
          ],
          success: true
        };
      }
      
      throw apiError;
    }
  },

  /**
   * Create a new subsection
   * @param subsectionData - Subsection data to create
   */
  createSubsection: async (subsectionData: any) => {
    try {
      const response = await axiosWithRetry.post(`${API_URL}/api/subsections/`, subsectionData);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to create subsection', apiError);
      throw apiError;
    }
  },

  /**
   * Update an existing subsection
   * @param subsectionId - ID of the subsection to update
   * @param subsectionData - Updated subsection data
   */
  updateSubsection: async (subsectionId: number, subsectionData: any) => {
    try {
      const response = await axiosWithRetry.put(`${API_URL}/api/subsections/${subsectionId}/`, subsectionData);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to update subsection', apiError);
      throw apiError;
    }
  },

  /**
   * Delete a subsection
   * @param subsectionId - ID of the subsection to delete
   */
  deleteSubsection: async (subsectionId: number) => {
    try {
      const response = await axiosWithRetry.delete(`${API_URL}/api/subsections/${subsectionId}/`);
      return { data: response.data, success: true };
    } catch (error) {
      const apiError = handleAPIError(error as Error);
      logError('Failed to delete subsection', apiError);
      throw apiError;
    }
  }
};


// Default export for API client
export default api;
