/**
 * TopicPerformanceChart Component
 * 
 * Displays topic performance data as an interactive bar chart
 * using Recharts library for consistent, responsive visualizations.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import { TopicPerformance } from '../../types';

/**
 * Props for TopicPerformanceChart component
 */
export interface TopicPerformanceChartProps {
  /** Topic performance data */
  data: TopicPerformance[];
  /** Chart title */
  title?: string;
  /** Chart height in pixels */
  height?: number;
  /** Maximum number of topics to display */
  maxTopics?: number;
  /** Show card wrapper */
  showCard?: boolean;
}

/**
 * Custom tooltip component for better UX
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 2,
        }}
      >
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          {label}
        </Typography>
        <Typography variant="body2" color="primary.main">
          Accuracy: {data.accuracyPercentage.toFixed(1)}%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Questions: {data.correctAnswers}/{data.totalQuestions}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Avg Response: {data.averageResponseTimeSeconds.toFixed(1)}s
        </Typography>
        {data.masteryLevel !== undefined && (
          <Typography variant="body2" color="success.main">
            Mastery: {data.masteryLevel}%
          </Typography>
        )}
      </Box>
    );
  }
  return null;
};

/**
 * TopicPerformanceChart component
 */
export const TopicPerformanceChart: React.FC<TopicPerformanceChartProps> = ({
  data,
  title = 'Topic Performance',
  height = 300,
  maxTopics = 10,
  showCard = true,
}) => {
  const theme = useTheme();
  
  // Prepare chart data - limit and sort by accuracy
  const chartData = React.useMemo(() => {
    return data
      .slice(0, maxTopics)
      .sort((a, b) => b.accuracyPercentage - a.accuracyPercentage)
      .map(topic => ({
        ...topic,
        // Truncate long topic names for better display
        displayName: topic.topic.length > 20 
          ? topic.topic.substring(0, 17) + '...' 
          : topic.topic,
      }));
  }, [data, maxTopics]);

  // Generate colors based on performance
  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return theme.palette.success.main;
    if (accuracy >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // Chart content
  const chartContent = (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="displayName"
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
            stroke={theme.palette.text.secondary}
          />
          <YAxis
            domain={[0, 100]}
            fontSize={12}
            stroke={theme.palette.text.secondary}
            label={{ 
              value: 'Accuracy (%)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: theme.palette.text.secondary }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="accuracyPercentage"
            radius={[4, 4, 0, 0]}
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.accuracyPercentage)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  // Return with or without card wrapper
  if (!showCard) {
    return chartContent;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {title}
        </Typography>
        {data.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height,
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">
              No topic performance data available
            </Typography>
          </Box>
        ) : (
          chartContent
        )}
      </CardContent>
    </Card>
  );
};

export default TopicPerformanceChart;
