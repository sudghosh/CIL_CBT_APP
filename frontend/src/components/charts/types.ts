/**
 * Type definitions for chart components and API responses
 */

/**
 * Common response format for all API calls
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T | null;
}

/**
 * Difficulty Trends Data Types
 */
export interface DifficultyDataPoint {
  date: string;
  average_difficulty: number;
  user_difficulty?: number;
  std_deviation?: number;
  samples?: number;
}

export interface DifficultyTrendsData {
  overall: DifficultyDataPoint[];
  by_topic: Record<string, DifficultyDataPoint[]>;
}

export type DifficultyTrendsResponse = ApiResponse<DifficultyTrendsData>;

/**
 * Topic Mastery Data Types
 */
export interface TopicMasteryProgression {
  date: string;
  [topic: string]: number | string; // topic name -> mastery level or date string
}

export interface TopicMasteryData {
  topic_mastery: {
    [topic: string]: number;  // topic name -> mastery level (0-100)
  };
  mastery_progression: TopicMasteryProgression[];
}

export type TopicMasteryResponse = ApiResponse<TopicMasteryData>;

/**
 * Recommendations Data Types
 */
export interface RecommendedQuestion {
  id: number;
  topic: string;
  difficulty: number;
}

export interface Recommendation {
  topic: string;
  subtopic?: string;
  difficulty: number;
  importance: number;  // 1-10 scale
  recommendation_type: 'practice' | 'review' | 'focus';
  description: string;
  suggested_questions?: RecommendedQuestion[];
  improvement_potential: number;  // 0-100 scale
}

export interface RecommendationsData {
  recommendations: Recommendation[];
  insights: any[];  // For backend insights
  weakTopics?: any[];  // Optional for backward compatibility
  recommendedQuestions?: any[];  // Optional for backward compatibility
  learningPath?: any[];  // Optional for backward compatibility
}

export type RecommendationsResponse = ApiResponse<RecommendationsData>;

/**
 * Performance Comparison Data Types
 */
export interface PerformanceMetric {
  name: string;
  user_value: number;
  average_value: number;
  description?: string;
  unit?: string;
}

export interface DifficultyLevelComparison {
  user_accuracy: number;
  average_accuracy: number;
  user_time: number;
  average_time: number;
}

export interface PerformanceComparisonData {
  metrics: PerformanceMetric[];
  difficulty_comparison: {
    easy: DifficultyLevelComparison;
    medium: DifficultyLevelComparison;
    hard: DifficultyLevelComparison;
  };
  insights?: any[];  // For backend insights about strengths and weaknesses
  user_percentiles?: any;  // Additional data from backend
  total_users?: number;    // Additional data from backend
}

export type PerformanceComparisonResponse = ApiResponse<PerformanceComparisonData>;

/**
 * Chart Display Types
 */
export type ChartTimePeriod = 'week' | 'month' | 'year' | 'all';
export type ChartType = 'bar' | 'line' | 'radar' | 'pie' | 'area';
