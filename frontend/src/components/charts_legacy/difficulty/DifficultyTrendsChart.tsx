import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Box, Typography, Divider } from '@mui/material';

import { performanceAPI } from '../../../services/api';
import { ChartContainer } from '../ChartContainer';
import { ChartFilter, ChartTimePeriod } from '../ChartFilter';
import { ChartRestrictedAccess } from '../ChartRestrictedAccess';
import { CHART_COLORS, CHART_MARGIN } from '../utils/chartConstants';
import { ApiTimePeriod, DifficultyTrendsResponse } from '../../../types/visualizations';
import { logChartApiError, logChartDataError } from '../../../utils/chartErrorLogger';

interface DifficultyTrendsChartProps {
  /**
   * Whether to enable access to personalized data
   */
  enablePersonalization?: boolean;
}

/**
 * Component for visualizing difficulty trends over time
 */
const DifficultyTrendsChart: React.FC<DifficultyTrendsChartProps> = ({
  enablePersonalization = true
}) => {
  // State
  const [timePeriod, setTimePeriod] = useState<ChartTimePeriod>('month');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DifficultyTrendsResponse | null>(null);
  // Convert ChartTimePeriod to ApiTimePeriod
  const getApiTimePeriod = useCallback((chartPeriod: ChartTimePeriod): ApiTimePeriod => {
    switch(chartPeriod) {
      case 'week': return 'week';
      case 'month': return 'month';
      case 'year': return 'year';
      case 'all': return undefined;
      default: return 'month';
    }
  }, []);
    // Fetch data
  useEffect(() => {
    const fetchDifficultyTrends = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await performanceAPI.getDifficultyTrends({ 
          timePeriod: getApiTimePeriod(timePeriod) 
        });
        setData(result);
        
        if (result.status === 'error') {
          // Log the error for monitoring
          logChartDataError(
            'DifficultyTrendsChart',
            result.message || 'Failed to load difficulty trends data',
            { result, timePeriod }
          );
          
          setError(result.message || 'Failed to load difficulty trends data');
        }
      } catch (err) {
        // Log the API error with context
        logChartApiError(
          'DifficultyTrendsChart',
          '/performance/difficulty-trends',
          err,
          { timePeriod, enablePersonalization }
        );
        
        console.error('Error fetching difficulty trends:', err);
        setError('An unexpected error occurred while fetching difficulty trends data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDifficultyTrends();
  }, [timePeriod, getApiTimePeriod]);
  
  // Handle time period change
  const handleTimePeriodChange = (newPeriod: ChartTimePeriod) => {
    setTimePeriod(newPeriod);
  };
  
  // Check for personalized data access
  const hasPersonalizedData = data?.data?.overall?.some(item => item.user_difficulty !== undefined);
  const isAccessRestricted = enablePersonalization && data?.status === 'error' && data?.message?.includes('access');
  const isEmpty = !loading && !error && (!data?.data?.overall || data.data.overall.length === 0);
  
  // Chart filters component
  const chartFilters = (
    <ChartFilter
      timePeriod={timePeriod}
      onTimePeriodChange={handleTimePeriodChange}
      availableTimePeriods={['week', 'month', 'year', 'all']}
    />
  );
  
  // If access is restricted, show restricted access message with fallback
  if (isAccessRestricted) {
    return (
      <ChartContainer
        title="Difficulty Trends"
        description="Track how question difficulty changes over time"
        loading={loading}
        error={null}
        isEmpty={isEmpty}
        actions={chartFilters}
        height={350}
      >
        <Box>
          <ChartRestrictedAccess
            message={data?.message || 'You do not have access to personalized difficulty data.'}
            featureName="Personalized Difficulty Trends"
            fallbackContent={
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Showing global difficulty trends for all users.
                </Typography>
                <LineChart
                  data={data?.data?.overall || []}
                  margin={CHART_MARGIN}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis domain={[0, 10]} />                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const label = name === "average_difficulty" ? "Global Average" : 
                                  name === "user_difficulty" ? "Your Rating" : name;
                      return [value.toFixed(1), label];
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="average_difficulty"
                    name="Global Average"
                    stroke={CHART_COLORS.primary}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </>
            }
          />
        </Box>
      </ChartContainer>
    );
  }
  
  return (
    <ChartContainer
      title="Difficulty Trends"
      description="Track how question difficulty changes over time"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      actions={chartFilters}
      height={350}
      ariaLabel="Chart showing difficulty trends over time"
    >
      <LineChart
        data={data?.data?.overall || []}
        margin={CHART_MARGIN}
        accessibilityLayer
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        />
        <YAxis domain={[0, 10]} />
        <Tooltip
          formatter={(value: number, name: string) => {
            const label = name === "average_difficulty" ? "Global Average" : 
                         name === "user_difficulty" ? "Your Rating" : name;
            return [value.toFixed(1), label];
          }}
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #ccc',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="average_difficulty"
          name="Global Average"
          stroke={CHART_COLORS.primary}
          activeDot={{ r: 8 }}
          strokeWidth={2}
        />
        {hasPersonalizedData && (
          <Line
            type="monotone"
            dataKey="user_difficulty"
            name="Your Rating"
            stroke={CHART_COLORS.secondary}
            activeDot={{ r: 6 }}
            strokeWidth={2}
          />
        )}
        <ReferenceLine y={5} stroke="#888" strokeDasharray="3 3" />
      </LineChart>
    </ChartContainer>
  );
};

export default DifficultyTrendsChart;
