import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tabs,
  Tab,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { usePerformanceData } from './hooks/usePerformanceData';
import { 
  MetricCard,
  TopicPerformanceChart,
  DifficultyChart,
  DashboardErrorBoundary 
} from './components';
import { TimePeriod } from './types';
import { formatPercentage, formatTime, formatNumber } from './utils';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import QuizIcon from '@mui/icons-material/Quiz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';

/**
 * Tab panel component for dashboard sections
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Enhanced Performance Dashboard component using modular components
 * 
 * Features:
 * - Uses new modular component architecture
 * - Interactive charts with Recharts
 * - Error boundaries for resilience
 * - Tabbed interface for better organization
 * - Enhanced metrics with trend indicators
 * - Professional data formatting
 */
export const PerformanceDashboardEnhanced: React.FC = () => {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [tabValue, setTabValue] = useState(0);
  
  const {
    data,
    isLoading,
    isError,
    error,
    loadingState,
    errorState,
    refetch,
  } = usePerformanceData({
    userId: user?.user_id,
    timePeriod,
    enabled: !!user,
  });

  // Handle time period change
  const handleTimePeriodChange = (event: SelectChangeEvent) => {
    setTimePeriod(event.target.value as TimePeriod);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Show authentication check while user loads
  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading user data...
        </Typography>
      </Box>
    );
  }

  return (
    <DashboardErrorBoundary componentName="PerformanceDashboard">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Performance Dashboard
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Time Period Filter */}
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={timePeriod}
                onChange={handleTimePeriodChange}
                label="Period"
              >
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </Select>
            </FormControl>
            
            {/* Refresh Button */}
            <IconButton 
              onClick={refetch} 
              disabled={isLoading}
              title="Refresh data"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {loadingState.message}
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {isError && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            icon={<ErrorOutlineIcon />}
            action={
              <IconButton color="inherit" size="small" onClick={refetch}>
                <RefreshIcon />
              </IconButton>
            }
          >
            <Typography variant="body2">
              {errorState.message || 'Failed to load performance data'}
            </Typography>
          </Alert>
        )}

        {/* Dashboard Content */}
        {data ? (
          <>
            {/* Key Metrics Row - Using MetricCard Components */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <DashboardErrorBoundary componentName="MetricCard-Tests">
                  <MetricCard
                    title="Tests Taken"
                    value={formatNumber(data.metrics.totalTestsTaken)}
                    subtitle={`${timePeriod} performance`}
                    icon={<AssessmentIcon sx={{ fontSize: 40 }} />}
                    color="primary"
                    trend="up"
                    trendValue={12.5}
                  />
                </DashboardErrorBoundary>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DashboardErrorBoundary componentName="MetricCard-Questions">
                  <MetricCard
                    title="Questions Attempted"
                    value={formatNumber(data.metrics.totalQuestionsAttempted)}
                    subtitle="Total across all tests"
                    icon={<QuizIcon sx={{ fontSize: 40 }} />}
                    color="secondary"
                    trend="up"
                    trendValue={8.3}
                  />
                </DashboardErrorBoundary>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DashboardErrorBoundary componentName="MetricCard-Score">
                  <MetricCard
                    title="Average Score"
                    value={formatPercentage(data.metrics.averageScorePercentage)}
                    subtitle="Overall performance"
                    icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
                    color="success"
                    trend={data.metrics.averageScorePercentage >= 75 ? 'up' : 'flat'}
                    trendValue={data.metrics.averageScorePercentage >= 75 ? 5.2 : 0}
                    chip={{
                      label: data.metrics.averageScorePercentage >= 80 ? 'Excellent' : 
                             data.metrics.averageScorePercentage >= 60 ? 'Good' : 'Needs Improvement',
                      color: data.metrics.averageScorePercentage >= 80 ? 'success' : 
                             data.metrics.averageScorePercentage >= 60 ? 'warning' : 'error'
                    }}
                  />
                </DashboardErrorBoundary>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DashboardErrorBoundary componentName="MetricCard-Time">
                  <MetricCard
                    title="Avg Response Time"
                    value={formatTime(data.metrics.averageResponseTimeSeconds)}
                    subtitle="Per question"
                    icon={<TimerIcon sx={{ fontSize: 40 }} />}
                    color="warning"
                    trend={data.metrics.averageResponseTimeSeconds <= 30 ? 'down' : 'up'}
                    trendValue={data.metrics.averageResponseTimeSeconds <= 30 ? -3.1 : 2.4}
                  />
                </DashboardErrorBoundary>
              </Grid>
            </Grid>

            {/* Tabbed Interface for Charts */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
                <Tab 
                  label="Topic Performance" 
                  icon={<BarChartIcon />} 
                  iconPosition="start"
                  id="dashboard-tab-0"
                  aria-controls="dashboard-tabpanel-0"
                />
                <Tab 
                  label="Difficulty Analysis" 
                  icon={<PieChartIcon />} 
                  iconPosition="start"
                  id="dashboard-tab-1"
                  aria-controls="dashboard-tabpanel-1"
                />
              </Tabs>
            </Box>

            {/* Topic Performance Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <DashboardErrorBoundary componentName="TopicPerformanceChart">
                    <TopicPerformanceChart
                      data={data.topicPerformance}
                      title={`Topic Performance - ${timePeriod.toUpperCase()}`}
                      height={400}
                      maxTopics={8}
                    />
                  </DashboardErrorBoundary>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Difficulty Analysis Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <DashboardErrorBoundary componentName="DifficultyChart">
                    <DifficultyChart
                      data={data.difficultyMetrics}
                      title={`Difficulty Performance - ${timePeriod.toUpperCase()}`}
                      height={400}
                    />
                  </DashboardErrorBoundary>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <DashboardErrorBoundary componentName="TestTypeComparison">
                    <MetricCard
                      title="Adaptive vs Standard"
                      value={`${data.testTypeComparison.adaptive.testsCount + data.testTypeComparison.standard.testsCount}`}
                      subtitle="Total tests taken"
                      color="primary"
                    />
                    <Box sx={{ mt: 2 }}>
                      <MetricCard
                        title="Adaptive Tests"
                        value={formatPercentage(data.testTypeComparison.adaptive.averageScore)}
                        subtitle={`${data.testTypeComparison.adaptive.testsCount} tests`}
                        color="primary"
                        trend="up"
                        trendValue={4.2}
                      />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <MetricCard
                        title="Standard Tests"
                        value={formatPercentage(data.testTypeComparison.standard.averageScore)}
                        subtitle={`${data.testTypeComparison.standard.testsCount} tests`}
                        color="secondary"
                        trend="flat"
                        trendValue={0.8}
                      />
                    </Box>
                  </DashboardErrorBoundary>
                </Grid>
              </Grid>
            </TabPanel>
          </>
        ) : !isLoading && !isError && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              No performance data available. Start taking tests to see your analytics!
            </Typography>
          </Alert>
        )}
      </Box>
    </DashboardErrorBoundary>
  );
};
