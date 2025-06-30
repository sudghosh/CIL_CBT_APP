/**
 * usePerformanceData Hook
 * 
 * Modern React hook for fetching all performance dashboard data.
 * Consolidates multiple API calls and provides unified state management.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { performanceAPI } from '../../../services/api';
import { 
  DashboardData, 
  PerformanceMetrics, 
  TopicPerformance, 
  DifficultyMetrics,
  TestTypeComparison,
  PerformanceTrends,
  TimePeriod,
  LoadingState,
  ErrorState 
} from '../types';

/**
 * Hook options for filtering and configuration
 */
export interface UsePerformanceDataOptions {
  userId?: number;
  timePeriod?: TimePeriod;
  paperId?: number;
  sectionId?: number;
  difficulty?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Individual query state
 */
interface QueryState<T = any> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Hook return type with combined state and data
 */
export interface UsePerformanceDataResult {
  // Combined data
  data: DashboardData | null;
  
  // Loading states
  isLoading: boolean;
  isRefetching: boolean;
  loadingState: LoadingState;
  
  // Error states
  isError: boolean;
  error: Error | null;
  errorState: ErrorState;
  
  // Individual query states (for granular control)
  queries: {
    overall: QueryState;
    topics: QueryState;
    difficulty: QueryState;
    trends: QueryState;
  };
  
  // Actions
  refetch: () => Promise<void>;
  refetchOverall: () => Promise<void>;
  refetchTopics: () => Promise<void>;
  refetchDifficulty: () => Promise<void>;
  refetchTrends: () => Promise<void>;
}

/**
 * Transform legacy API response to new interface
 */
const transformOverallPerformance = (data: any): PerformanceMetrics => {
  return {
    totalTestsTaken: data?.total_tests_taken || 0,
    totalQuestionsAttempted: data?.total_questions_attempted || 0,
    totalCorrectAnswers: data?.total_correct_answers || 0,
    averageScorePercentage: data?.avg_score_percentage || 0,
    averageResponseTimeSeconds: data?.avg_response_time_seconds || 0,
    lastUpdated: data?.last_updated || new Date().toISOString(),
  };
};

const transformTestTypeComparison = (overallData: any): TestTypeComparison => {
  return {
    adaptive: {
      testsCount: overallData?.adaptive_tests_count || 0,
      averageScore: overallData?.adaptive_avg_score || 0,
    },
    standard: {
      testsCount: overallData?.non_adaptive_tests_count || 0,
      averageScore: overallData?.non_adaptive_avg_score || 0,
    },
  };
};

const transformTopicPerformance = (data: any[]): TopicPerformance[] => {
  if (!Array.isArray(data)) return [];
  return data.map(item => ({
    topic: item?.topic || item?.section_name || 'Unknown',
    totalQuestions: item?.total_questions || 0,
    correctAnswers: item?.correct_answers || 0,
    accuracyPercentage: item?.accuracy_percentage || 0,
    averageResponseTimeSeconds: item?.avg_response_time_seconds || 0,
    masteryLevel: item?.mastery_level,
  }));
};

const transformDifficultyMetrics = (data: any): DifficultyMetrics => {
  return {
    easy: {
      accuracy: data?.easy?.accuracy || 0,
      questionsCount: data?.easy?.questions_count || 0,
    },
    medium: {
      accuracy: data?.medium?.accuracy || 0,
      questionsCount: data?.medium?.questions_count || 0,
    },
    hard: {
      accuracy: data?.hard?.accuracy || 0,
      questionsCount: data?.hard?.questions_count || 0,
    },
  };
};

const transformPerformanceTrends = (data: any, period: TimePeriod): PerformanceTrends => {
  return {
    period,
    accuracyTrend: data?.accuracyTrend || data?.accuracy_trend || [],
    speedTrend: data?.speedTrend || data?.speed_trend || [],
    difficultyTrend: data?.difficultyTrend || data?.difficulty_trend || [],
  };
};

/**
 * Modern performance data hook using React hooks
 */
export const usePerformanceData = (options: UsePerformanceDataOptions = {}): UsePerformanceDataResult => {
  const {
    userId,
    timePeriod = 'month',
    paperId,
    sectionId,
    difficulty,
    enabled = true,
    refetchInterval,
  } = options;

  // Individual query states
  const [overallQuery, setOverallQuery] = useState<QueryState>({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
  });

  const [topicsQuery, setTopicsQuery] = useState<QueryState>({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
  });

  const [difficultyQuery, setDifficultyQuery] = useState<QueryState>({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
  });

  const [trendsQuery, setTrendsQuery] = useState<QueryState>({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
  });

  // Fetch functions
  const fetchOverallPerformance = useCallback(async () => {
    if (!enabled) return;
    
    setOverallQuery(prev => ({ ...prev, isLoading: true, isError: false, error: null }));
    
    try {
      const data = await performanceAPI.getOverallPerformance();
      setOverallQuery({ data, isLoading: false, isError: false, error: null });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to fetch overall performance');
      setOverallQuery({ data: null, isLoading: false, isError: true, error: errorObj });
    }
  }, [enabled]);

  const fetchTopicPerformance = useCallback(async () => {
    if (!enabled) return;
    setTopicsQuery(prev => ({ ...prev, isLoading: true, isError: false, error: null }));
    try {
      const data = await performanceAPI.getTopicPerformance({ paperId, sectionId, difficulty });
      setTopicsQuery({ data, isLoading: false, isError: false, error: null });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to fetch topic performance');
      setTopicsQuery({ data: null, isLoading: false, isError: true, error: errorObj });
    }
  }, [paperId, sectionId, difficulty, enabled]);

  const fetchDifficultyPerformance = useCallback(async () => {
    if (!enabled) return;
    setDifficultyQuery(prev => ({ ...prev, isLoading: true, isError: false, error: null }));
    try {
      const data = await performanceAPI.getDifficultyPerformance();
      setDifficultyQuery({ data, isLoading: false, isError: false, error: null });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to fetch difficulty performance');
      setDifficultyQuery({ data: null, isLoading: false, isError: true, error: errorObj });
    }
  }, [enabled]);

  const fetchTrendsPerformance = useCallback(async () => {
    if (!enabled) return;
    setTrendsQuery(prev => ({ ...prev, isLoading: true, isError: false, error: null }));
    try {
      // Map our TimePeriod to API's expected format
      const apiTimePeriod = timePeriod === 'all' ? 'year' : timePeriod;
      const data = await performanceAPI.getTimePerformance({ timePeriod: apiTimePeriod });
      setTrendsQuery({ data, isLoading: false, isError: false, error: null });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to fetch trends performance');
      setTrendsQuery({ data: null, isLoading: false, isError: true, error: errorObj });
    }
  }, [timePeriod, enabled]);

  // Initial data fetching
  useEffect(() => {
    if (enabled) {
      fetchOverallPerformance();
      fetchTopicPerformance();
      fetchDifficultyPerformance();
      fetchTrendsPerformance();
    }
  }, [enabled, fetchOverallPerformance, fetchTopicPerformance, fetchDifficultyPerformance, fetchTrendsPerformance]);

  // Auto-refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;
    
    const interval = setInterval(() => {
      fetchOverallPerformance();
      fetchTopicPerformance();
      fetchDifficultyPerformance();
      fetchTrendsPerformance();
    }, refetchInterval);
    
    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchOverallPerformance, fetchTopicPerformance, fetchDifficultyPerformance, fetchTrendsPerformance]);

  // Compute combined states
  const isLoading = overallQuery.isLoading || topicsQuery.isLoading || difficultyQuery.isLoading || trendsQuery.isLoading;
  const isRefetching = isLoading && (overallQuery.data || topicsQuery.data || difficultyQuery.data || trendsQuery.data);
  const isError = overallQuery.isError || topicsQuery.isError || difficultyQuery.isError || trendsQuery.isError;
  const error = overallQuery.error || topicsQuery.error || difficultyQuery.error || trendsQuery.error;

  // Combine data into DashboardData structure
  const combinedData: DashboardData | null = useMemo(() => {
    // Only return data when all critical queries have succeeded
    if (!overallQuery.data || !topicsQuery.data || !difficultyQuery.data) {
      return null;
    }

    try {
      return {
        metrics: transformOverallPerformance(overallQuery.data),
        testTypeComparison: transformTestTypeComparison(overallQuery.data),
        difficultyMetrics: transformDifficultyMetrics(difficultyQuery.data),
        topicPerformance: transformTopicPerformance(topicsQuery.data),
        trends: transformPerformanceTrends(trendsQuery.data, timePeriod),
      };
    } catch (transformError) {
      console.error('Error transforming performance data:', transformError);
      return null;
    }
  }, [overallQuery.data, topicsQuery.data, difficultyQuery.data, trendsQuery.data, timePeriod]);

  // Create loading and error state objects
  const loadingState: LoadingState = {
    isLoading,
    message: isLoading ? 'Loading performance data...' : undefined,
  };

  const errorState: ErrorState = {
    hasError: isError,
    message: error?.message,
    timestamp: isError ? new Date().toISOString() : undefined,
  };

  // Master refetch function
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchOverallPerformance(),
      fetchTopicPerformance(),
      fetchDifficultyPerformance(),
      fetchTrendsPerformance(),
    ]);
  }, [fetchOverallPerformance, fetchTopicPerformance, fetchDifficultyPerformance, fetchTrendsPerformance]);

  return {
    // Combined data
    data: combinedData,
    
    // Loading states
    isLoading,
    isRefetching,
    loadingState,
    
    // Error states
    isError,
    error,
    errorState,
    
    // Individual query states
    queries: {
      overall: overallQuery,
      topics: topicsQuery,
      difficulty: difficultyQuery,
      trends: trendsQuery,
    },
    
    // Actions
    refetch,
    refetchOverall: fetchOverallPerformance,
    refetchTopics: fetchTopicPerformance,
    refetchDifficulty: fetchDifficultyPerformance,
    refetchTrends: fetchTrendsPerformance,
  };
};
