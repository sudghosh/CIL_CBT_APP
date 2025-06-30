/**
 * Performance Dashboard Types
 * 
 * TypeScript interfaces and type definitions for the new dashboard
 */

// API and base types
export * from './api';

// Dashboard data types
export * from './dashboard';

// Chart component types
export * from './chart';

// UI component types
export * from './ui';

// Re-export commonly used types for convenience
export type { 
  ApiResponse, 
  TimePeriod, 
  ErrorState, 
  LoadingState 
} from './api';

export type { 
  PerformanceMetrics, 
  DashboardData, 
  TopicPerformance 
} from './dashboard';

export type { 
  ChartConfig, 
  PieChartProps, 
  BarChartProps, 
  LineChartProps 
} from './chart';

export type { 
  DashboardTab, 
  MetricCardData, 
  DashboardActions 
} from './ui';
