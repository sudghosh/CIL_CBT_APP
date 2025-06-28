import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Box, 
  Typography, 
  ToggleButtonGroup, 
  ToggleButton
} from '@mui/material';

import { performanceAPI } from '../../../services/api';
import { ChartContainer } from '../ChartContainer';
import { ChartRestrictedAccess } from '../ChartRestrictedAccess';
import { CHART_COLORS, CHART_MARGIN } from '../utils/chartConstants';

/**
 * Performance comparison data structure
 */
interface PerformanceComparisonData {
  status: 'success' | 'error';
  message?: string;
  data: {
    // Overall comparison metrics
    metrics: Array<{
      name: string;
      user_value: number;
      average_value: number;
      description?: string;
      unit?: string;
    }>;
    // Performance by difficulty level
    difficulty_comparison: {
      easy: {
        user_accuracy: number;
        average_accuracy: number;
        user_time: number;
        average_time: number;
      };
      medium: {
        user_accuracy: number;
        average_accuracy: number;
        user_time: number;
        average_time: number;
      };
      hard: {
        user_accuracy: number;
        average_accuracy: number;
        user_time: number;
        average_time: number;
      };
    };
    // Total number of users for comparison context
    total_users?: number;
  } | null;
}

/**
 * Chart type for comparison
 */
type ChartType = 'bar' | 'radar';

/**
 * Chart metric for comparison
 */
type ChartMetric = 'accuracy' | 'time' | 'all';

interface PerformanceComparisonChartProps {
  /**
   * Default chart type
   */
  defaultChartType?: ChartType;
}

/**
 * Component for comparing user performance against overall averages
 * 
 * PRIVACY NOTICE: This component is designed to protect user privacy by:
 * - Only displaying aggregate averages, never individual user data
 * - Using anonymous labels like "Your Score" vs "Average Score"
 * - Not exposing any user names, emails, or identifiers
 * - Showing only the current user's performance compared to anonymous averages
 */
const PerformanceComparisonChart: React.FC<PerformanceComparisonChartProps> = ({
  defaultChartType = 'bar'
}) => {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PerformanceComparisonData | null>(null);
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [metric, setMetric] = useState<ChartMetric>('accuracy');
  
  // Fetch data
  useEffect(() => {
    const fetchPerformanceComparison = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await performanceAPI.getPerformanceComparison();
        setData(result);
        
        if (result.status === 'error') {
          setError(result.message || 'Failed to load performance comparison data');
        }
      } catch (err) {
        console.error('Error fetching performance comparison:', err);
        setError('An unexpected error occurred while fetching performance comparison data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPerformanceComparison();
  }, []);
  
  // Handle chart type change
  const handleChartTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newChartType: ChartType | null,
  ) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  };
  
  // Handle metric change
  const handleMetricChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMetric: ChartMetric | null,
  ) => {
    if (newMetric !== null) {
      setMetric(newMetric);
    }
  };
  
  // Check for access restriction
  const isAccessRestricted = data?.status === 'error' && data?.message?.includes('access');
  
  // Check for insufficient comparison data (less than 2 users total including current user)
  const hasInsufficientData = data?.status === 'success' && data?.data?.total_users && data.data.total_users < 2;
  
  // Check for empty data
  const isEmpty = !loading && !error && (
    !data?.data?.metrics || 
    data.data.metrics.length === 0 ||
    !data.data.difficulty_comparison
  );
  
  // Check if it's a "no data" success response
  const isNoDataResponse = data?.status === 'success' && data?.message && data.message.includes('No performance data available');
  
  // Check for network/API errors
  const hasNetworkError = error && error.includes('Could not retrieve');
  
  // Chart actions component
  const chartActions = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <ToggleButtonGroup
        value={metric}
        exclusive
        onChange={handleMetricChange}
        aria-label="comparison metric"
        size="small"
      >
        <ToggleButton value="accuracy" aria-label="Accuracy">
          Accuracy
        </ToggleButton>
        <ToggleButton value="time" aria-label="Time">
          Response Time
        </ToggleButton>
        <ToggleButton value="all" aria-label="All Metrics">
          All Metrics
        </ToggleButton>
      </ToggleButtonGroup>
      
      <ToggleButtonGroup
        value={chartType}
        exclusive
        onChange={handleChartTypeChange}
        aria-label="chart type"
        size="small"
      >
        <ToggleButton value="bar" aria-label="Bar Chart">
          Bar
        </ToggleButton>
        <ToggleButton value="radar" aria-label="Radar Chart">
          Radar
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
  
  // If there's insufficient data for meaningful comparison
  if (hasInsufficientData) {
    return (
      <ChartContainer
        title="Performance Comparison"
        description="Compare your performance against overall averages"
        loading={loading}
        error={null}
        isEmpty={true}
        height={350}
      >
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Other Users' Data Available for Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Performance comparison requires data from multiple users. Currently, there are not enough users with completed tests to provide meaningful comparison data.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This feature will become available as more users complete tests in the system.
          </Typography>
        </Box>
      </ChartContainer>
    );
  }

  // Handle network/API errors with user-friendly messages
  if (hasNetworkError || (error && !isAccessRestricted)) {
    return (
      <ChartContainer
        title="Performance Comparison"
        description="Compare your performance against overall averages"
        loading={loading}
        error={null}
        isEmpty={true}
        height={350}
      >
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Comparison Data Temporarily Unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We're unable to retrieve performance comparison data at the moment. This could be due to:
          </Typography>
          <Box sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
            <Typography variant="body2" color="text.secondary" component="li" sx={{ mb: 1 }}>
              Temporary network connectivity issues
            </Typography>
            <Typography variant="body2" color="text.secondary" component="li" sx={{ mb: 1 }}>
              System maintenance in progress
            </Typography>
            <Typography variant="body2" color="text.secondary" component="li">
              Insufficient comparison data available
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Please try refreshing the page or check back later.
          </Typography>
        </Box>
      </ChartContainer>
    );
  }

  // If access is restricted, show restricted access message
  if (isAccessRestricted) {
    return (
      <ChartContainer
        title="Performance Comparison"
        description="Compare your performance against overall averages"
        loading={loading}
        error={null}
        isEmpty={isEmpty}
        height={350}
      >
        <Box>
          <ChartRestrictedAccess
            message={data?.message || 'You do not have access to performance comparison data.'}
            featureName="Performance Comparison"
          />
        </Box>
      </ChartContainer>
    );
  }

  // If it's a "no data" response, show a helpful message
  if (isNoDataResponse || isEmpty) {
    return (
      <ChartContainer
        title="Performance Comparison"
        description="Compare your performance against overall averages"
        loading={loading}
        error={null}
        isEmpty={true}
        height={350}
      >
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Performance Data Available Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You need to complete some tests before performance comparison data can be generated.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Once you complete tests, this chart will show how your accuracy and response times compare to average performance across different difficulty levels.
          </Typography>
        </Box>
      </ChartContainer>
    );
  }
  
  // Transform data for visualization
  let chartData: any[] = [];
  
  if (data?.data?.difficulty_comparison) {
    const diffComparison = data.data.difficulty_comparison;
    
    // Create data for the selected metric
    if (metric === 'accuracy') {
      chartData = [
        {
          name: 'Easy',
          user: diffComparison.easy.user_accuracy,
          average: diffComparison.easy.average_accuracy,
          unit: '%'
        },
        {
          name: 'Medium',
          user: diffComparison.medium.user_accuracy,
          average: diffComparison.medium.average_accuracy,
          unit: '%'
        },
        {
          name: 'Hard',
          user: diffComparison.hard.user_accuracy,
          average: diffComparison.hard.average_accuracy,
          unit: '%'
        }
      ];
    } else if (metric === 'time') {
      chartData = [
        {
          name: 'Easy',
          user: diffComparison.easy.user_time,
          average: diffComparison.easy.average_time,
          unit: 's'
        },
        {
          name: 'Medium',
          user: diffComparison.medium.user_time,
          average: diffComparison.medium.average_time,
          unit: 's'
        },
        {
          name: 'Hard',
          user: diffComparison.hard.user_time,
          average: diffComparison.hard.average_time,
          unit: 's'
        }
      ];
    } else if (metric === 'all' && data.data.metrics) {
      chartData = data.data.metrics.map(m => ({
        name: m.name,
        user: m.user_value,
        average: m.average_value,
        unit: m.unit || ''
      }));
    }
  }
  
  // If using bar chart
  if (chartType === 'bar') {
    return (
      <ChartContainer
        title="Performance Comparison"
        description="Compare your performance against overall averages"
        loading={loading}
        error={error}
        isEmpty={isEmpty}
        actions={chartActions}
        height={350}
        ariaLabel="Bar chart comparing user performance against averages"
      >
        <BarChart
          data={chartData}
          margin={CHART_MARGIN}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            formatter={(value: number, name: string, props: any) => {
              const unit = props.payload.unit || '';
              return [`${value}${unit}`, name === 'user' ? 'Your Score' : 'Average Score'];
            }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc'
            }}
          />
          <Legend 
            formatter={(value) => value === 'user' ? 'Your Score' : 'Average Score'}
          />
          <Bar dataKey="user" name="user" fill={CHART_COLORS.primary} />
          <Bar dataKey="average" name="average" fill={CHART_COLORS.secondary} />
        </BarChart>
      </ChartContainer>
    );
  }
  
  // If using radar chart
  // Transform data for radar chart
  const radarData = chartData.map(item => ({
    subject: item.name,
    'Your Score': item.user,
    'Average Score': item.average,
    unit: item.unit
  }));
  
  return (
    <ChartContainer
      title="Performance Comparison"
      description="Compare your performance against overall averages"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      actions={chartActions}
      height={350}
      ariaLabel="Radar chart comparing user performance against averages"
    >
      <RadarChart outerRadius="70%" data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis />
        <Radar
          name="Your Score"
          dataKey="Your Score"
          stroke={CHART_COLORS.primary}
          fill={CHART_COLORS.primary}
          fillOpacity={0.5}
        />
        <Radar
          name="Average Score"
          dataKey="Average Score"
          stroke={CHART_COLORS.secondary}
          fill={CHART_COLORS.secondary}
          fillOpacity={0.5}
        />
        <Legend />
        <Tooltip
          formatter={(value: number, name: string, props: any) => {
            const unit = props.payload.unit || '';
            return [`${value}${unit}`, name];
          }}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #ccc'
          }}
        />
      </RadarChart>
    </ChartContainer>
  );
};

export default PerformanceComparisonChart;
