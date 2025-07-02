import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Button,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  TrendingUp, 
  Psychology, 
  RecommendOutlined, 
  Refresh,
  ErrorOutline,
  SmartToy,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useApiKey } from '../../../hooks/useApiKey';
import { aiAnalyticsService, PerformanceDataPoint, AITrendInsight, TrendAnalysisRequest } from '../../../services/aiAnalyticsService';

interface AITabProps {
  userId: number;
  userPerformanceData?: any[];
  onRetry?: () => void;
}

export const AITrendAnalysisTab: React.FC<AITabProps> = ({ userId, userPerformanceData, onRetry }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AITrendInsight[]>([]);
  const [trendData, setTrendData] = useState<PerformanceDataPoint[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [analysisType, setAnalysisType] = useState<'overall' | 'topic' | 'difficulty' | 'time'>('overall');
  const [aiAvailable, setAiAvailable] = useState<boolean>(false);
  const [checkingAvailability, setCheckingAvailability] = useState<boolean>(true);

  // Check AI availability on component mount
  useEffect(() => {
    const checkAI = async () => {
      setCheckingAvailability(true);
      try {
        const available = await aiAnalyticsService.checkAIAvailability();
        setAiAvailable(available);
      } catch (error) {
        console.error('Failed to check AI availability:', error);
        setAiAvailable(false);
      } finally {
        setCheckingAvailability(false);
      }
    };
    
    checkAI();
  }, []);

  const transformUserDataToPerformanceData = (userData: any[]): PerformanceDataPoint[] => {
    if (!userData || userData.length === 0) return [];

    return userData.map(item => ({
      date: item.date || item.created_at || new Date().toISOString().split('T')[0],
      score: item.score || item.final_score || item.percentage || 0,
      topic: item.topic || item.subject,
      difficulty: item.difficulty_level || item.difficulty,
      timeSpent: item.time_spent || item.duration,
      questionCount: item.question_count || item.total_questions
    }));
  };

  const fetchTrendAnalysis = async () => {
    if (!aiAvailable) {
      setError('No AI API keys available. Please configure API keys in admin settings.');
      return;
    }

    if (!userPerformanceData || userPerformanceData.length === 0) {
      setError('No performance data available for analysis.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const performanceData = transformUserDataToPerformanceData(userPerformanceData);
      
      const request: TrendAnalysisRequest = {
        userId,
        performanceData,
        timeframe,
        analysisType
      };

      const result = await aiAnalyticsService.analyzeTrends(request);
      
      setInsights(result.insights);
      setTrendData(result.trendData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trend analysis';
      setError(errorMessage);
      console.error('Trend analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aiAvailable && userPerformanceData && userPerformanceData.length > 0) {
      fetchTrendAnalysis();
    }
  }, [aiAvailable, userId, userPerformanceData, timeframe, analysisType]);

  const renderApiKeyStatus = () => {
    if (checkingAvailability) {
      return (
        <Alert severity="info" icon={<CircularProgress size={20} />}>
          Checking AI service availability...
        </Alert>
      );
    }

    if (!aiAvailable) {
      return (
        <Alert 
          severity="warning" 
          icon={<Warning />}
          action={
            <Button size="small" color="inherit" onClick={() => window.location.href = '/admin/api-keys'}>
              Configure API Keys
            </Button>
          }
        >
          No AI API keys configured. Admin users can add API keys to enable AI analysis.
        </Alert>
      );
    }

    return (
      <Alert severity="success" icon={<CheckCircle />}>
        AI analysis enabled - AI service is available for analysis
      </Alert>
    );
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">AI Trend Analysis</Typography>
            <Chip label="AI-Powered" size="small" color="primary" sx={{ ml: 1 }} />
          </Box>
          <Box display="flex" gap={1}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={timeframe}
                label="Timeframe"
                onChange={(e) => setTimeframe(e.target.value as any)}
                disabled={loading}
              >
                <MenuItem value="week">Week</MenuItem>
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="quarter">Quarter</MenuItem>
                <MenuItem value="year">Year</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Analysis</InputLabel>
              <Select
                value={analysisType}
                label="Analysis"
                onChange={(e) => setAnalysisType(e.target.value as any)}
                disabled={loading}
              >
                <MenuItem value="overall">Overall</MenuItem>
                <MenuItem value="topic">By Topic</MenuItem>
                <MenuItem value="difficulty">By Difficulty</MenuItem>
                <MenuItem value="time">Time-based</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh Analysis">
              <span>
                <IconButton onClick={fetchTrendAnalysis} disabled={loading || !aiAvailable}>
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {renderApiKeyStatus()}

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Analyzing performance trends with AI...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            action={
              <Button size="small" onClick={onRetry || fetchTrendAnalysis}>
                Retry
              </Button>
            }
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {!loading && !error && aiAvailable && trendData.length > 0 && (
          <>
            <Box height={300} mb={3}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#2196f3" 
                    strokeWidth={3}
                    dot={{ fill: '#2196f3', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {insights.map((insight, index) => (
              <Alert 
                key={index} 
                severity={insight.type === 'recommendation' ? 'warning' : insight.type === 'trend' ? 'success' : 'info'} 
                icon={<SmartToy />}
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">{insight.title}</Typography>
                <Typography variant="body2">{insight.content}</Typography>
                <Typography variant="caption" color="text.secondary">
                  AI Confidence: {insight.confidence}% • {new Date(insight.timestamp).toLocaleString()}
                </Typography>
              </Alert>
            ))}
          </>
        )}

        {!loading && !error && aiAvailable && (!userPerformanceData || userPerformanceData.length === 0) && (
          <Alert severity="info">
            No performance data available. Complete some tests to see AI-powered trend analysis.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const AIPerformanceInsightsTab: React.FC<AITabProps> = ({ userId, userPerformanceData, onRetry }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AITrendInsight[]>([]);
  const [analysisType, setAnalysisType] = useState<'overall' | 'topic' | 'difficulty' | 'time'>('overall');
  const [insightCategories, setInsightCategories] = useState<{
    strengths: AITrendInsight[];
    weaknesses: AITrendInsight[];
    opportunities: AITrendInsight[];
    patterns: AITrendInsight[];
  }>({
    strengths: [],
    weaknesses: [],
    opportunities: [],
    patterns: []
  });

  // Check API key availability
  const { 
    apiKey: googleKey, 
    loading: googleLoading, 
    error: googleError,
    usingFallback: googleFallback,
    isAvailable: googleAvailable
  } = useApiKey({ keyType: 'google', autoFetch: true });

  const { 
    apiKey: openRouterKey, 
    loading: openRouterLoading, 
    error: openRouterError,
    usingFallback: openRouterFallback,
    isAvailable: openRouterAvailable
  } = useApiKey({ keyType: 'openrouter', autoFetch: true });

  const isApiKeyLoading = googleLoading || openRouterLoading;
  const hasAnyApiKey = googleAvailable || openRouterAvailable;

  const transformUserDataToPerformanceData = (userData: any[]): PerformanceDataPoint[] => {
    if (!userData || userData.length === 0) return [];

    return userData.map(item => ({
      date: item.date || item.created_at || new Date().toISOString().split('T')[0],
      score: item.score || item.final_score || item.percentage || 0,
      topic: item.topic || item.subject,
      difficulty: item.difficulty_level || item.difficulty,
      timeSpent: item.time_spent || item.duration,
      questionCount: item.question_count || item.total_questions
    }));
  };

  const categorizeInsights = (insights: AITrendInsight[]) => {
    const categories = {
      strengths: [] as AITrendInsight[],
      weaknesses: [] as AITrendInsight[],
      opportunities: [] as AITrendInsight[],
      patterns: [] as AITrendInsight[]
    };

    insights.forEach(insight => {
      const content = insight.content.toLowerCase();
      const title = insight.title.toLowerCase();
      
      if (content.includes('strength') || content.includes('excel') || content.includes('good at') || title.includes('strength')) {
        categories.strengths.push(insight);
      } else if (content.includes('weakness') || content.includes('struggle') || content.includes('difficulty') || title.includes('weakness')) {
        categories.weaknesses.push(insight);
      } else if (content.includes('opportunity') || content.includes('improve') || content.includes('potential') || title.includes('opportunity')) {
        categories.opportunities.push(insight);
      } else {
        categories.patterns.push(insight);
      }
    });

    return categories;
  };

  const fetchInsights = async () => {
    if (!hasAnyApiKey) {
      setError('No AI API keys available. Please configure API keys in admin settings.');
      return;
    }

    if (!userPerformanceData || userPerformanceData.length === 0) {
      setError('No performance data available for insights generation.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const performanceData = transformUserDataToPerformanceData(userPerformanceData);
      
      const request: TrendAnalysisRequest = {
        userId,
        performanceData,
        timeframe: 'month',
        analysisType
      };

      const result = await aiAnalyticsService.analyzeTrends(request);
      
      // Set all insights
      setInsights(result.insights);
      
      // Categorize insights for better organization
      const categorized = categorizeInsights(result.insights);
      setInsightCategories(categorized);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch performance insights';
      setError(errorMessage);
      console.error('Performance insights error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAnyApiKey && userPerformanceData && userPerformanceData.length > 0) {
      fetchInsights();
    }
  }, [hasAnyApiKey, userId, userPerformanceData, analysisType]);

  const renderApiKeyStatus = () => {
    if (isApiKeyLoading) {
      return (
        <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mb: 2 }}>
          Checking AI capabilities...
        </Alert>
      );
    }

    if (!hasAnyApiKey) {
      return (
        <Alert 
          severity="warning" 
          icon={<Warning />}
          action={
            <Button size="small" color="inherit" onClick={() => window.location.href = '/admin/api-keys'}>
              Configure API Keys
            </Button>
          }
          sx={{ mb: 2 }}
        >
          AI insights require API key configuration. Admin users can enable this feature.
        </Alert>
      );
    }

    return (
      <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
        AI insights enabled - {googleAvailable ? 'Google AI' : 'OpenRouter'} 
        {(googleFallback || openRouterFallback) && ' (using fallback key)'}
      </Alert>
    );
  };

  const renderInsightCategory = (title: string, insights: AITrendInsight[], severity: 'success' | 'warning' | 'info' | 'error', icon: React.ReactNode) => {
    if (insights.length === 0) return null;

    return (
      <Box mb={3}>
        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          {icon}
          <span style={{ marginLeft: 8 }}>{title}</span>
          <Chip size="small" label={insights.length} sx={{ ml: 1 }} />
        </Typography>
        {insights.map((insight, index) => (
          <Alert 
            key={`${title}-${index}`}
            severity={severity}
            icon={<SmartToy />}
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2">{insight.title}</Typography>
            <Typography variant="body2">{insight.content}</Typography>
            <Typography variant="caption" color="text.secondary">
              AI Confidence: {insight.confidence}% • {analysisType} analysis
            </Typography>
          </Alert>
        ))}
      </Box>
    );
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Psychology sx={{ mr: 1, color: 'secondary.main' }} />
            <Typography variant="h6">AI Performance Insights</Typography>
            <Chip label="AI-Powered" size="small" color="secondary" sx={{ ml: 1 }} />
          </Box>
          <Box display="flex" gap={1}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Focus Area</InputLabel>
              <Select
                value={analysisType}
                label="Focus Area"
                onChange={(e) => setAnalysisType(e.target.value as any)}
                disabled={loading}
              >
                <MenuItem value="overall">Overall Performance</MenuItem>
                <MenuItem value="topic">Topic Analysis</MenuItem>
                <MenuItem value="difficulty">Difficulty Patterns</MenuItem>
                <MenuItem value="time">Time Management</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh Insights">
              <span>
                <IconButton onClick={fetchInsights} disabled={loading || !hasAnyApiKey}>
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {renderApiKeyStatus()}

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Generating AI-powered performance insights...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            action={
              <Button size="small" onClick={onRetry || fetchInsights}>
                Retry
              </Button>
            }
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {!loading && !error && hasAnyApiKey && insights.length > 0 && (
          <Box>
            {/* Categorized insights for better organization */}
            {renderInsightCategory(
              'Strengths', 
              insightCategories.strengths, 
              'success', 
              <CheckCircle color="success" />
            )}
            
            {renderInsightCategory(
              'Areas for Improvement', 
              insightCategories.weaknesses, 
              'warning', 
              <Warning color="warning" />
            )}
            
            {renderInsightCategory(
              'Growth Opportunities', 
              insightCategories.opportunities, 
              'info', 
              <TrendingUp color="info" />
            )}
            
            {renderInsightCategory(
              'Performance Patterns', 
              insightCategories.patterns, 
              'info', 
              <Psychology color="secondary" />
            )}

            {/* Fallback: show all insights if categorization doesn't work well */}
            {Object.values(insightCategories).every(cat => cat.length === 0) && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>All Insights</Typography>
                {insights.map((insight, index) => (
                  <Alert 
                    key={index} 
                    severity={insight.type === 'recommendation' ? 'warning' : insight.type === 'trend' ? 'success' : 'info'}
                    icon={<Psychology />}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="subtitle2">{insight.title}</Typography>
                    <Typography variant="body2">{insight.content}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      AI Confidence: {insight.confidence}% • Generated with AI Analysis
                    </Typography>
                  </Alert>
                ))}
              </Box>
            )}
          </Box>
        )}

        {!loading && !error && hasAnyApiKey && (!userPerformanceData || userPerformanceData.length === 0) && (
          <Alert severity="info">
            <Typography variant="subtitle2">No Performance Data</Typography>
            <Typography variant="body2">
              Complete some tests to unlock AI-powered insights about your performance patterns, strengths, and areas for improvement.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const AIQuestionRecommendationsTab: React.FC<AITabProps> = ({ userId, userPerformanceData, onRetry }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [insights, setInsights] = useState<AITrendInsight[]>([]);
  const [focusArea, setFocusArea] = useState<'weak_areas' | 'strengths' | 'balanced' | 'time_management'>('weak_areas');
  const [studyPlan, setStudyPlan] = useState<{
    daily: string[];
    weekly: string[];
    priority: string[];
  }>({
    daily: [],
    weekly: [],
    priority: []
  });
  const [recommendationCategories, setRecommendationCategories] = useState<{
    immediate: AITrendInsight[];
    shortTerm: AITrendInsight[];
    longTerm: AITrendInsight[];
    practice: AITrendInsight[];
  }>({
    immediate: [],
    shortTerm: [],
    longTerm: [],
    practice: []
  });

  // Check API key availability
  const { 
    apiKey: googleKey, 
    loading: googleLoading, 
    error: googleError,
    usingFallback: googleFallback,
    isAvailable: googleAvailable
  } = useApiKey({ keyType: 'google', autoFetch: true });

  const { 
    apiKey: openRouterKey, 
    loading: openRouterLoading, 
    error: openRouterError,
    usingFallback: openRouterFallback,
    isAvailable: openRouterAvailable
  } = useApiKey({ keyType: 'openrouter', autoFetch: true });

  const isApiKeyLoading = googleLoading || openRouterLoading;
  const hasAnyApiKey = googleAvailable || openRouterAvailable;

  const transformUserDataToPerformanceData = (userData: any[]): PerformanceDataPoint[] => {
    if (!userData || userData.length === 0) return [];

    return userData.map(item => ({
      date: item.date || item.created_at || new Date().toISOString().split('T')[0],
      score: item.score || item.final_score || item.percentage || 0,
      topic: item.topic || item.subject,
      difficulty: item.difficulty_level || item.difficulty,
      timeSpent: item.time_spent || item.duration,
      questionCount: item.question_count || item.total_questions
    }));
  };

  const categorizeRecommendations = (insights: AITrendInsight[]) => {
    const categories = {
      immediate: [] as AITrendInsight[],
      shortTerm: [] as AITrendInsight[],
      longTerm: [] as AITrendInsight[],
      practice: [] as AITrendInsight[]
    };

    insights.forEach(insight => {
      const content = insight.content.toLowerCase();
      const title = insight.title.toLowerCase();
      
      if (content.includes('immediate') || content.includes('urgent') || content.includes('critical') || title.includes('immediate')) {
        categories.immediate.push(insight);
      } else if (content.includes('practice') || content.includes('drill') || content.includes('exercise') || title.includes('practice')) {
        categories.practice.push(insight);
      } else if (content.includes('long-term') || content.includes('future') || content.includes('eventually') || title.includes('long-term')) {
        categories.longTerm.push(insight);
      } else {
        categories.shortTerm.push(insight);
      }
    });

    return categories;
  };

  const generateStudyPlan = (recommendations: string[], insights: AITrendInsight[]): {
    daily: string[];
    weekly: string[];
    priority: string[];
  } => {
    const plan = {
      daily: [] as string[],
      weekly: [] as string[],
      priority: [] as string[]
    };

    // Extract priority items from insights
    insights.forEach(insight => {
      if (insight.confidence > 85) {
        plan.priority.push(insight.title);
      }
    });

    // Generate daily recommendations
    plan.daily = recommendations.filter(rec => 
      rec.toLowerCase().includes('daily') || 
      rec.toLowerCase().includes('practice') ||
      rec.toLowerCase().includes('review')
    ).slice(0, 3);

    // Generate weekly recommendations
    plan.weekly = recommendations.filter(rec => 
      rec.toLowerCase().includes('week') || 
      rec.toLowerCase().includes('focus') ||
      rec.toLowerCase().includes('improve')
    ).slice(0, 4);

    // Fill in defaults if needed
    if (plan.daily.length === 0) {
      plan.daily = ['Practice 10-15 questions daily', 'Review weak topics for 20 minutes', 'Time yourself on practice tests'];
    }

    if (plan.weekly.length === 0) {
      plan.weekly = ['Complete 2-3 full practice tests', 'Focus on identified weak areas', 'Review and analyze mistakes', 'Study advanced concepts'];
    }

    if (plan.priority.length === 0) {
      plan.priority = ['Focus on areas with lowest scores', 'Improve time management', 'Practice regularly'];
    }

    return plan;
  };

  const fetchRecommendations = async () => {
    if (!hasAnyApiKey) {
      setError('No AI API keys available. Please configure API keys in admin settings.');
      return;
    }

    if (!userPerformanceData || userPerformanceData.length === 0) {
      setError('No performance data available for generating recommendations.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const performanceData = transformUserDataToPerformanceData(userPerformanceData);
      
      const request: TrendAnalysisRequest = {
        userId,
        performanceData,
        timeframe: 'month',
        analysisType: focusArea === 'weak_areas' ? 'topic' : 
                     focusArea === 'time_management' ? 'time' : 'overall'
      };

      const result = await aiAnalyticsService.analyzeTrends(request);
      
      setRecommendations(result.recommendations);
      
      // Filter and categorize insights
      const recommendationInsights = result.insights.filter(insight => 
        insight.type === 'recommendation' || insight.content.toLowerCase().includes('recommend')
      );
      setInsights(recommendationInsights);
      
      // Categorize recommendations
      const categorized = categorizeRecommendations(recommendationInsights);
      setRecommendationCategories(categorized);
      
      // Generate study plan
      const plan = generateStudyPlan(result.recommendations, recommendationInsights);
      setStudyPlan(plan);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setError(errorMessage);
      console.error('Question recommendations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAnyApiKey && userPerformanceData && userPerformanceData.length > 0) {
      fetchRecommendations();
    }
  }, [hasAnyApiKey, userId, userPerformanceData, focusArea]);

  const renderApiKeyStatus = () => {
    if (isApiKeyLoading) {
      return (
        <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mb: 2 }}>
          Checking AI capabilities for recommendations...
        </Alert>
      );
    }

    if (!hasAnyApiKey) {
      return (
        <Alert 
          severity="warning" 
          icon={<Warning />}
          action={
            <Button size="small" color="inherit" onClick={() => window.location.href = '/admin/api-keys'}>
              Configure API Keys
            </Button>
          }
          sx={{ mb: 2 }}
        >
          AI recommendations require API key configuration. Admin users can enable this feature.
        </Alert>
      );
    }

    return (
      <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
        AI recommendations enabled - {googleAvailable ? 'Google AI' : 'OpenRouter'} 
        {(googleFallback || openRouterFallback) && ' (using fallback key)'}
      </Alert>
    );
  };

  const renderRecommendationCategory = (title: string, recommendations: AITrendInsight[], severity: 'success' | 'warning' | 'info' | 'error', icon: React.ReactNode) => {
    if (recommendations.length === 0) return null;

    return (
      <Box mb={3}>
        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          {icon}
          <span style={{ marginLeft: 8 }}>{title}</span>
          <Chip size="small" label={recommendations.length} sx={{ ml: 1 }} />
        </Typography>
        {recommendations.map((rec, index) => (
          <Alert 
            key={`${title}-${index}`}
            severity={severity}
            icon={<SmartToy />}
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2">{rec.title}</Typography>
            <Typography variant="body2">{rec.content}</Typography>
            <Typography variant="caption" color="text.secondary">
              AI Confidence: {rec.confidence}% • {focusArea.replace('_', ' ')} focus
            </Typography>
          </Alert>
        ))}
      </Box>
    );
  };

  const renderStudyPlan = () => {
    if (!studyPlan.daily.length && !studyPlan.weekly.length && !studyPlan.priority.length) return null;

    return (
      <Box mb={3}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
          AI-Generated Study Plan
        </Typography>
        
        {studyPlan.priority.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>🎯 Priority Actions</Typography>
            {studyPlan.priority.map((item, index) => (
              <Alert key={`priority-${index}`} severity="error" sx={{ mb: 1 }}>
                <Typography variant="body2">{item}</Typography>
              </Alert>
            ))}
          </Box>
        )}

        {studyPlan.daily.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>📅 Daily Recommendations</Typography>
            {studyPlan.daily.map((item, index) => (
              <Alert key={`daily-${index}`} severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">{item}</Typography>
              </Alert>
            ))}
          </Box>
        )}

        {studyPlan.weekly.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>📈 Weekly Goals</Typography>
            {studyPlan.weekly.map((item, index) => (
              <Alert key={`weekly-${index}`} severity="success" sx={{ mb: 1 }}>
                <Typography variant="body2">{item}</Typography>
              </Alert>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <RecommendOutlined sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="h6">AI Question Recommendations</Typography>
            <Chip label="AI-Powered" size="small" color="success" sx={{ ml: 1 }} />
          </Box>
          <Box display="flex" gap={1}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Focus Area</InputLabel>
              <Select
                value={focusArea}
                label="Focus Area"
                onChange={(e) => setFocusArea(e.target.value as any)}
                disabled={loading}
              >
                <MenuItem value="weak_areas">Weak Areas</MenuItem>
                <MenuItem value="strengths">Build on Strengths</MenuItem>
                <MenuItem value="balanced">Balanced Practice</MenuItem>
                <MenuItem value="time_management">Time Management</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh Recommendations">
              <span>
                <IconButton onClick={fetchRecommendations} disabled={loading || !hasAnyApiKey}>
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {renderApiKeyStatus()}

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Generating personalized AI recommendations and study plan...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            action={
              <Button size="small" onClick={onRetry || fetchRecommendations}>
                Retry
              </Button>
            }
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {!loading && !error && hasAnyApiKey && (recommendations.length > 0 || insights.length > 0) && (
          <Box>
            {/* AI-Generated Study Plan */}
            {renderStudyPlan()}

            {/* Categorized Recommendations */}
            {renderRecommendationCategory(
              'Immediate Actions', 
              recommendationCategories.immediate, 
              'error', 
              <Warning color="error" />
            )}
            
            {renderRecommendationCategory(
              'Short-term Goals', 
              recommendationCategories.shortTerm, 
              'warning', 
              <TrendingUp color="warning" />
            )}
            
            {renderRecommendationCategory(
              'Practice Recommendations', 
              recommendationCategories.practice, 
              'info', 
              <RecommendOutlined color="info" />
            )}
            
            {renderRecommendationCategory(
              'Long-term Development', 
              recommendationCategories.longTerm, 
              'success', 
              <CheckCircle color="success" />
            )}

            {/* Simple text recommendations that don't fit categories */}
            {recommendations.length > 0 && (
              <Box mb={3}>
                <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
                  Additional AI Recommendations
                </Typography>
                {recommendations.map((rec, index) => (
                  <Alert 
                    key={`general-rec-${index}`}
                    severity="info"
                    icon={<RecommendOutlined />}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2">{rec}</Typography>
                  </Alert>
                ))}
              </Box>
            )}

            {/* Fallback message if no specific recommendations */}
            {recommendations.length === 0 && insights.length === 0 && (
              <Alert severity="info">
                <Typography variant="subtitle2">Personalized Recommendations</Typography>
                <Typography variant="body2">
                  Based on your selected focus area ({focusArea.replace('_', ' ')}), 
                  the AI is analyzing your performance patterns to provide targeted study recommendations.
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {!loading && !error && hasAnyApiKey && (!userPerformanceData || userPerformanceData.length === 0) && (
          <Alert severity="info">
            <Typography variant="subtitle2">No Performance Data</Typography>
            <Typography variant="body2">
              Complete some tests to unlock AI-powered question recommendations and personalized study plans.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
