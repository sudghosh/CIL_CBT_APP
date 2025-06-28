# Enhanced Visualization Components Documentation

## Overview

This document provides detailed documentation for the enhanced frontend visualization components implemented in the CIL CBT App. These components deliver interactive, data-driven charts for analyzing user test performance and are integrated into the Performance Dashboard.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Core Components](#core-components)
3. [Visualization Components](#visualization-components)
4. [TypeScript Interfaces](#typescript-interfaces)
5. [API Integration](#api-integration)
6. [Usage Examples](#usage-examples)
7. [Access Control](#access-control)
8. [Testing](#testing)
9. [Future Enhancements](#future-enhancements)

## Component Architecture

The visualization system follows a modular architecture for maintainability and code organization:

```
src/
├── components/
│   └── charts/
│       ├── __tests__/                 # Unit tests for components
│       ├── comparison/                # Performance comparison charts
│       │   └── PerformanceComparisonChart.tsx
│       ├── difficulty/                # Difficulty analysis charts
│       │   └── DifficultyTrendsChart.tsx
│       ├── recommendations/           # Recommendation visualization
│       │   └── PersonalizedRecommendationDisplay.tsx
│       ├── topic/                     # Topic mastery charts
│       │   └── TopicMasteryProgressionChart.tsx
│       ├── ChartContainer.tsx         # Shared container component
│       ├── ChartFilter.tsx            # Time period filtering
│       ├── ChartRestrictedAccess.tsx  # Access control component
│       ├── chartTheme.ts              # Shared styling constants
│       ├── index.ts                   # Export file
│       └── types.ts                   # Local chart types
├── types/
│   ├── index.ts                       # Type exports
│   └── visualizations.ts              # Centralized type definitions
└── services/
    └── api.ts                         # API service with typed responses
```

## Core Components

### ChartContainer

`ChartContainer` is a wrapper component that provides consistent styling and handling for all chart components:

- **Purpose**: Manages loading, error, and empty states for chart components
- **Features**:
  - Consistent styling and layout
  - Loading spinner for data fetching
  - Error alerts for API failures
  - Empty state messages
  - Responsive sizing
  - Accessibility support
  
**Props**:
```typescript
interface ChartContainerProps {
  title: string;                         // Chart title
  description?: string;                  // Optional description
  children: ReactNode;                   // Chart content
  loading?: boolean;                     // Loading state
  error?: string | null;                 // Error message
  isEmpty?: boolean;                     // Empty data state
  emptyMessage?: string;                 // Custom empty state message
  height?: number | string;              // Chart height
  actions?: ReactNode;                   // Optional actions (filters, buttons)
  accessibilityEnabled?: boolean;        // Accessibility features
  ariaLabel?: string;                    // ARIA label for screen readers
}
```

### ChartFilter

`ChartFilter` provides consistent time period filtering across chart components:

- **Purpose**: Allow users to filter chart data by different time periods
- **Features**:
  - Consistent UI for time filtering
  - Support for week, month, year, and all-time views
  - Custom filter options
  
**Props**:
```typescript
interface ChartFilterProps {
  timePeriod: ChartTimePeriod;           // Current time period
  onTimePeriodChange: (period: ChartTimePeriod) => void;  // Change handler
  label?: string;                        // Custom label
  availableTimePeriods?: ChartTimePeriod[];  // Filter options
}
```

### ChartRestrictedAccess

`ChartRestrictedAccess` handles display for user-specific features with access control:

- **Purpose**: Display appropriate messages for features with access restrictions
- **Features**:
  - Friendly restriction messages
  - Optional fallback content
  - Contact admin information
  
**Props**:
```typescript
interface ChartRestrictedAccessProps {
  message: string;                      // Access restriction message
  featureName: string;                  // Name of the feature
  fallbackContent?: ReactNode;          // Content to show for non-allowed users
}
```

## Visualization Components

### DifficultyTrendsChart

Visualizes how question difficulty changes over time, comparing user-specific and global average difficulty.

- **Purpose**: Track difficulty progression over time
- **Features**:
  - Line chart visualization
  - User vs. global comparison
  - Topic filtering
  - Time period filtering
  - Personalization toggle
  
**Props**:
```typescript
interface DifficultyTrendsChartProps {
  enablePersonalization?: boolean;      // Toggle user-specific data
}
```

**API Endpoint**: `/performance/difficulty-trends`

### TopicMasteryProgressionChart

Visualizes the user's mastery progression across different topics over time.

- **Purpose**: Show topic mastery improvement 
- **Features**:
  - Multiple chart type views (line/radar)
  - Topic filtering and selection
  - Time period filtering
  - Color-coded topic visualization
  - Tooltips with detailed information
  
**Props**:
```typescript
interface TopicMasteryProgressionChartProps {
  maxTopics?: number;                   // Maximum topics to display
}
```

**API Endpoint**: `/performance/topic-mastery`

### PersonalizedRecommendationDisplay

Visualizes personalized test recommendations with accompanying charts and metrics.

- **Purpose**: Show actionable recommendations based on user performance
- **Features**:
  - Recommendation cards with topic and difficulty info
  - Bar charts for improvement potential
  - RadialBar charts for topic priority
  - Topic weakness analysis
  - Learning path visualization
  
**Props**:
```typescript
interface PersonalizedRecommendationDisplayProps {
  maxRecommendations?: number;          // Maximum recommendations to show
}
```

**API Endpoint**: `/performance/recommendations`

### PerformanceComparisonChart

Compares the user's performance against overall averages across different metrics.

- **Purpose**: Benchmark user performance against averages
- **Features**:
  - Multiple chart type views (bar/radar)
  - Metric filtering (accuracy/time/all)
  - Strength and weakness identification
  - Difficulty level breakdown
  
**Props**:
```typescript
interface PerformanceComparisonChartProps {
  defaultChartType?: 'bar' | 'radar';   // Default chart type
  defaultMetric?: 'accuracy' | 'time' | 'all';  // Default metric
}
```

**API Endpoint**: `/performance/performance-comparison`

## TypeScript Interfaces

All TypeScript interfaces for visualization components are centralized in `src/types/visualizations.ts`:

### API Response Types

```typescript
// Base response structure
export type ResponseStatus = 'success' | 'error';

export interface ApiResponse<T> {
  status: ResponseStatus;
  message?: string;
  data: T | null;
}

// Specific response types
export type DifficultyTrendsResponse = ApiResponse<DifficultyTrendsResult>;
export type TopicMasteryResponse = ApiResponse<TopicMasteryResult>;
export type RecommendationsResponse = ApiResponse<RecommendationsResult>;
export type PerformanceComparisonResponse = ApiResponse<PerformanceComparisonResult>;
```

### Data Structure Types

```typescript
// Difficulty trends
export interface DifficultyTrendPoint {
  date: string;
  average_difficulty: number;
  user_difficulty?: number;
}

export interface DifficultyTrendsResult {
  overall: DifficultyTrendPoint[];
  by_topic: Record<string, DifficultyTrendPoint[]>;
}

// Topic mastery
export interface TopicMasteryProgressionPoint {
  date: string;
  [topic: string]: string | number;
}

export interface TopicMasteryResult {
  topic_mastery: Record<string, number>;
  mastery_progression: TopicMasteryProgressionPoint[];
}

// Recommendations
export interface Recommendation {
  topic: string;
  subtopic?: string;
  difficulty: number;
  importance: number;
  recommendation_type: 'practice' | 'review' | 'focus';
  description: string;
  suggested_questions?: SuggestedQuestion[];
  improvement_potential: number;
}

// Performance comparison
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

### Time Period Types

```typescript
export type ChartTimePeriod = 'week' | 'month' | 'year' | 'all';
export type ApiTimePeriod = 'week' | 'month' | 'year' | undefined;
```

## API Integration

The visualization components integrate with backend API endpoints to fetch data:

### API Endpoints

| Endpoint | Purpose | Access Control |
|----------|---------|---------------|
| `/performance/difficulty-trends` | Difficulty trends data | Global data for all, user data for allowed users |
| `/performance/topic-mastery` | Topic mastery data | Only allowed users |
| `/performance/recommendations` | Personalized recommendations | Only allowed users |
| `/performance/performance-comparison` | Performance comparison data | Only allowed users |

### API Service Integration

The API service layer (`api.ts`) provides typed functions for all visualization endpoints:

```typescript
// Example API service function
export const getDifficultyTrends = async (
  timePeriod?: ApiTimePeriod
): Promise<DifficultyTrendsResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/performance/difficulty-trends`, {
      params: { period: timePeriod },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      return {
        status: 'error',
        message: 'Access restricted. Contact administrator for access.',
        data: null,
      };
    }
    return {
      status: 'error',
      message: 'Failed to fetch difficulty trends data',
      data: null,
    };
  }
};
```

## Usage Examples

### Basic Component Usage

```tsx
// Basic usage
import { 
  DifficultyTrendsChart, 
  TopicMasteryProgressionChart,
  PersonalizedRecommendationDisplay,
  PerformanceComparisonChart 
} from '../components/charts';

// In your component:
<DifficultyTrendsChart />

// With personalization disabled
<DifficultyTrendsChart enablePersonalization={false} />

// With maximum topics limited
<TopicMasteryProgressionChart maxTopics={5} />
```

### Dashboard Integration

The PerformanceDashboard component integrates all visualization components:

```tsx
<Paper elevation={3} sx={{ p: 3, mt: 4 }}>
  <Box sx={{ mb: 3 }}>
    <Typography variant="h5" sx={{ mb: 1 }}>
      Enhanced Performance Visualizations
    </Typography>
    <Typography variant="body2" color="text.secondary">
      These advanced visualizations provide deeper insights into your performance trends and patterns.
    </Typography>
  </Box>
  
  <Grid container spacing={4}>
    {/* Difficulty Trends Chart */}
    <Grid item xs={12} md={6}>
      <DifficultyTrendsChart enablePersonalization={true} />
    </Grid>
    
    {/* Topic Mastery Progression Chart */}
    <Grid item xs={12} md={6}>
      <TopicMasteryProgressionChart />
    </Grid>
    
    {/* Performance Comparison Chart */}
    <Grid item xs={12} md={6}>
      <PerformanceComparisonChart />
    </Grid>
    
    {/* Personalized Recommendations */}
    <Grid item xs={12} md={6}>
      <PersonalizedRecommendationDisplay />
    </Grid>
  </Grid>
</Paper>
```

## Access Control

The visualization system implements user-specific access control:

1. **Backend Access Control**:
   - The `/performance/recommendations` and `/performance/performance-comparison` endpoints restrict personalized data to authenticated users whose email is in the allowed list
   - The `/performance/difficulty-trends` endpoint returns global data for all users, but user-specific data only for allowed users
   - The `/performance/topic-mastery` endpoint only returns full data for allowed users

2. **Frontend Handling**:
   - `ChartRestrictedAccess` component displays appropriate messages for restricted features
   - Components handle 403 errors gracefully
   - Non-allowed users see helpful messages about contacting administrators

## Testing

The visualization components include comprehensive unit tests:

- **Component Tests**:
  - `ChartContainer.test.tsx` - Tests loading, error, and empty states
  - `ChartRestrictedAccess.test.tsx` - Tests access restriction handling
  - `ChartFilter.test.tsx` - Tests time period filtering
  - `DifficultyTrendsChart.test.tsx` - Tests chart rendering and data handling
  
- **Test Coverage**:
  - Component rendering
  - Data handling
  - User interactions
  - Error states
  - Access restrictions
  - Responsiveness
  - Accessibility

## Future Enhancements

Potential future enhancements to consider:

1. **Additional Chart Types**:
   - Scatter plots for correlation analysis
   - Bubble charts for multi-dimensional data
   - Sankey diagrams for learning path visualization

2. **Advanced Features**:
   - Data export functionality
   - Custom chart theming
   - Drill-down capabilities
   - Annotation features
   - AI-powered insights

3. **Interactive Improvements**:
   - Advanced filtering options
   - Chart comparison views
   - Custom date ranges
   - Cross-chart interactions
