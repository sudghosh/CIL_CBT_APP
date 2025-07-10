import { ApiKeyType, ApiKeyRetrievalOptions } from '../types/apiKey';
import { apiKeyService } from './apiKeyService';
import { api } from './api';

export interface PerformanceDataPoint {
  date: string;
  score: number;
  topic?: string;
  difficulty?: number;
  timeSpent?: number;
  questionCount?: number;
}

export interface AITrendInsight {
  type: 'trend' | 'insight' | 'recommendation';
  title: string;
  content: string;
  confidence: number;
  timestamp: string;
  data?: any;
}

export interface TrendAnalysisRequest {
  userId: number;
  performanceData: PerformanceDataPoint[];
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  analysisType: 'overall' | 'topic' | 'difficulty' | 'time';
}

export interface TrendAnalysisResponse {
  insights: AITrendInsight[];
  trendData: PerformanceDataPoint[];
  predictions?: PerformanceDataPoint[];
  recommendations: string[];
  fallbackProvider?: string; // Indicates which provider was used if fallback occurred
}

class AIAnalyticsService {
  private readonly GOOGLE_AI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  private readonly OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly A4F_ENDPOINT = 'https://api.a4f.co/v1/chat/completions';

  /**
   * Analyzes performance trends using AI with multi-provider fallback system:
   * 1. Try backend first (existing implementation)
   * 2. If backend fails, try Google AI directly
   * 3. If Google fails, try OpenRouter
   * 4. If OpenRouter fails, try A4F as final fallback
   */
  async analyzeTrends(request: TrendAnalysisRequest): Promise<TrendAnalysisResponse> {
    let lastError: Error | null = null;

    try {
      // Step 1: Try backend AI service first
      console.log('🔄 Step 1: Trying backend AI service...');
      const response = await api.post('/ai/analyze-trends', {
        timeframe: request.timeframe,
        analysisType: request.analysisType,
        performanceData: request.performanceData
      });

      console.log('✅ Backend AI service successful');
      return response.data;

    } catch (backendError) {
      console.warn('⚠️ Backend AI service failed, trying fallbacks...', backendError);
      lastError = backendError instanceof Error ? backendError : new Error('Backend failed');

      // Step 2: Try Google AI directly if backend fails
      try {
        console.log('🔄 Step 2: Trying Google AI directly...');
        const googleResult = await apiKeyService.getApiKey({
          keyType: 'google' as ApiKeyType,
          enableFallback: false
        });

        if (googleResult.success && googleResult.apiKey) {
          const result = await this.analyzeWithGoogle(request, googleResult.apiKey);
          result.fallbackProvider = 'Google AI (direct)';
          console.log('✅ Google AI direct call successful');
          return result;
        }
      } catch (googleError) {
        console.warn('⚠️ Google AI direct call failed, trying OpenRouter...', googleError);
        lastError = googleError instanceof Error ? googleError : new Error('Google AI failed');
      }

      // Step 3: Try OpenRouter if Google fails
      try {
        console.log('🔄 Step 3: Trying OpenRouter...');
        const openrouterResult = await apiKeyService.getApiKey({
          keyType: 'openrouter' as ApiKeyType,
          enableFallback: false
        });

        if (openrouterResult.success && openrouterResult.apiKey) {
          const result = await this.analyzeWithOpenRouter(request, openrouterResult.apiKey);
          result.fallbackProvider = 'OpenRouter (direct)';
          console.log('✅ OpenRouter direct call successful');
          return result;
        }
      } catch (openrouterError) {
        console.warn('⚠️ OpenRouter direct call failed, trying A4F...', openrouterError);
        lastError = openrouterError instanceof Error ? openrouterError : new Error('OpenRouter failed');
      }

      // Step 4: Try A4F as final fallback
      try {
        console.log('🔄 Step 4: Trying A4F as final fallback...');
        const a4fResult = await apiKeyService.getApiKey({
          keyType: 'a4f' as ApiKeyType,
          enableFallback: false
        });

        if (a4fResult.success && a4fResult.apiKey) {
          const result = await this.analyzeWithA4F(request, a4fResult.apiKey);
          result.fallbackProvider = 'A4F (direct)';
          console.log('✅ A4F direct call successful');
          return result;
        }
      } catch (a4fError) {
        console.error('❌ A4F direct call failed - all providers exhausted', a4fError);
        lastError = a4fError instanceof Error ? a4fError : new Error('A4F failed');
      }

      // All providers failed
      console.error('❌ All AI providers failed:', lastError);
      throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}. Tried: Backend → Google AI → OpenRouter → A4F`);
    }
  }

  /**
   * Generates performance insights using AI
   */
  async generateInsights(request: TrendAnalysisRequest): Promise<AITrendInsight[]> {
    try {
      const analysisResult = await this.analyzeTrends(request);
      return analysisResult.insights;
    } catch (error) {
      console.error('AI insights generation failed:', error);
      throw error;
    }
  }

  /**
   * Gets question recommendations based on performance
   */
  async getQuestionRecommendations(request: TrendAnalysisRequest): Promise<string[]> {
    try {
      const analysisResult = await this.analyzeTrends(request);
      return analysisResult.recommendations;
    } catch (error) {
      console.error('AI question recommendations failed:', error);
      throw error;
    }
  }

  /**
   * Check if AI services are available
   */
  async checkAIAvailability(): Promise<boolean> {
    try {
      const response = await api.get('/ai/api-key-status');
      return response.data.has_any_key || false;
    } catch (error) {
      console.error('Failed to check AI availability:', error);
      return false;
    }
  }

  /**
   * Analyze trends using Google AI (Gemini) with timeout and error handling
   */
  private async analyzeWithGoogle(request: TrendAnalysisRequest, apiKey: string): Promise<TrendAnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(request);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      console.log('🔄 Google AI request starting...');
      
      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.7, 
          maxOutputTokens: 2000,
          candidateCount: 1
        }
      };
      
      console.log('🔍 Google AI request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.GOOGLE_AI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'CIL-CBT-App/1.0'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('🔍 Google AI response status:', response.status);
      console.log('🔍 Google AI response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Google AI API error response:', errorText);
        throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Google AI response received:', JSON.stringify(data, null, 2));
      
      return this.parseGoogleResponse(data, request);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Google AI request failed:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Google AI request timed out after 30 seconds');
      }
      throw error;
    }
  }

  /**
   * Analyze trends using OpenRouter API
   */
  private async analyzeWithOpenRouter(request: TrendAnalysisRequest, apiKey: string): Promise<TrendAnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(request);

    const response = await fetch(this.OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'CIL CBT Performance Analytics'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'system',
            content: 'You are an AI performance analyst for educational assessments. Provide detailed, actionable insights about student performance trends.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return this.parseOpenRouterResponse(data, request);
  }

  /**
   * Analyze trends using A4F API
   */
  private async analyzeWithA4F(request: TrendAnalysisRequest, apiKey: string): Promise<TrendAnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(request);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      console.log('🔄 A4F API request starting...');
      
      const requestBody = {
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an AI performance analyst for educational assessments. Provide detailed, actionable insights.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      };
      
      console.log('🔍 A4F request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.A4F_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'User-Agent': 'CIL-CBT-App/1.0',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('🔍 A4F response status:', response.status);
      console.log('🔍 A4F response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ A4F API error response:', errorText);
        throw new Error(`A4F API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ A4F API response received:', JSON.stringify(data, null, 2));
      
      return this.parseA4FResponse(data, request);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ A4F API request failed:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('A4F request timed out after 30 seconds');
      }
      throw error;
    }
  }

  /**
   * Builds the analysis prompt for AI APIs
   */
  private buildAnalysisPrompt(request: TrendAnalysisRequest): string {
    const { performanceData, timeframe, analysisType } = request;
    
    const dataDescription = performanceData.map(point => 
      `Date: ${point.date}, Score: ${point.score}${point.topic ? `, Topic: ${point.topic}` : ''}${point.difficulty ? `, Difficulty: ${point.difficulty}` : ''}${point.timeSpent ? `, Time: ${point.timeSpent}min` : ''}`
    ).join('\n');

    const performanceMetrics = this.generatePerformanceMetrics(performanceData);

    return `
You are an expert educational performance analyst. Analyze the following student performance data and provide detailed, actionable insights.

${performanceMetrics}

Performance Data (${timeframe} timeframe, ${analysisType} analysis):
${dataDescription}

Please provide a comprehensive analysis with specific insights categorized as follows:

1. STRENGTHS: What the student excels at, strong areas, successful patterns
2. WEAKNESSES: Areas needing improvement, consistent struggles, problematic patterns  
3. OPPORTUNITIES: Specific growth potential, recommended focus areas, improvement strategies
4. PATTERNS: Learning behaviors, performance trends, time-based observations

For each insight, provide:
- A clear, specific title
- Detailed explanation with actionable advice
- Confidence level (0-100%)
- Type classification (trend/insight/recommendation)

Focus on ${analysisType === 'topic' ? 'topic-specific performance patterns' : 
          analysisType === 'difficulty' ? 'difficulty level progression and challenges' :
          analysisType === 'time' ? 'time management and pacing patterns' :
          'overall performance trends and learning patterns'}.

Format your response as a JSON object:
{
  "insights": [
    {
      "type": "trend|insight|recommendation",
      "title": "Specific insight title",
      "content": "Detailed analysis with actionable advice",
      "confidence": 85
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "summary": "Brief overall assessment"
}

Ensure insights are specific, actionable, and based on the actual data patterns.
    `;
  }

  /**
   * Parses Google AI response
   */
  private parseGoogleResponse(data: any, request: TrendAnalysisRequest): TrendAnalysisResponse {
    try {
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('No content in Google AI response');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback to manual parsing if JSON not found
        return this.createFallbackResponse(content, request);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        insights: this.normalizeInsights(parsed.insights || []),
        trendData: this.calculateTrendData(request.performanceData),
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error('Error parsing Google AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Parses OpenRouter response
   */
  private parseOpenRouterResponse(data: any, request: TrendAnalysisRequest): TrendAnalysisResponse {
    try {
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenRouter response');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackResponse(content, request);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        insights: this.normalizeInsights(parsed.insights || []),
        trendData: this.calculateTrendData(request.performanceData),
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error('Error parsing OpenRouter response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Parses A4F response (same format as OpenRouter since both use OpenAI-compatible API)
   */
  private parseA4FResponse(data: any, request: TrendAnalysisRequest): TrendAnalysisResponse {
    try {
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in A4F response');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackResponse(content, request);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        insights: this.normalizeInsights(parsed.insights || []),
        trendData: this.calculateTrendData(request.performanceData),
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error('Error parsing A4F response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Creates fallback response when JSON parsing fails
   */
  private createFallbackResponse(content: string, request: TrendAnalysisRequest): TrendAnalysisResponse {
    const insights: AITrendInsight[] = [{
      type: 'insight',
      title: 'AI Analysis Summary',
      content: content.substring(0, 500) + '...',
      confidence: 75,
      timestamp: new Date().toISOString()
    }];

    return {
      insights,
      trendData: this.calculateTrendData(request.performanceData),
      recommendations: ['Continue practicing regularly', 'Focus on weaker areas']
    };
  }

  /**
   * Normalizes insights to match our interface
   */
  private normalizeInsights(insights: any[]): AITrendInsight[] {
    return insights.map(insight => ({
      type: insight.type || 'insight',
      title: insight.title || 'AI Insight',
      content: insight.content || insight.text || '',
      confidence: insight.confidence || 80,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Calculates smoothed trend data for visualization
   */
  private calculateTrendData(performanceData: PerformanceDataPoint[]): PerformanceDataPoint[] {
    if (performanceData.length < 2) return performanceData;

    // Simple moving average for smoother trends
    const smoothed: PerformanceDataPoint[] = [];
    const windowSize = Math.min(3, performanceData.length);

    for (let i = 0; i < performanceData.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(performanceData.length, start + windowSize);
      const window = performanceData.slice(start, end);
      
      const avgScore = window.reduce((sum, point) => sum + point.score, 0) / window.length;
      
      smoothed.push({
        ...performanceData[i],
        score: Math.round(avgScore * 100) / 100
      });
    }

    return smoothed;
  }

  /**
   * Generates detailed performance insights with categorization
   */
  async generateDetailedInsights(request: TrendAnalysisRequest): Promise<{
    strengths: AITrendInsight[];
    weaknesses: AITrendInsight[];
    opportunities: AITrendInsight[];
    patterns: AITrendInsight[];
  }> {
    try {
      const analysisResult = await this.analyzeTrends(request);
      
      // Categorize insights based on content
      const categorized = {
        strengths: [] as AITrendInsight[],
        weaknesses: [] as AITrendInsight[],
        opportunities: [] as AITrendInsight[],
        patterns: [] as AITrendInsight[]
      };

      analysisResult.insights.forEach(insight => {
        const content = insight.content.toLowerCase();
        const title = insight.title.toLowerCase();
        
        if (content.includes('strength') || content.includes('excel') || content.includes('good at') || content.includes('strong') || title.includes('strength')) {
          categorized.strengths.push(insight);
        } else if (content.includes('weakness') || content.includes('struggle') || content.includes('difficulty') || content.includes('poor') || title.includes('weakness')) {
          categorized.weaknesses.push(insight);
        } else if (content.includes('opportunity') || content.includes('improve') || content.includes('potential') || content.includes('recommendation') || title.includes('opportunity')) {
          categorized.opportunities.push(insight);
        } else {
          categorized.patterns.push(insight);
        }
      });

      return categorized;
    } catch (error) {
      console.error('Detailed insights generation failed:', error);
      throw error;
    }
  }

  /**
   * Generates performance metrics summary for insights
   */
  private generatePerformanceMetrics(performanceData: PerformanceDataPoint[]): string {
    if (performanceData.length === 0) return 'No performance data available.';

    const scores = performanceData.map(p => p.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const recentScores = scores.slice(-5); // Last 5 scores
    const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    
    const topics = Array.from(new Set(performanceData.map(p => p.topic).filter((topic): topic is string => Boolean(topic))));
    const difficulties = performanceData.map(p => p.difficulty).filter((d): d is number => typeof d === 'number');
    const avgDifficulty = difficulties.length > 0 ? difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length : 0;

    return `
 Performance Summary:
- Average Score: ${avgScore.toFixed(1)}% (Range: ${minScore}% - ${maxScore}%)
- Recent Performance: ${recentAvg.toFixed(1)}% (last 5 tests)
- Topics Covered: ${topics.length} (${topics.slice(0, 3).join(', ')}${topics.length > 3 ? '...' : ''})
- Average Difficulty: ${avgDifficulty.toFixed(1)}/10
- Total Tests: ${performanceData.length}
- Performance Trend: ${recentAvg > avgScore ? 'Improving' : recentAvg < avgScore ? 'Declining' : 'Stable'}
    `;
  }
}

export const aiAnalyticsService = new AIAnalyticsService();
export default aiAnalyticsService;
