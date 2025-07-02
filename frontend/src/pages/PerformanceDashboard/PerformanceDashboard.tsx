import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { usePerformanceData } from './hooks/usePerformanceData';
import { TimePeriod } from './types';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import QuizIcon from '@mui/icons-material/Quiz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import { PerformanceDashboardEnhanced } from './PerformanceDashboardEnhanced';
import { 
  AITrendAnalysisTab, 
  AIPerformanceInsightsTab, 
  AIQuestionRecommendationsTab 
} from './components/AIPerformanceTabs';

/**
 * Tab panel component for dashboard sections
 */
function TabPanel({ children, value, index, ...other }: { children?: React.ReactNode; value: number; index: number }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Combined Performance Dashboard with tabs for legacy and enhanced dashboards
 */
export const PerformanceDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
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
    <Box sx={{ p: 3 }}>
      {/* Tabs for dashboard selection */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="Performance Dashboard" id="dashboard-tab-0" aria-controls="dashboard-tabpanel-0" />
          <Tab label="Enhanced Performance Dashboard" id="dashboard-tab-1" aria-controls="dashboard-tabpanel-1" />
          <Tab label="AI Performance Insights" id="dashboard-tab-2" aria-controls="dashboard-tabpanel-2" />
        </Tabs>
      </Box>
      {/* Tab 1: Legacy Dashboard */}
      <TabPanel value={tabValue} index={0}>
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
                onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                label="Period"
              >
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </Select>
            </FormControl>
            {/* Refresh Button */}
            <IconButton onClick={refetch} disabled={isLoading} title="Refresh data">
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
          <Grid container spacing={3}>
            {/* Key Metrics Row */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Overall Performance
              </Typography>
              <Grid container spacing={2}>
                {/* Total Tests */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography color="text.secondary" gutterBottom>
                            Tests Taken
                          </Typography>
                          <Typography variant="h4">
                            {data.metrics.totalTestsTaken}
                          </Typography>
                        </Box>
                        <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Total Questions */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography color="text.secondary" gutterBottom>
                            Questions Attempted
                          </Typography>
                          <Typography variant="h4">
                            {data.metrics.totalQuestionsAttempted}
                          </Typography>
                        </Box>
                        <QuizIcon sx={{ fontSize: 40, color: 'info.main' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Average Score */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography color="text.secondary" gutterBottom>
                            Average Score
                          </Typography>
                          <Typography variant="h4">
                            {data.metrics.averageScorePercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Average Response Time */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography color="text.secondary" gutterBottom>
                            Avg Response Time
                          </Typography>
                          <Typography variant="h4">
                            {data.metrics.averageResponseTimeSeconds.toFixed(1)}s
                          </Typography>
                        </Box>
                        <TimerIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Test Type Comparison */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Test Type Performance
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">
                        Adaptive Tests
                      </Typography>
                      <Chip
                        label={`${data.testTypeComparison.adaptive.testsCount} tests`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    <Typography variant="h6" color="primary.main">
                      {data.testTypeComparison.adaptive.averageScore.toFixed(1)}% avg score
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, mt: 2 }}>
                      <Typography variant="body2">
                        Standard Tests
                      </Typography>
                      <Chip
                        label={`${data.testTypeComparison.standard.testsCount} tests`}
                        size="small"
                        color="secondary"
                      />
                    </Box>
                    <Typography variant="h6" color="secondary.main">
                      {data.testTypeComparison.standard.averageScore.toFixed(1)}% avg score
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Difficulty Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance by Difficulty
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {Object.entries(data.difficultyMetrics).map(([level, metrics]) => (
                      <Box key={level} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {level}
                          </Typography>
                          <Chip
                            label={`${metrics.questionsCount} questions`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={metrics.accuracy}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {metrics.accuracy.toFixed(1)}% accuracy
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Topic Performance Preview */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Performing Topics
                  </Typography>
                  <Grid container spacing={2}>
                    {data.topicPerformance.slice(0, 4).map((topic, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {topic.topic}
                          </Typography>
                          <Typography variant="h5" color="primary.main">
                            {topic.accuracyPercentage.toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {topic.correctAnswers}/{topic.totalQuestions} correct
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : !isLoading && !isError && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              No performance data available. Start taking tests to see your analytics!
            </Typography>
          </Alert>
        )}
      </TabPanel>
      {/* Tab 2: Enhanced Dashboard */}
      <TabPanel value={tabValue} index={1}>
        <PerformanceDashboardEnhanced />
      </TabPanel>
      
      {/* Tab 3: AI Performance Insights */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="h4" gutterBottom>
            AI-Powered Performance Insights
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Leverage artificial intelligence to gain deeper insights into your performance patterns, 
            get personalized recommendations, and discover optimization opportunities.
          </Typography>
          
          {/* AI Trend Analysis Tab */}
          <AITrendAnalysisTab 
            userId={user?.user_id || 0} 
            userPerformanceData={data?.trends?.accuracyTrend?.map(point => ({
              date: point.date,
              score: point.value,
              topic: 'General',
              difficulty: 5,
              timeSpent: 0,
              questionCount: 0
            })) || []}
            onRetry={refetch}
          />
          
          {/* AI Performance Insights Tab */}
          <AIPerformanceInsightsTab 
            userId={user?.user_id || 0} 
            userPerformanceData={data?.topicPerformance?.map(topic => ({
              date: new Date().toISOString().split('T')[0],
              score: topic.accuracyPercentage,
              topic: topic.topic,
              difficulty: 5,
              timeSpent: 0,
              questionCount: topic.totalQuestions
            })) || []}
            onRetry={refetch}
          />
          
          {/* AI Question Recommendations Tab */}
          <AIQuestionRecommendationsTab 
            userId={user?.user_id || 0} 
            userPerformanceData={data?.topicPerformance?.map(topic => ({
              date: new Date().toISOString().split('T')[0],
              score: topic.accuracyPercentage,
              topic: topic.topic,
              difficulty: 5,
              timeSpent: 0,
              questionCount: topic.totalQuestions
            })) || []}
            onRetry={refetch}
          />
        </Box>
      </TabPanel>
    </Box>
  );
};
