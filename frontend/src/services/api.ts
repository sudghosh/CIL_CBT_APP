import axios from 'axios';
import { handleAPIError } from '../utils/errorHandler';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

// Add error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw handleAPIError(error);
  }
);

// Auth API
export const authAPI = {
  googleLogin: (tokenInfo: any) => api.post('/auth/google-callback', tokenInfo),
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
  createQuestion: (data: any) => api.post('/questions', data),
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
};

// Papers API
export const papersAPI = {
  getPapers: () => api.get('/papers'),
  createPaper: (data: any) => api.post('/papers', data),
  activatePaper: (paperId: number) => api.put(`/papers/${paperId}/activate`),
  deactivatePaper: (paperId: number) => api.put(`/papers/${paperId}/deactivate`),
};
