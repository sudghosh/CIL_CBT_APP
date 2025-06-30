/**
 * Central export file for all chart-related components
 * 
 * IMPORTANT: To avoid circular dependencies, this file should:
 * 1. Only export individual components
 * 2. Not be imported by the components it exports
 */

// Common components
export { default as ChartContainer } from './ChartContainer';
export { default as ChartRestrictedAccess } from './ChartRestrictedAccess';
export { default as ChartFilter } from './ChartFilter';

// Specialized charts
export { default as DifficultyTrendsChart } from './difficulty/DifficultyTrendsChart';
export { default as TopicMasteryProgressionChart } from './topic/TopicMasteryProgressionChart';
export { default as PersonalizedRecommendationDisplay } from './recommendations/PersonalizedRecommendationDisplay';
export { default as PerformanceComparisonChart } from './comparison/PerformanceComparisonChart';

// Utils and constants
export * from './utils/chartConstants';
export * from './utils/chartHelpers';

// Types - explicitly re-export to avoid ambiguity with ChartTimePeriod
import * as ChartTypes from './types';
export { 
  ChartTypes
};
