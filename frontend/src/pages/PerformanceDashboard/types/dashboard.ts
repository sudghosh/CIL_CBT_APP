/**
 * Performance Dashboard Data Types
 * 
 * Interfaces for performance metrics and dashboard state
 */

import { ApiResponse, TimePeriod, TimeSeriesDataPoint } from './api';

/**
 * Overall performance summary metrics
 */
export interface PerformanceMetrics {
  totalTestsTaken: number;
  totalQuestionsAttempted: number;
  totalCorrectAnswers: number;
  averageScorePercentage: number;
  averageResponseTimeSeconds: number;
  lastUpdated: string;
}

/**
 * Adaptive vs Standard test performance comparison
 */
export interface TestTypeComparison {
  adaptive: {
    testsCount: number;
    averageScore: number;
  };
  standard: {
    testsCount: number;
    averageScore: number;
  };
}

/**
 * Performance metrics by difficulty level
 */
export interface DifficultyMetrics {
  easy: {
    accuracy: number;
    questionsCount: number;
  };
  medium: {
    accuracy: number;
    questionsCount: number;
  };
  hard: {
    accuracy: number;
    questionsCount: number;
  };
}

/**
 * Topic-specific performance data
 */
export interface TopicPerformance {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracyPercentage: number;
  averageResponseTimeSeconds: number;
  masteryLevel?: number; // 0-100
}

/**
 * Performance trends over time
 */
export interface PerformanceTrends {
  period: TimePeriod;
  accuracyTrend: TimeSeriesDataPoint[];
  speedTrend: TimeSeriesDataPoint[];
  difficultyTrend: TimeSeriesDataPoint[];
}

/**
 * Complete dashboard data structure
 */
export interface DashboardData {
  metrics: PerformanceMetrics;
  testTypeComparison: TestTypeComparison;
  difficultyMetrics: DifficultyMetrics;
  topicPerformance: TopicPerformance[];
  trends: PerformanceTrends;
}

/**
 * API response types
 */
export type PerformanceMetricsResponse = ApiResponse<PerformanceMetrics>;
export type TopicPerformanceResponse = ApiResponse<TopicPerformance[]>;
export type PerformanceTrendsResponse = ApiResponse<PerformanceTrends>;
export type DashboardDataResponse = ApiResponse<DashboardData>;
