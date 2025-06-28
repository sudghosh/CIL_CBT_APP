import axios from 'axios';
import { performanceAPI } from '../api';
import { APIError } from '../../utils/errorHandler';
import { createApiErrorResponse } from '../../__tests__/utils/test-utils';

// Mock axios for all tests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

describe('performanceAPI', () => {
  // Mock API instance
  let mockApi: any;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get the created axios instance
    mockApi = axios.create();
  });
  
  describe('getRecommendations', () => {
    it('should handle successful response', async () => {
      // Mock successful response
      const mockData = {
        recommendations: [
          { id: 1, topic: 'Math', description: 'Practice more algebra problems' }
        ]
      };
      mockApi.get.mockResolvedValueOnce({ data: mockData });
      
      // Call the function
      const result = await performanceAPI.getRecommendations();
      
      // Assertions
      expect(mockApi.get).toHaveBeenCalledWith('/performance/recommendations', expect.any(Object));
      expect(result).toEqual(mockData);
    });
    
    it('should handle 403 error with proper error structure', async () => {
      // Mock 403 error response
      const errorMessage = 'You do not have access to personalized recommendations';
      mockApi.get.mockRejectedValueOnce(createApiErrorResponse(403, undefined, errorMessage));
      
      // Call the function
      const result = await performanceAPI.getRecommendations();
      
      // Assertions
      expect(mockApi.get).toHaveBeenCalledWith('/performance/recommendations', expect.any(Object));
      expect(result).toEqual({
        status: 'error',
        message: errorMessage,
        data: null
      });
    });
  });
  
  describe('getPerformanceComparison', () => {
    it('should handle successful response', async () => {
      // Mock successful response
      const mockData = {
        user_score: 85,
        average_score: 75
      };
      mockApi.get.mockResolvedValueOnce({ data: mockData });
      
      // Call the function
      const result = await performanceAPI.getPerformanceComparison();
      
      // Assertions
      expect(mockApi.get).toHaveBeenCalledWith('/performance/performance-comparison');
      expect(result).toEqual(mockData);
    });
    
    it('should handle 403 error with proper error structure', async () => {
      // Mock 403 error response
      const errorMessage = 'You do not have access to performance comparison data';
      mockApi.get.mockRejectedValueOnce(createApiErrorResponse(403, undefined, errorMessage));
      
      // Call the function
      const result = await performanceAPI.getPerformanceComparison();
      
      // Assertions
      expect(mockApi.get).toHaveBeenCalledWith('/performance/performance-comparison');
      expect(result).toEqual({
        status: 'error',
        message: errorMessage,
        data: null
      });
    });
  });
  
  describe('getTopicMastery', () => {
    it('should handle successful response', async () => {
      // Mock successful response
      const mockData = {
        topic_mastery: {
          'Math': 0.8,
          'Science': 0.6
        },
        mastery_progression: [
          { date: '2023-01-01', mastery: 0.5 },
          { date: '2023-02-01', mastery: 0.7 }
        ]
      };
      mockApi.get.mockResolvedValueOnce({ data: mockData });
      
      // Call the function
      const result = await performanceAPI.getTopicMastery();
      
      // Assertions
      expect(mockApi.get).toHaveBeenCalledWith('/performance/topic-mastery');
      expect(result).toEqual(mockData);
    });
    
    it('should handle 403 error with proper error structure', async () => {
      // Mock 403 error response
      const errorMessage = 'You do not have access to topic mastery data';
      mockApi.get.mockRejectedValueOnce(createApiErrorResponse(403, undefined, errorMessage));
      
      // Call the function
      const result = await performanceAPI.getTopicMastery();
      
      // Assertions
      expect(mockApi.get).toHaveBeenCalledWith('/performance/topic-mastery');
      expect(result).toEqual({
        status: 'error',
        message: errorMessage,
        data: null
      });
    });
  });
  
  describe('getDifficultyTrends', () => {
    it('should handle successful response', async () => {
      // Mock successful response
      const mockData = {
        overall: [
          { date: '2023-01-01', difficulty: 'Easy', count: 10 },
          { date: '2023-01-01', difficulty: 'Medium', count: 5 }
        ],
        by_topic: {
          'Math': [
            { date: '2023-01-01', difficulty: 'Easy', count: 5 },
            { date: '2023-01-01', difficulty: 'Hard', count: 3 }
          ]
        }
      };
      mockApi.get.mockResolvedValueOnce({ data: mockData });
      
      // Call the function with filter
      const result = await performanceAPI.getDifficultyTrends({ timePeriod: 'month' });
      
      // Assertions
      expect(mockApi.get).toHaveBeenCalledWith('/performance/difficulty-trends', { 
        params: { time_period: 'month' } 
      });
      expect(result).toEqual(mockData);
    });
    
    it('should handle 403 error with proper error structure', async () => {
      // Mock 403 error response
      const errorMessage = 'You do not have access to difficulty trends data';
      mockApi.get.mockRejectedValueOnce(createApiErrorResponse(403, undefined, errorMessage));
      
      // Call the function
      const result = await performanceAPI.getDifficultyTrends();
      
      // Assertions
      expect(mockApi.get).toHaveBeenCalledWith('/performance/difficulty-trends', { params: {} });
      expect(result).toEqual({
        status: 'error',
        message: errorMessage,
        data: null
      });
    });
  });
});
