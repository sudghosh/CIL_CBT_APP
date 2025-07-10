import { aiAnalyticsService } from '../aiAnalyticsService';
import { TrendAnalysisRequest, TrendAnalysisResponse } from '../aiAnalyticsService';
import { apiKeyService } from '../apiKeyService';
import { api } from '../api';

// Mock dependencies
jest.mock('../apiKeyService');
jest.mock('../api');

const mockedApiKeyService = apiKeyService as jest.Mocked<typeof apiKeyService>;
const mockedApi = api as jest.Mocked<typeof api>;

describe('AIAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleRequest: TrendAnalysisRequest = {
    userId: 1,
    performanceData: [
      { date: '2023-01-01', score: 85 },
      { date: '2023-01-02', score: 92 }
    ],
    timeframe: 'week',
    analysisType: 'overall'
  };

  const sampleResponse: TrendAnalysisResponse = {
    insights: [
      {
        type: 'trend',
        title: 'Performance Improving',
        content: 'Your scores show an upward trend',
        confidence: 0.8,
        timestamp: new Date().toISOString()
      }
    ],
    trendData: [
      { date: '2023-01-01', score: 85 },
      { date: '2023-01-02', score: 92 }
    ],
    recommendations: ['Focus on challenging topics']
  };

  describe('analyzeTrends', () => {
    it('should successfully analyze trends using backend API', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: sampleResponse });

      const result = await aiAnalyticsService.analyzeTrends(sampleRequest);

      expect(result).toEqual(sampleResponse);
      expect(mockedApi.post).toHaveBeenCalledWith('/ai/analyze-trends', {
        timeframe: sampleRequest.timeframe,
        analysisType: sampleRequest.analysisType,
        performanceData: sampleRequest.performanceData
      });
    });

    it('should fallback to Google AI when backend fails', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Backend failed'));
      mockedApiKeyService.getApiKey.mockResolvedValueOnce({
        success: true,
        apiKey: 'test-google-key',
        keyType: 'google',
        usingFallback: false
      });

      // Mock global fetch for Google AI API
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(sampleResponse)
              }]
            }
          }]
        })
      });

      const result = await aiAnalyticsService.analyzeTrends(sampleRequest);

      expect(result.fallbackProvider).toBe('Google AI (direct)');
      expect(mockedApiKeyService.getApiKey).toHaveBeenCalledWith({
        keyType: 'google',
        enableFallback: false
      });
    });

    it('should handle all providers failing', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Backend failed'));
      mockedApiKeyService.getApiKey.mockResolvedValue({
        success: false,
        error: 'No API key',
        keyType: 'google',
        usingFallback: false
      });

      await expect(aiAnalyticsService.analyzeTrends(sampleRequest))
        .rejects.toThrow('All AI providers failed');
    });
  });

  describe('generateInsights', () => {
    it('should generate insights successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: sampleResponse });

      const result = await aiAnalyticsService.generateInsights(sampleRequest);

      expect(result).toEqual(sampleResponse.insights);
    });

    it('should handle errors when generating insights', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('API failed'));
      mockedApiKeyService.getApiKey.mockResolvedValue({
        success: false,
        error: 'No API key',
        keyType: 'google',
        usingFallback: false
      });

      await expect(aiAnalyticsService.generateInsights(sampleRequest))
        .rejects.toThrow();
    });
  });

  describe('getQuestionRecommendations', () => {
    it('should get recommendations successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: sampleResponse });

      const result = await aiAnalyticsService.getQuestionRecommendations(sampleRequest);

      expect(result).toEqual(sampleResponse.recommendations);
    });

    it('should handle errors when getting recommendations', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('API failed'));
      mockedApiKeyService.getApiKey.mockResolvedValue({
        success: false,
        error: 'No API key',
        keyType: 'google',
        usingFallback: false
      });

      await expect(aiAnalyticsService.getQuestionRecommendations(sampleRequest))
        .rejects.toThrow();
    });
  });

  describe('checkAIAvailability', () => {
    it('should return true when AI is available', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { available: true } });

      const result = await aiAnalyticsService.checkAIAvailability();

      expect(result).toBe(true);
    });

    it('should return false when AI is not available', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('AI not available'));
      mockedApiKeyService.getApiKey.mockResolvedValue({
        success: false,
        error: 'No API key',
        keyType: 'google',
        usingFallback: false
      });

      const result = await aiAnalyticsService.checkAIAvailability();

      expect(result).toBe(false);
    });
  });

  describe('Multi-provider fallback system', () => {
    it('should attempt multiple providers in order', async () => {
      // Mock backend failure
      mockedApi.post.mockRejectedValueOnce(new Error('Backend failed'));

      // Mock Google AI success
      mockedApiKeyService.getApiKey.mockResolvedValueOnce({
        success: true,
        apiKey: 'test-google-key',
        keyType: 'google',
        usingFallback: false
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(sampleResponse)
              }]
            }
          }]
        })
      });

      const result = await aiAnalyticsService.analyzeTrends(sampleRequest);
      
      expect(result.fallbackProvider).toBe('Google AI (direct)');
      expect(mockedApiKeyService.getApiKey).toHaveBeenCalledWith({
        keyType: 'google',
        enableFallback: false
      });
    });

    it('should handle timeout scenarios', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Request timeout'));
      mockedApiKeyService.getApiKey.mockResolvedValue({
        success: false,
        error: 'No API key',
        keyType: 'google',
        usingFallback: false
      });

      await expect(aiAnalyticsService.analyzeTrends(sampleRequest))
        .rejects.toThrow('All AI providers failed');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty performance data', async () => {
      const emptyRequest = {
        ...sampleRequest,
        performanceData: []
      };

      mockedApi.post.mockResolvedValueOnce({ data: sampleResponse });

      const result = await aiAnalyticsService.analyzeTrends(emptyRequest);
      
      expect(result).toBeDefined();
    });

    it('should handle malformed response data', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { invalid: 'data' } });

      // Should handle gracefully
      await expect(aiAnalyticsService.analyzeTrends(sampleRequest))
        .resolves.toBeDefined();
    });

    it('should handle network interruptions', async () => {
      const networkError = new Error('Network error');
      mockedApi.post.mockRejectedValueOnce(networkError);
      mockedApiKeyService.getApiKey.mockResolvedValue({
        success: false,
        error: 'No API key',
        keyType: 'google',
        usingFallback: false
      });

      await expect(aiAnalyticsService.analyzeTrends(sampleRequest))
        .rejects.toThrow('All AI providers failed');
    });
  });

  describe('Performance scenarios', () => {
    it('should handle concurrent requests', async () => {
      mockedApi.post.mockResolvedValue({ data: sampleResponse });

      const promises = [
        aiAnalyticsService.analyzeTrends(sampleRequest),
        aiAnalyticsService.generateInsights(sampleRequest),
        aiAnalyticsService.getQuestionRecommendations(sampleRequest)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});
