/**
 * DifficultyChart Component
 * 
 * Displays difficulty performance data as a donut chart
 * showing accuracy distribution across Easy, Medium, and Hard questions.
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  Grid,
  Chip,
} from '@mui/material';
import { DifficultyMetrics } from '../../types';

/**
 * Props for DifficultyChart component
 */
export interface DifficultyChartProps {
  /** Difficulty performance data */
  data: DifficultyMetrics;
  /** Chart title */
  title?: string;
  /** Chart height in pixels */
  height?: number;
  /** Show card wrapper */
  showCard?: boolean;
  /** Show legend */
  showLegend?: boolean;
}

/**
 * Custom tooltip component
 */
const CustomTooltip = ({ active, payload }: any) => {
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
          {data.name} Questions
        </Typography>
        <Typography variant="body2" color="primary.main">
          Accuracy: {data.accuracy.toFixed(1)}%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Questions: {data.questionsCount}
        </Typography>
      </Box>
    );
  }
  return null;
};

/**
 * Custom label component for pie slices
 */
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, accuracy }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${accuracy.toFixed(0)}%`}
    </text>
  );
};

/**
 * DifficultyChart component
 */
export const DifficultyChart: React.FC<DifficultyChartProps> = ({
  data,
  title = 'Performance by Difficulty',
  height = 300,
  showCard = true,
  showLegend = true,
}) => {
  const theme = useTheme();
  
  // Prepare chart data
  const chartData = React.useMemo(() => {
    return [
      {
        name: 'Easy',
        accuracy: data.easy.accuracy,
        questionsCount: data.easy.questionsCount,
        color: theme.palette.success.main,
      },
      {
        name: 'Medium',
        accuracy: data.medium.accuracy,
        questionsCount: data.medium.questionsCount,
        color: theme.palette.warning.main,
      },
      {
        name: 'Hard',
        accuracy: data.hard.accuracy,
        questionsCount: data.hard.questionsCount,
        color: theme.palette.error.main,
      },
    ].filter(item => item.questionsCount > 0); // Only show levels with questions
  }, [data, theme]);

  // Calculate totals for summary
  const totalQuestions = chartData.reduce((sum, item) => sum + item.questionsCount, 0);
  const weightedAccuracy = chartData.reduce(
    (sum, item) => sum + (item.accuracy * item.questionsCount), 0
  ) / totalQuestions;

  // Chart content
  const chartContent = (
    <Box sx={{ width: '100%' }}>
      {/* Summary stats */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="primary.main">
              {totalQuestions}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Questions
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {weightedAccuracy.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Overall Accuracy
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {chartData.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Difficulty Levels
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Chart */}
      <Box sx={{ height, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="questionsCount"
              startAngle={90}
              endAngle={450}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </Box>

      {/* Difficulty level details */}
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={1}>
          {chartData.map((item) => (
            <Grid item xs={12} sm={4} key={item.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2">{item.name}</Typography>
                </Box>
                <Chip
                  label={`${item.accuracy.toFixed(1)}%`}
                  size="small"
                  sx={{ 
                    bgcolor: item.color, 
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
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
        {totalQuestions === 0 ? (
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
              No difficulty performance data available
            </Typography>
          </Box>
        ) : (
          chartContent
        )}
      </CardContent>
    </Card>
  );
};

export default DifficultyChart;
