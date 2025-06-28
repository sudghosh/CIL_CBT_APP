# Visualization Components Usage Examples

This document provides practical code examples for using the enhanced visualization components in the CIL CBT App.

## Table of Contents

1. [Basic Component Usage](#basic-component-usage)
2. [Dashboard Integration](#dashboard-integration)
3. [Custom Configuration](#custom-configuration)
4. [Error Handling](#error-handling)
5. [Time Period Filtering](#time-period-filtering)
6. [Access Control Handling](#access-control-handling)

## Basic Component Usage

### Importing Components

```tsx
// Import individual components
import DifficultyTrendsChart from '../components/charts/difficulty/DifficultyTrendsChart';
import TopicMasteryProgressionChart from '../components/charts/topic/TopicMasteryProgressionChart';
import PersonalizedRecommendationDisplay from '../components/charts/recommendations/PersonalizedRecommendationDisplay';
import PerformanceComparisonChart from '../components/charts/comparison/PerformanceComparisonChart';

// Or import from index
import {
  DifficultyTrendsChart,
  TopicMasteryProgressionChart,
  PersonalizedRecommendationDisplay,
  PerformanceComparisonChart
} from '../components/charts';
```

### Simple Component Examples

```tsx
// Basic usage with default props
const SimpleVisualizationExample: React.FC = () => {
  return (
    <div>
      <h2>Difficulty Trends</h2>
      <DifficultyTrendsChart />
      
      <h2>Topic Mastery</h2>
      <TopicMasteryProgressionChart />
      
      <h2>Recommendations</h2>
      <PersonalizedRecommendationDisplay />
      
      <h2>Performance Comparison</h2>
      <PerformanceComparisonChart />
    </div>
  );
};
```

## Dashboard Integration

### Grid Layout Integration

```tsx
import { Grid, Typography, Paper, Box } from '@mui/material';
import {
  DifficultyTrendsChart,
  TopicMasteryProgressionChart,
  PersonalizedRecommendationDisplay,
  PerformanceComparisonChart
} from '../components/charts';

const PerformanceDashboard: React.FC = () => {
  return (
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
  );
};
```

### Tabs Integration Example

```tsx
import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import {
  DifficultyTrendsChart,
  TopicMasteryProgressionChart,
  PersonalizedRecommendationDisplay,
  PerformanceComparisonChart
} from '../components/charts';

const TabPanel: React.FC<{ 
  children: React.ReactNode; 
  value: number; 
  index: number;
}> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`visualization-tabpanel-${index}`}
    aria-labelledby={`visualization-tab-${index}`}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const VisualizationTabs: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={handleChange} aria-label="visualization tabs">
          <Tab label="Difficulty Trends" />
          <Tab label="Topic Mastery" />
          <Tab label="Recommendations" />
          <Tab label="Performance Comparison" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabIndex} index={0}>
        <DifficultyTrendsChart enablePersonalization={true} />
      </TabPanel>
      
      <TabPanel value={tabIndex} index={1}>
        <TopicMasteryProgressionChart maxTopics={5} />
      </TabPanel>
      
      <TabPanel value={tabIndex} index={2}>
        <PersonalizedRecommendationDisplay maxRecommendations={5} />
      </TabPanel>
      
      <TabPanel value={tabIndex} index={3}>
        <PerformanceComparisonChart defaultChartType="radar" />
      </TabPanel>
    </Box>
  );
};
```

## Custom Configuration

### DifficultyTrendsChart

```tsx
// With personalization disabled (only showing global data)
<DifficultyTrendsChart enablePersonalization={false} />

// With personalization enabled (showing user-specific data if available)
<DifficultyTrendsChart enablePersonalization={true} />
```

### TopicMasteryProgressionChart

```tsx
// Limit to 3 topics
<TopicMasteryProgressionChart maxTopics={3} />

// Default (shows all topics)
<TopicMasteryProgressionChart />
```

### PersonalizedRecommendationDisplay

```tsx
// Show only top 3 recommendations
<PersonalizedRecommendationDisplay maxRecommendations={3} />

// Default (shows all recommendations)
<PersonalizedRecommendationDisplay />
```

### PerformanceComparisonChart

```tsx
// Start with radar chart view
<PerformanceComparisonChart defaultChartType="radar" />

// Start with bar chart view
<PerformanceComparisonChart defaultChartType="bar" />

// Focus on accuracy metrics
<PerformanceComparisonChart defaultMetric="accuracy" />

// Focus on time metrics
<PerformanceComparisonChart defaultMetric="time" />

// Show all metrics
<PerformanceComparisonChart defaultMetric="all" />

// Combined configuration
<PerformanceComparisonChart 
  defaultChartType="radar" 
  defaultMetric="accuracy" 
/>
```

## Error Handling

### Manual Error State Handling

```tsx
import { useState, useEffect } from 'react';
import { DifficultyTrendsChart } from '../components/charts';
import { getDifficultyTrends } from '../services/api';
import { DifficultyTrendsResponse } from '../types/visualizations';

const DifficultyTrendsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DifficultyTrendsResponse | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getDifficultyTrends('month');
        if (result.status === 'error') {
          setError(result.message || 'Failed to load data');
          setData(null);
        } else {
          setData(result);
          setError(null);
        }
      } catch (err) {
        setError('An unexpected error occurred');
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Based on API response status
  if (data?.status === 'error' || error) {
    return <div>Error: {data?.message || error}</div>;
  }
  
  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <DifficultyTrendsChart enablePersonalization={true} />
      )}
    </div>
  );
};
```

## Time Period Filtering

### Using ChartFilter Component

```tsx
import { useState } from 'react';
import { Box } from '@mui/material';
import { ChartFilter } from '../components/charts';
import { DifficultyTrendsChart } from '../components/charts';
import { ChartTimePeriod } from '../types/visualizations';

const FilterableChart: React.FC = () => {
  const [timePeriod, setTimePeriod] = useState<ChartTimePeriod>('month');
  
  const handleTimePeriodChange = (period: ChartTimePeriod) => {
    setTimePeriod(period);
    // This would typically trigger a data fetch with the new period
    // fetchDifficultyTrends(period);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ChartFilter 
          timePeriod={timePeriod} 
          onTimePeriodChange={handleTimePeriodChange}
          label="Time Range"
        />
      </Box>
      
      {/* The component would use the timePeriod internally */}
      <DifficultyTrendsChart enablePersonalization={true} />
    </Box>
  );
};
```

## Access Control Handling

### Using ChartRestrictedAccess Component

```tsx
import { Box } from '@mui/material';
import { ChartRestrictedAccess } from '../components/charts';
import { PersonalizedRecommendationDisplay } from '../components/charts';

interface AccessControlWrapperProps {
  hasAccess: boolean;
}

const AccessControlWrapper: React.FC<AccessControlWrapperProps> = ({ hasAccess }) => {
  if (!hasAccess) {
    return (
      <ChartRestrictedAccess
        message="Access to personalized recommendations requires authorization."
        featureName="Personalized Recommendations"
        fallbackContent={
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <p>Contact your administrator to request access to personalized recommendations.</p>
          </Box>
        }
      />
    );
  }
  
  return <PersonalizedRecommendationDisplay />;
};

// Usage example
const RecommendationsPage: React.FC = () => {
  // This would come from your auth system
  const userHasAccess = checkUserAccess();
  
  return (
    <Box sx={{ p: 3 }}>
      <h2>Your Recommendations</h2>
      <AccessControlWrapper hasAccess={userHasAccess} />
    </Box>
  );
};
```

This document provides examples of how to use the visualization components in various contexts. For more detailed API information, refer to the main documentation and TypeScript interface reference.
