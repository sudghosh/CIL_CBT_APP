# Enhanced Visualization Components

This documentation provides an overview of the enhanced visualization components implemented for the CIL CBT App's performance dashboard.

## Table of Contents
1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Common Components](#common-components)
4. [Visualization Components](#visualization-components)
5. [Usage Examples](#usage-examples)
6. [API Integration](#api-integration)
7. [Testing](#testing)

## Overview

The enhanced visualization components provide data-driven, interactive charts for analyzing test performance. The components are built using React, TypeScript, Material-UI, and Recharts.

Key features include:
- Consistent styling and theming across all charts
- Loading, error, and empty state handling
- Access control for restricted features
- Responsive design for all screen sizes
- Interactive filters and toggles
- Accessibility support

## Component Architecture

The visualization system follows a modular architecture:

```
charts/
├── __tests__/                 # Unit tests
├── comparison/                # Performance comparison charts
├── difficulty/                # Difficulty analysis charts
├── recommendations/           # Recommendation visualization
├── topic/                     # Topic mastery charts
├── ChartContainer.tsx         # Shared container component
├── ChartFilter.tsx            # Time period filtering
├── ChartRestrictedAccess.tsx  # Access control component
├── chartTheme.ts              # Shared styling constants
├── index.ts                   # Export file
└── types.ts                   # TypeScript interfaces
```

## Common Components

### ChartContainer

A wrapper component that provides consistent styling and behavior for all charts:
- Title and description display
- Loading state with spinner
- Error state with alert
- Empty state message
- Optional action buttons/filters

**Props:**
- `title`: Chart title
- `description?`: Optional description text
- `children`: Chart component to render
- `loading?`: Whether data is loading
- `error?`: Error message if any
- `isEmpty?`: Whether data exists
- `emptyMessage?`: Custom empty state message
- `height?`: Chart height
- `accessibilityEnabled?`: Enable accessibility features
- `ariaLabel?`: ARIA label for accessibility
- `actions?`: Optional actions/filters to display

### ChartFilter

A component for filtering chart data by time period:

**Props:**
- `timePeriod`: Selected time period
- `onTimePeriodChange`: Callback for time period changes
- `label?`: Filter label
- `availableTimePeriods?`: Available time periods to display

### ChartRestrictedAccess

A component for displaying access restriction messages:

**Props:**
- `message`: Restriction message to display
- `featureName`: Name of the restricted feature
- `fallbackContent?`: Optional content to show for users without access

## Visualization Components

### DifficultyTrendsChart

Visualizes how question difficulty changes over time for both the user and the global average.

**Features:**
- Line chart showing difficulty trends
- Time period filtering
- Comparison between user and global average
- Restricted access handling

### TopicMasteryProgressionChart

Shows the user's mastery progression across different topics over time.

**Features:**
- Switchable between line chart and radar chart views
- Topic selection/filtering
- Mastery percentage visualization
- Restricted access handling

### PersonalizedRecommendationDisplay

Visualizes personalized test recommendations with accompanying charts.

**Features:**
- Recommendation cards with relevant info
- Improvement potential bar chart
- Topic priority radial chart
- Suggested questions display
- Slider to control number of recommendations shown

### PerformanceComparisonChart

Compares the user's performance against overall averages across different metrics.

**Features:**
- Switchable between bar chart and radar chart views
- Filter by metric type (accuracy, time, all)
- Difficulty level breakdown
- Restricted access handling

## Usage Examples

```tsx
// Basic usage
<DifficultyTrendsChart />

// With personalization disabled
<DifficultyTrendsChart enablePersonalization={false} />

// Topic mastery with limited topics
<TopicMasteryProgressionChart maxTopics={3} />

// Performance comparison with radar chart as default
<PerformanceComparisonChart defaultChartType="radar" />

// Recommendations with limited number
<PersonalizedRecommendationDisplay maxRecommendations={3} />
```

## API Integration

All visualization components fetch data from corresponding API endpoints:

- `/performance/difficulty-trends` - Difficulty trends data
- `/performance/topic-mastery` - Topic mastery data
- `/performance/recommendations` - Personalized recommendations
- `/performance/performance-comparison` - Performance comparison data

The API service layer handles error cases, including access restrictions, returning appropriate status and message information.

## Testing

Unit tests verify:
- Component rendering in different states (loading, error, empty, with data)
- Access restriction behavior
- Responsiveness and layout
- Accessibility compliance

Run tests with:
```
npm test
```
