# Visualization Components TypeScript Interface Reference

This document serves as a quick reference for all TypeScript interfaces used in the enhanced visualization components.

## API Response Types

```typescript
// Base response interface
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T | null;
}

// Specific response types
export type DifficultyTrendsResponse = ApiResponse<DifficultyTrendsResult>;
export type TopicMasteryResponse = ApiResponse<TopicMasteryResult>;
export type RecommendationsResponse = ApiResponse<RecommendationsResult>;
export type PerformanceComparisonResponse = ApiResponse<PerformanceComparisonResult>;
```

## Component Props

```typescript
// DifficultyTrendsChart
export interface DifficultyTrendsChartProps {
  enablePersonalization?: boolean;
}

// TopicMasteryProgressionChart
export interface TopicMasteryProgressionChartProps {
  maxTopics?: number;
}

// PersonalizedRecommendationDisplay
export interface PersonalizedRecommendationDisplayProps {
  maxRecommendations?: number;
}

// PerformanceComparisonChart
export interface PerformanceComparisonChartProps {
  defaultChartType?: 'bar' | 'radar';
  defaultMetric?: 'accuracy' | 'time' | 'all';
}

// Common components
export interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: number | string;
  actions?: ReactNode;
  accessibilityEnabled?: boolean;
  ariaLabel?: string;
}

export interface ChartFilterProps {
  timePeriod: ChartTimePeriod;
  onTimePeriodChange: (period: ChartTimePeriod) => void;
  label?: string;
  availableTimePeriods?: ChartTimePeriod[];
}

export interface ChartRestrictedAccessProps {
  message: string;
  featureName: string;
  fallbackContent?: ReactNode;
}
```

## Data Structure Types

### Difficulty Trends

```typescript
export interface DifficultyTrendPoint {
  date: string;
  average_difficulty: number;
  user_difficulty?: number;
}

export interface DifficultyTrendsResult {
  overall: DifficultyTrendPoint[];
  by_topic: Record<string, DifficultyTrendPoint[]>;
}
```

### Topic Mastery

```typescript
export interface TopicMasteryProgressionPoint {
  date: string;
  [topic: string]: string | number; // Topic name -> mastery level
}

export interface TopicMasteryResult {
  topic_mastery: Record<string, number>; // Topic name -> mastery level (0-100)
  mastery_progression: TopicMasteryProgressionPoint[];
}
```

### Recommendations

```typescript
export interface SuggestedQuestion {
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
  suggested_questions?: SuggestedQuestion[];
  improvement_potential: number;  // 0-100 scale
}

export interface RecommendedQuestion {
  id: number;
  topic: string;
  difficulty: number;
  performance_impact: number;
  question_preview: string;
}

export interface LearningPathStep {
  title: string;
  description: string;
  estimated_time: string;
  priority: number;
  resources?: string[];
}

export interface TopicWeakness {
  topic: string;
  mastery_level: number;
  questions_attempted: number;
  accuracy: number;
  recommended_actions: string[];
}

export interface RecommendationsResult {
  recommendations: Recommendation[];
  weakTopics: TopicWeakness[];
  recommendedQuestions: RecommendedQuestion[];
  learningPath: LearningPathStep[];
}
```

### Performance Comparison

```typescript
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

export interface PerformanceInsightItem {
  title: string;
  description: string;
  metric: string;
  value: number;
  comparison: number;
  difference: number;
}

export interface PerformanceComparisonResult {
  metrics: PerformanceMetric[];
  difficulty_comparison: {
    easy: DifficultyLevelComparison;
    medium: DifficultyLevelComparison;
    hard: DifficultyLevelComparison;
  };
  overall: Array<{
    name: string;
    userValue: number;
    averageValue: number;
  }>;
  byDifficulty: Array<{
    name: string;
    userAccuracy: number;
    averageAccuracy: number;
    userTime?: number;
    averageTime?: number;
  }>;
  strengths: PerformanceInsightItem[];
  weaknesses: PerformanceInsightItem[];
}
```

## Time Period Types

```typescript
export type ChartTimePeriod = 'week' | 'month' | 'year' | 'all';
export type ApiTimePeriod = 'week' | 'month' | 'year' | undefined;
```
