/**
 * Type definitions for visualization components and API responses
 */

/**
 * Common response status type
 */
export type ResponseStatus = 'success' | 'error';

/**
 * Base response interface for all API responses
 */
export interface ApiResponse<T> {
  status: ResponseStatus;
  message?: string;
  data: T | null;
}

/**
 * Overall performance summary data
 */
export interface OverallSummary {
  total_tests_taken: number;
  total_questions_attempted: number;
  total_correct_answers: number;
  avg_score_percentage: number;
  avg_response_time_seconds: number;
  easy_questions_accuracy: number;
  medium_questions_accuracy: number;
  hard_questions_accuracy: number;
  last_updated: string;
  adaptive_tests_count: number;
  non_adaptive_tests_count: number;
  adaptive_avg_score: number;
  non_adaptive_avg_score: number;
}

/**
 * Topic performance data
 */
export interface TopicSummary {
  topic: string;
  total_questions: number;
  correct_answers: number;
  accuracy_percentage: number;
  avg_response_time_seconds: number;
}

/**
 * Difficulty trends data point structure
 */
export interface DifficultyTrendPoint {
  date: string;
  average_difficulty: number;
  user_difficulty?: number;
}

/**
 * Difficulty trends data structure
 */
export interface DifficultyTrendsResult {
  overall: DifficultyTrendPoint[];
  by_topic: Record<string, DifficultyTrendPoint[]>;
}

/**
 * Response type for difficulty trends API
 */
export type DifficultyTrendsResponse = ApiResponse<DifficultyTrendsResult>;

/**
 * Topic mastery progression data point
 */
export interface TopicMasteryProgressionPoint {
  date: string;
  [topic: string]: string | number; // Topic name -> mastery level for that date or date string
}

/**
 * Topic mastery data structure
 */
export interface TopicMasteryResult {
  topic_mastery: Record<string, number>; // Topic name -> mastery level (0-100)
  mastery_progression: TopicMasteryProgressionPoint[];
}

/**
 * Response type for topic mastery API
 */
export type TopicMasteryResponse = ApiResponse<TopicMasteryResult>;

/**
 * Suggested question structure
 */
export interface SuggestedQuestion {
  id: number;
  topic: string;
  difficulty: number;
}

/**
 * Recommendation data structure
 */
export interface Recommendation {
  topic: string;
  subtopic?: string;
  difficulty: number;
  importance: number;  // 1-10 scale
  recommendation_type: 'practice' | 'review' | 'focus';
  description: string;
  suggested_questions?: SuggestedQuestion[];
  improvement_potential: number;  // 0-100 scale
}

/**
 * Recommended question data structure
 */
export interface RecommendedQuestion {
  id: number;
  topic: string;
  difficulty: number;
  performance_impact: number;
  question_preview: string;
}

/**
 * Learning path step data structure
 */
export interface LearningPathStep {
  title: string;
  description: string;
  estimated_time: string;
  priority: number;
  resources?: string[];
}

/**
 * Topic weakness data structure
 */
export interface TopicWeakness {
  topic: string;
  mastery_level: number;
  questions_attempted: number;
  accuracy: number;
  recommended_actions: string[];
}

/**
 * Extended recommendations response structure
 */
export interface RecommendationsResult {
  recommendations: Recommendation[];
  weakTopics: TopicWeakness[];
  recommendedQuestions: RecommendedQuestion[];
  learningPath: LearningPathStep[];
}

/**
 * Response type for recommendations API
 */
export type RecommendationsResponse = ApiResponse<RecommendationsResult>;

/**
 * Performance metric comparison
 */
export interface PerformanceMetric {
  name: string;
  user_value: number;
  average_value: number;
  description?: string;
  unit?: string;
}

/**
 * Difficulty level comparison data
 */
export interface DifficultyLevelComparison {
  user_accuracy: number;
  average_accuracy: number;
  user_time: number;
  average_time: number;
}

/**
 * Strength or weakness item in performance comparison
 */
export interface PerformanceInsightItem {
  title: string;
  description: string;
  metric: string;
  value: number;
  comparison: number;
  difference: number;
}

/**
 * Performance comparison data structure
 */
export interface PerformanceComparisonResult {
  // Overall comparison metrics
  metrics: PerformanceMetric[];
  // Performance by difficulty level
  difficulty_comparison: {
    easy: DifficultyLevelComparison;
    medium: DifficultyLevelComparison;
    hard: DifficultyLevelComparison;
  };
  // Overall comparison chart data
  overall: Array<{
    name: string;
    userValue: number;
    averageValue: number;
  }>;
  // Comparison by difficulty level
  byDifficulty: Array<{
    name: string;
    userAccuracy: number;
    averageAccuracy: number;
    userTime?: number;
    averageTime?: number;
  }>;
  // User's strengths
  strengths: PerformanceInsightItem[];
  // User's areas for improvement
  weaknesses: PerformanceInsightItem[];
}

/**
 * Response type for performance comparison API
 */
export type PerformanceComparisonResponse = ApiResponse<PerformanceComparisonResult>;

/**
 * Props for the DifficultyTrendsChart component
 */
export interface DifficultyTrendsChartProps {
  /**
   * Enable personalized data visualization
   */
  enablePersonalization?: boolean;
}

/**
 * Props for the TopicMasteryProgressionChart component
 */
export interface TopicMasteryProgressionChartProps {
  /**
   * Maximum number of topics to show
   */
  maxTopics?: number;
}

/**
 * Props for the PersonalizedRecommendationDisplay component
 */
export interface PersonalizedRecommendationDisplayProps {
  /**
   * Maximum number of recommendations to show
   */
  maxRecommendations?: number;
}

/**
 * Props for the PerformanceComparisonChart component
 */
export interface PerformanceComparisonChartProps {
  /**
   * Default chart type to show
   */
  defaultChartType?: 'bar' | 'radar';
  
  /**
   * Default metric to visualize
   */
  defaultMetric?: 'accuracy' | 'time' | 'all';
}

/**
 * Chart time period options
 */
export type ChartTimePeriod = 'week' | 'month' | 'year' | 'all';

/**
 * API time period options (doesn't include 'all' option)
 */
export type ApiTimePeriod = 'week' | 'month' | 'year' | undefined;
