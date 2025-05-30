import axios from 'axios';
import { handleAPIError, APIError } from '../utils/errorHandler';

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
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add error handling interceptor with detailed error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle different types of errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
    api.put(`/auth/users/${userId}/status`, { is_active: isActive }),
  updateUserRole: (userId: number, role: string) =>
    api.put(`/auth/users/${userId}/role`, { role }),
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
