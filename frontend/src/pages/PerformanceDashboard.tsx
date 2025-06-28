import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  ButtonGroup,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { performanceAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RecommendIcon from '@mui/icons-material/Recommend';

// Import types
import {
  OverallSummary,
  TopicSummary,
  ChartTimePeriod,
  ApiTimePeriod
} from '../types';
import {
  DifficultyTrendsResponse,
  TopicMasteryResponse,
  RecommendationsResponse,
  PerformanceComparisonResponse
} from '../components/charts/types';

// Import our enhanced visualization components
// Importing directly from their respective files to avoid potential circular dependencies
import DifficultyTrendsChart from '../components/charts/difficulty/DifficultyTrendsChart';
import TopicMasteryProgressionChart from '../components/charts/topic/TopicMasteryProgressionChart';
import PersonalizedRecommendationDisplay from '../components/charts/recommendations/PersonalizedRecommendationDisplay';
import PerformanceComparisonChart from '../components/charts/comparison/PerformanceComparisonChart';

// Interface for allowed email
interface AllowedEmail {
  allowed_email_id: number;
  email: string;
  added_by_admin_id: number;
  added_at: string;
}

/**
 * Displays a helpful message and fallback content when access to personalized data is restricted
 */
const RestrictedAccessFallback = ({ message, fallbackContent }: { message: string, fallbackContent?: React.ReactNode }) => {
  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        {message}
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2">
            This feature requires special permissions. You can continue using other features of the dashboard that are available to you.
          </Typography>
        </Box>
      </Alert>
      {fallbackContent && (
        <Box sx={{ mt: 2 }}>
          {fallbackContent}
        </Box>
      )}
    </>
  );
}

/**
 * Performance Dashboard component displays user performance metrics
 * across tests, question types, and difficulty levels
 * 
 * @returns React component
 */
export const PerformanceDashboard: React.FC = () => {  // State for performance data
  const [overallData, setOverallData] = useState<OverallSummary | null>(null);
  const [topicData, setTopicData] = useState<TopicSummary[]>([]);
  const [difficultyData, setDifficultyData] = useState<any>(null);
  const [timeData, setTimeData] = useState<any>(null);
    // State for enhanced visualization data
  const [difficultyTrendsData, setDifficultyTrendsData] = useState<DifficultyTrendsResponse | null>(null);
  const [difficultyTrendsError, setDifficultyTrendsError] = useState<string | null>(null);
  const [difficultyTrendsLoading, setDifficultyTrendsLoading] = useState<boolean>(false);
  
  const [topicMasteryData, setTopicMasteryData] = useState<TopicMasteryResponse | null>(null);
  const [topicMasteryError, setTopicMasteryError] = useState<string | null>(null);
  const [topicMasteryLoading, setTopicMasteryLoading] = useState<boolean>(false);
  
  const [recommendationsData, setRecommendationsData] = useState<RecommendationsResponse | null>(null);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState<boolean>(false);
  
  const [performanceComparisonData, setPerformanceComparisonData] = useState<PerformanceComparisonResponse | null>(null);
  const [performanceComparisonError, setPerformanceComparisonError] = useState<string | null>(null);
  const [performanceComparisonLoading, setPerformanceComparisonLoading] = useState<boolean>(false);
  
  // State for access control
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [accessCheckLoading, setAccessCheckLoading] = useState<boolean>(true);
  const [hasPersonalizedAccess, setHasPersonalizedAccess] = useState<boolean>(false);
  
  // State for loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
    // State for UI controls
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<ChartTimePeriod>('month');
  const [chartType, setChartType] = useState<string>('bar');
  
  // Get current user info
  const { user } = useAuth();
  
  /**
   * Check if user has access to personalized features
   */
  const checkPersonalizedAccess = async () => {
    try {
      setAccessCheckLoading(true);
      
      // If no user is authenticated, no access
      if (!user || !user.email) {
        setHasPersonalizedAccess(false);
        return;
      }
      
      // Fetch allowed emails list
      const response = await authAPI.getAllowedEmails();
      setAllowedEmails(response.data);
      
      // Check if current user's email is in the allowed list
      const isEmailAllowed = response.data.some((allowedEmail: AllowedEmail) => 
        allowedEmail.email.toLowerCase() === user.email.toLowerCase()
      );
      
      setHasPersonalizedAccess(isEmailAllowed);
    } catch (error) {
      console.error('Error checking personalized access:', error);
      // On error, default to no access for security
      setHasPersonalizedAccess(false);
    } finally {
      setAccessCheckLoading(false);
    }
  };
    /**
   * Set the default tab based on access permissions
   * If the user has no access to personalized data, select a non-restricted tab
   */
  useEffect(() => {
    // If current tab is personalized and user doesn't have access, switch to a non-restricted tab
    if ((currentTab === 3 || currentTab === 4) && !hasPersonalizedAccess && !accessCheckLoading) {
      setCurrentTab(0); // Switch to Difficulty Analysis tab
    }
  }, [hasPersonalizedAccess, accessCheckLoading, currentTab]);

  /**
   * Fetch performance data when component mounts
   */
  useEffect(() => {
    fetchPerformanceData();
    checkPersonalizedAccess();
  }, []);
  
  /**
   * Check personalized access when user changes
   */
  useEffect(() => {
    if (user) {
      checkPersonalizedAccess();
    } else {
      setHasPersonalizedAccess(false);
      setAccessCheckLoading(false);
    }
  }, [user]);
  
  /**
   * Fetch enhanced visualizations when access is determined
   */
  useEffect(() => {
    if (!accessCheckLoading) {
      fetchEnhancedVisualizations();
    }
  }, [accessCheckLoading, hasPersonalizedAccess]);
  
  /**
   * Fetch basic performance data from the API
   */
  const fetchPerformanceData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch basic data in parallel
      const [overallResponse, topicResponse, difficultyResponse, timeResponse] = await Promise.all([
        performanceAPI.getOverallPerformance(),
        performanceAPI.getTopicPerformance(),
        performanceAPI.getDifficultyPerformance(),
        performanceAPI.getTimePerformance(undefined, { timePeriod: selectedTimePeriod as any })
      ]);
      
      setOverallData(overallResponse);
      setTopicData(topicResponse);
      setDifficultyData(difficultyResponse);
      setTimeData(timeResponse);
    } catch (err: any) {
      setError(`Failed to fetch performance data: ${err.message || 'Unknown error'}`);
      console.error('Error fetching performance data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Fetch enhanced visualization data from the API
   */
  const fetchEnhancedVisualizations = async () => {
    // Set loading state for all visualizations
    setDifficultyTrendsLoading(true);
    setTopicMasteryLoading(true);
    
    // Only set loading for personalized features if user has access
    if (hasPersonalizedAccess) {
      setRecommendationsLoading(true);
      setPerformanceComparisonLoading(true);
    }
    
    // Fetch difficulty trends
    try {
      const difficultyTrendsResponse = await performanceAPI.getDifficultyTrends({ 
        timePeriod: selectedTimePeriod as any 
      });
      setDifficultyTrendsData(difficultyTrendsResponse);
    } catch (err: any) {
      setDifficultyTrendsError(`Failed to fetch difficulty trends: ${err.message || 'Unknown error'}`);
      console.error('Error fetching difficulty trends:', err);
    } finally {
      setDifficultyTrendsLoading(false);
    }
    
    // Fetch topic mastery
    try {
      const topicMasteryResponse = await performanceAPI.getTopicMastery();
      setTopicMasteryData(topicMasteryResponse);
    } catch (err: any) {
      setTopicMasteryError(`Failed to fetch topic mastery: ${err.message || 'Unknown error'}`);
      console.error('Error fetching topic mastery:', err);
    } finally {
      setTopicMasteryLoading(false);
    }
    
    // Only fetch personalized data if user has access
    if (hasPersonalizedAccess) {
      // Fetch recommendations
      try {
        const recommendationsResponse = await performanceAPI.getRecommendations();
        setRecommendationsData(recommendationsResponse);
      } catch (err: any) {
        setRecommendationsError(`Failed to fetch recommendations: ${err.message || 'Unknown error'}`);
        console.error('Error fetching recommendations:', err);
      } finally {
        setRecommendationsLoading(false);
      }
      
      // Fetch performance comparison
      try {
        const performanceComparisonResponse = await performanceAPI.getPerformanceComparison();
        setPerformanceComparisonData(performanceComparisonResponse);
      } catch (err: any) {
        setPerformanceComparisonError(`Failed to fetch performance comparison: ${err.message || 'Unknown error'}`);
        console.error('Error fetching performance comparison:', err);
      } finally {
        setPerformanceComparisonLoading(false);
      }
    } else {
      // Set access denied state for personalized features
      setRecommendationsData({ 
        status: 'error', 
        message: 'Access to personalized recommendations is restricted. Your email address needs to be added to the allowed list by an administrator.',
        data: null 
      });
      setPerformanceComparisonData({ 
        status: 'error', 
        message: 'Access to performance comparison is restricted. Your email address needs to be added to the allowed list by an administrator.',
        data: null 
      });
      setRecommendationsLoading(false);
      setPerformanceComparisonLoading(false);
    }
  };
  
  /**
   * Handle tab change
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
    /**
   * Handle time period change for time-based charts
   */  const handleTimePeriodChange = async (period: string) => {
    const chartPeriod = period as ChartTimePeriod;
    setSelectedTimePeriod(chartPeriod);
    
    // Convert 'all' to undefined for the API
    const apiPeriod: ApiTimePeriod = chartPeriod === 'all' ? undefined : chartPeriod;
    
    try {
      setIsLoading(true);
      setDifficultyTrendsLoading(true);
      
      // Fetch both time performance and difficulty trends data
      const [timeResponse, difficultyTrendsResponse] = await Promise.all([
        performanceAPI.getTimePerformance(undefined, { timePeriod: apiPeriod }),
        performanceAPI.getDifficultyTrends({ timePeriod: apiPeriod })
      ]);
      
      setTimeData(timeResponse);
      setDifficultyTrendsData(difficultyTrendsResponse);
    } catch (err: any) {
      setError(`Failed to fetch time data: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setDifficultyTrendsLoading(false);
    }
  };
  
  /**
   * Format time in seconds to minutes:seconds
   */  const formatTime = (seconds: number): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  /**
   * Safely convert a value to a number for calculations
   */
  const safeToNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    const parsed = parseFloat(String(value) || '0');
    return isNaN(parsed) ? 0 : parsed;
  };
  
  /**
   * Prepare data for the difficulty pie chart
   */
  const prepareDifficultyChartData = () => {
    if (!overallData) return [];
    
    return [
      { name: 'Easy', value: overallData.easy_questions_accuracy, color: '#4caf50' },
      { name: 'Medium', value: overallData.medium_questions_accuracy, color: '#ff9800' },
      { name: 'Hard', value: overallData.hard_questions_accuracy, color: '#f44336' },
    ];
  };
  
  /**
   * Show loading state while fetching data
   */
  if (isLoading && !overallData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  /**
   * Display error message if data fetch failed
   */
  if (error && !overallData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  /**
   * Render the main performance dashboard
   */
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Performance Dashboard</Typography>
        {/* Overall Performance Summary */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Overall Performance</Typography>
        
        <Grid container spacing={3}>
          {/* Test Statistics */}
          <Grid item xs={12} md={6} lg={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Tests Taken</Typography>
                <Typography variant="h4">{overallData?.total_tests_taken || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>              <CardContent>
                <Typography color="textSecondary" gutterBottom>Average Score</Typography>
                <Typography variant="h4">{overallData?.avg_score_percentage !== undefined ? 
                  (typeof overallData.avg_score_percentage === 'number' 
                    ? overallData.avg_score_percentage.toFixed(1) 
                    : overallData.avg_score_percentage) 
                  : 0}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Questions Attempted</Typography>
                <Typography variant="h4">{overallData?.total_questions_attempted || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Avg. Response Time</Typography>
                <Typography variant="h4">{formatTime(overallData?.avg_response_time_seconds || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Adaptive vs Non-adaptive test statistics */}
        {((overallData?.adaptive_tests_count || 0) > 0 || (overallData?.non_adaptive_tests_count || 0) > 0) && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Adaptive vs Standard Tests
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Adaptive Tests</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">Tests Taken</Typography>
                        <Typography variant="h6">{overallData?.adaptive_tests_count || 0}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Average Score</Typography>
                        <Typography variant="h6">
                          {overallData?.adaptive_avg_score !== undefined ? 
                            (typeof overallData.adaptive_avg_score === 'number' 
                              ? overallData.adaptive_avg_score.toFixed(1) 
                              : overallData.adaptive_avg_score) 
                            : 0}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Standard Tests</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">Tests Taken</Typography>
                        <Typography variant="h6">{overallData?.non_adaptive_tests_count || 0}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Average Score</Typography>
                        <Typography variant="h6">
                          {overallData?.non_adaptive_avg_score !== undefined ? 
                            (typeof overallData.non_adaptive_avg_score === 'number' 
                              ? overallData.non_adaptive_avg_score.toFixed(1) 
                              : overallData.non_adaptive_avg_score) 
                            : 0}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
      
      {/* Performance Analysis Tabs */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange} 
          variant="scrollable" 
          scrollButtons="auto"
          sx={{ mb: 3 }}
        >
          <Tab label="Difficulty Analysis" />
          <Tab label="Topic Performance" />
          <Tab label="Time Analysis" />          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                Recommendations
                {!hasPersonalizedAccess && (
                  <span style={{ 
                    fontSize: '0.65rem', 
                    marginLeft: '4px', 
                    padding: '2px 4px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    color: '#666'
                  }}>
                    Restricted
                  </span>
                )}
              </Box>
            } 
            icon={<RecommendIcon />} 
            iconPosition="start"
            disabled={!hasPersonalizedAccess}
            sx={{
              opacity: hasPersonalizedAccess ? 1 : 0.6,
              '&.Mui-disabled': {
                color: 'text.disabled'
              }
            }}
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                Performance Comparison
                {!hasPersonalizedAccess && (
                  <span style={{ 
                    fontSize: '0.65rem', 
                    marginLeft: '4px', 
                    padding: '2px 4px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    color: '#666'
                  }}>
                    Restricted
                  </span>
                )}
              </Box>
            } 
            icon={<TrendingUpIcon />} 
            iconPosition="start"
            disabled={!hasPersonalizedAccess}
            sx={{
              opacity: hasPersonalizedAccess ? 1 : 0.6,
              '&.Mui-disabled': {
                color: 'text.disabled'
              }
            }}
          />
        </Tabs>
        
        {/* Add badge to tabs that might be personalized and restricted */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: -2, mb: 2 }}>
          {(currentTab === 3 || currentTab === 4) && hasPersonalizedAccess && (
            <Chip 
              size="small" 
              color="primary" 
              label="User-specific feature" 
              sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}
            />
          )}
          {(currentTab === 3 || currentTab === 4) && !hasPersonalizedAccess && !accessCheckLoading && (
            <Chip 
              size="small" 
              color="warning" 
              label="Access restricted - contact administrator" 
              sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}
            />
          )}
        </Box>
          {/* Difficulty Analysis Tab */}
        {currentTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Performance by Difficulty Level</Typography>
            
            <Grid container spacing={3}>
              {/* Difficulty Chart */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2, height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareDifficultyChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string, percent: number }) => `${name}: ${typeof percent === 'number' ? (percent * 100).toFixed(0) : 0}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareDifficultyChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number | string) => `${typeof value === 'number' ? value.toFixed(1) : value}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              {/* Difficulty Stats */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2, height: '350px' }}>
                  <Typography variant="body1" gutterBottom>Accuracy by Difficulty Level</Typography>
                  
                  <Box sx={{ mt: 3 }}>
                    {['easy', 'medium', 'hard'].map((level) => {
                      const key = `${level}_questions_accuracy` as keyof OverallSummary;
                      const value = overallData?.[key] || 0;
                      const color = level === 'easy' ? '#4caf50' : level === 'medium' ? '#ff9800' : '#f44336';
                      
                      return (
                        <Box key={level} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">{level.charAt(0).toUpperCase() + level.slice(1)}</Typography>
                            <Typography variant="body2">{typeof value === 'number' ? value.toFixed(1) : value}%</Typography>
                          </Box>
                          <Box sx={{ width: '100%', height: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
                            <Box 
                              sx={{ 
                                height: '100%', 
                                width: `${value}%`, 
                                backgroundColor: color,
                                borderRadius: 5
                              }} 
                            />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>
              
              {/* Difficulty Trends */}
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Difficulty Level Trends
                    <FormControl size="small" sx={{ ml: 2, minWidth: 120 }}>
                      <InputLabel id="difficulty-time-period-label">Time Period</InputLabel>
                      <Select
                        labelId="difficulty-time-period-label"
                        id="difficulty-time-period"
                        value={selectedTimePeriod}
                        label="Time Period"
                        onChange={(e) => handleTimePeriodChange(e.target.value)}
                      >
                        <MenuItem value="week">Last Week</MenuItem>
                        <MenuItem value="month">Last Month</MenuItem>
                        <MenuItem value="year">Last Year</MenuItem>
                        <MenuItem value="all">All Time</MenuItem>
                      </Select>
                    </FormControl>
                  </Typography>
                  
                  {/* Show loading state */}
                  {difficultyTrendsLoading && (
                    <Box display="flex" justifyContent="center" my={4}>
                      <CircularProgress />
                    </Box>
                  )}
                  
                  {/* Show error state if applicable */}
                  {difficultyTrendsError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {difficultyTrendsError}
                    </Alert>
                  )}
                  
                  {/* Handle access restriction errors */}                  {difficultyTrendsData?.status === 'error' && (
                    <RestrictedAccessFallback 
                      message={difficultyTrendsData.message || 'You do not have access to personalized difficulty trend data. Please contact an administrator for access.'}
                      fallbackContent={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            You can still view other performance data and test results in the other tabs.
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                  
                  {/* Show the visualization if data is available */}
                  {difficultyTrendsData?.status === 'success' && difficultyTrendsData.data && (
                    <Box sx={{ height: '400px', mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={difficultyTrendsData.data.overall}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80} 
                          />
                          <YAxis 
                            yAxisId="left" 
                            label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft' }} 
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            domain={[0, 'dataMax + 10']}
                            label={{ value: 'Questions Count', angle: 90, position: 'insideRight' }} 
                          />
                          <RechartsTooltip 
                            formatter={(value: any, name: string) => {
                              if (name.includes('Accuracy')) return [`${value}%`, name];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar 
                            yAxisId="right" 
                            dataKey="easy_count" 
                            name="Easy Questions" 
                            fill="#4caf50" 
                            stackId="count" 
                          />
                          <Bar 
                            yAxisId="right" 
                            dataKey="medium_count" 
                            name="Medium Questions" 
                            fill="#ff9800" 
                            stackId="count" 
                          />
                          <Bar 
                            yAxisId="right" 
                            dataKey="hard_count" 
                            name="Hard Questions" 
                            fill="#f44336" 
                            stackId="count" 
                          />
                          <Line 
                            yAxisId="left" 
                            type="monotone" 
                            dataKey="easy_accuracy" 
                            name="Easy Accuracy" 
                            stroke="#4caf50" 
                            strokeWidth={2}
                            dot={{ stroke: '#4caf50', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            yAxisId="left" 
                            type="monotone" 
                            dataKey="medium_accuracy" 
                            name="Medium Accuracy" 
                            stroke="#ff9800" 
                            strokeWidth={2}
                            dot={{ stroke: '#ff9800', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            yAxisId="left" 
                            type="monotone" 
                            dataKey="hard_accuracy" 
                            name="Hard Accuracy" 
                            stroke="#f44336" 
                            strokeWidth={2}
                            dot={{ stroke: '#f44336', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                  
                  {difficultyTrendsData?.status === 'success' && difficultyTrendsData.data?.by_topic && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Difficulty Trends by Topic
                      </Typography>
                      
                      <Grid container spacing={2}>
                        {Object.entries(difficultyTrendsData.data.by_topic).map(([topic, data]: [string, any], index) => (
                          <Grid item xs={12} md={6} key={`topic-difficulty-${index}`}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="subtitle2" gutterBottom>
                                  {topic}
                                </Typography>
                                
                                <Box sx={{ height: 250 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                      data={data}
                                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="date" />
                                      <YAxis label={{ value: '%', position: 'insideLeft' }} />
                                      <RechartsTooltip />
                                      <Line 
                                        type="monotone" 
                                        dataKey="easy_accuracy" 
                                        name="Easy" 
                                        stroke="#4caf50" 
                                      />
                                      <Line 
                                        type="monotone" 
                                        dataKey="medium_accuracy" 
                                        name="Medium" 
                                        stroke="#ff9800" 
                                      />
                                      <Line 
                                        type="monotone" 
                                        dataKey="hard_accuracy" 
                                        name="Hard" 
                                        stroke="#f44336" 
                                      />
                                      <Legend />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
          {/* Topic Performance Tab */}
        {currentTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Performance by Topic</Typography>
              
              <ButtonGroup variant="outlined" size="small">
                <Button 
                  onClick={() => setChartType('bar')}
                  variant={chartType === 'bar' ? 'contained' : 'outlined'}
                >
                  Bar
                </Button>
                <Button 
                  onClick={() => setChartType('radar')}
                  variant={chartType === 'radar' ? 'contained' : 'outlined'}
                >
                  Radar
                </Button>
              </ButtonGroup>
            </Box>
            
            <Box sx={{ 
              height: 400, 
              maxHeight: 400,
              overflow: 'hidden',
              mt: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1
            }}>
              {chartType === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topicData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="topic" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80} 
                    />
                    <YAxis label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip 
                      formatter={(value: number | string, name: string) => {
                        if (name === 'Accuracy') return [`${typeof value === 'number' ? value.toFixed(1) : value}%`, name];
                        if (name === 'Response Time') return [`${formatTime(value as number)}`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="accuracy_percentage" name="Accuracy" fill="#8884d8" />
                    <Bar dataKey="avg_response_time_seconds" name="Response Time" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart 
                    cx="50%" 
                    cy="50%" 
                    outerRadius="80%" 
                    data={topicData}
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="topic" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar 
                      name="Accuracy" 
                      dataKey="accuracy_percentage" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6} 
                    />
                    <RechartsTooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </Box>
            
            {/* Topic Mastery Visualization */}
            <Paper elevation={1} sx={{ p: 2, mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Topic Mastery Progression
              </Typography>
              
              {/* Show loading state */}
              {topicMasteryLoading && (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              )}
              
              {/* Show error state if applicable */}
              {topicMasteryError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {topicMasteryError}
                </Alert>
              )}
              
              {/* Handle access restriction errors */}              {topicMasteryData?.status === 'error' && (
                <RestrictedAccessFallback 
                  message={topicMasteryData.message || 'You do not have access to personalized topic mastery data. Please contact an administrator for access.'}
                  fallbackContent={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        You can still view your basic topic performance in the "Performance by Topic" tab.
                      </Typography>
                    </Box>
                  }
                />
              )}
              
              {/* Show the visualization if data is available */}
              {topicMasteryData?.status === 'success' && topicMasteryData.data && (
                <>
                  {/* Mastery Level Visualization */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Current Topic Mastery Levels
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {Object.entries(topicMasteryData.data.topic_mastery || {}).map(([topic, mastery]: [string, any], index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={`mastery-${index}`}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                {topic}
                              </Typography>
                              
                              <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center' }}>
                                <CircularProgress
                                  variant="determinate"
                                  value={safeToNumber(mastery.level)}
                                  size={80}
                                  thickness={4}
                                  sx={{ 
                                    color: safeToNumber(mastery.level) < 40 ? '#f44336' : 
                                           safeToNumber(mastery.level) < 70 ? '#ff9800' : '#4caf50',
                                    mb: 1
                                  }}
                                />
                                <Box
                                  sx={{
                                    top: 0,
                                    left: 0,
                                    bottom: 0,
                                    right: 0,
                                    position: 'absolute',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Typography variant="body1" component="div" fontWeight="bold">
                                    {`${Math.round(safeToNumber(mastery.level))}%`}
                                  </Typography>
                                </Box>
                              </Box>
                              
                              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                                {safeToNumber(mastery.level) < 40 ? 'Beginner' : 
                                 safeToNumber(mastery.level) < 70 ? 'Intermediate' : 'Advanced'}
                              </Typography>
                              
                              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary">
                                  Questions: {safeToNumber(mastery.total_questions)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Accuracy: {safeToNumber(mastery.accuracy).toFixed(1)}%
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                  
                  {/* Mastery Progression Visualization */}
                  {topicMasteryData.data.mastery_progression && topicMasteryData.data.mastery_progression.length > 0 && (
                    <Box sx={{ height: '400px', mt: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Mastery Progression Over Time
                      </Typography>
                      
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={topicMasteryData.data.mastery_progression}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80} 
                          />
                          <YAxis 
                            label={{ value: 'Mastery Level %', angle: -90, position: 'insideLeft' }} 
                            domain={[0, 100]}
                          />
                          <RechartsTooltip 
                            formatter={(value: any, name: string) => [`${value}%`, name]}
                          />
                          <Legend />
                          {Object.keys(topicMasteryData.data.topic_mastery).map((topic, index) => (
                            <Line 
                              key={`line-${topic}`}
                              type="monotone" 
                              dataKey={`${topic.replace(/\s+/g, '_')}_mastery`} 
                              name={topic} 
                              stroke={`hsl(${index * 30 % 360}, 70%, 50%)`} 
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          ))}
                          <ReferenceLine y={40} stroke="#f44336" strokeDasharray="3 3" label="Beginner" />
                          <ReferenceLine y={70} stroke="#4caf50" strokeDasharray="3 3" label="Advanced" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Box>
        )}
        
        {/* Time Analysis Tab */}
        {currentTab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Performance Over Time</Typography>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="time-period-label">Time Period</InputLabel>
                <Select
                  labelId="time-period-label"
                  id="time-period"
                  value={selectedTimePeriod}
                  label="Time Period"
                  onChange={(e) => handleTimePeriodChange(e.target.value)}
                >
                  <MenuItem value="week">Last Week</MenuItem>
                  <MenuItem value="month">Last Month</MenuItem>
                  <MenuItem value="year">Last Year</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ height: '400px', mt: 2 }}>
              {timeData && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeData.trend || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80} 
                    />
                    <YAxis yAxisId="left" label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Response Time (s)', angle: 90, position: 'insideRight' }} />
                    <RechartsTooltip                      formatter={(value: any, name: string) => {
                        if (name === 'Accuracy') return [`${value}%`, name];
                        if (name === 'Response Time') return [formatTime(value as number), name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="accuracy" 
                      name="Accuracy" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="avg_time" 
                      name="Response Time" 
                      stroke="#82ca9d" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>          </Box>
        )}
        
        {/* Recommendations Tab */}
        {currentTab === 3 && (
          <Box>
            {/* Show access denied message if user doesn't have permission */}
            {!hasPersonalizedAccess && !accessCheckLoading && (
              <RestrictedAccessFallback 
                message="Access to personalized recommendations is restricted. Your email address needs to be added to the allowed list by an administrator."
                fallbackContent={
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      In the meantime, you can:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Review your performance in the "Difficulty Analysis" and "Topic Performance" tabs
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Analyze your progress over time in the "Time Analysis" tab  
                      </Typography>
                      <Typography component="li" variant="body2">
                        Contact your administrator to request access to personalized features
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            )}
            
            {/* Show loading while checking access */}
            {accessCheckLoading && (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Checking access permissions...
                </Typography>
              </Box>
            )}
            
            {/* Show content if user has access */}
            {hasPersonalizedAccess && (
              <>
                {/* Show loading state for recommendations */}
                {recommendationsLoading && (
                  <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress />
                  </Box>
                )}
                
                {/* Show error state if applicable */}
                {recommendationsError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {recommendationsError}
                  </Alert>
                )}
                  {/* Handle access restriction errors */}
                {recommendationsData?.status === 'error' && (
                  <RestrictedAccessFallback 
                    message={recommendationsData.message || 'You do not have access to personalized recommendations. Please contact an administrator for access.'}
                    fallbackContent={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          In the meantime, you can review your performance in the "Overall Performance" and "Performance by Topic" tabs to identify areas for improvement.
                        </Typography>
                      </Box>
                    }
                  />
                )}
                
                {/* Show recommendations if available */}
                {recommendationsData?.status === 'success' && recommendationsData.data && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Personalized Recommendations
                    </Typography>
                    
                    {/* Weak topics section */}
                    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Topics to Focus On
                      </Typography>
                      
                      {recommendationsData.data.weakTopics && recommendationsData.data.weakTopics.length > 0 ? (
                        <Grid container spacing={2}>
                          {recommendationsData.data.weakTopics.map((topic: any, index: number) => (
                            <Grid item xs={12} md={4} key={`topic-${index}`}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="subtitle1" color="primary" gutterBottom>
                                    {topic.topic_name}
                                  </Typography>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2">Accuracy:</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                      {safeToNumber(topic.accuracy).toFixed(1)}%
                                    </Typography>
                                  </Box>
                                  <Box sx={{ width: '100%', height: 8, backgroundColor: '#f0f0f0', borderRadius: 5, mb: 1 }}>
                                    <Box 
                                      sx={{ 
                                        height: '100%', 
                                        width: `${safeToNumber(topic.accuracy)}%`, 
                                        backgroundColor: safeToNumber(topic.accuracy) < 50 ? '#f44336' : safeToNumber(topic.accuracy) < 70 ? '#ff9800' : '#4caf50',
                                        borderRadius: 5
                                      }} 
                                    />
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {topic.recommendation}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Typography>No topic recommendations available.</Typography>
                      )}
                    </Paper>
                    
                    {/* Recommended questions section */}
                    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Practice Questions
                      </Typography>
                      
                      {recommendationsData.data.recommendedQuestions && recommendationsData.data.recommendedQuestions.length > 0 ? (
                        <Box>
                          {recommendationsData.data.recommendedQuestions.map((question: any, index: number) => (
                            <Card key={`question-${index}`} variant="outlined" sx={{ mb: 2 }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Chip 
                                    label={question.difficulty} 
                                    size="small" 
                                    color={question.difficulty === 'hard' ? 'error' : question.difficulty === 'medium' ? 'warning' : 'success'} 
                                    sx={{ mr: 1 }}
                                  />
                                  <Typography variant="body2" color="text.secondary">
                                    {question.topic}
                                  </Typography>
                                </Box>
                                <Typography variant="body1" gutterBottom>
                                  {question.question_text}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {question.reason}
                                </Typography>
                              </CardContent>
                            </Card>
                          ))}
                        </Box>
                      ) : (
                        <Typography>No question recommendations available.</Typography>
                      )}
                    </Paper>
                    
                    {/* Learning path recommendations */}
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Learning Path
                      </Typography>
                      
                      {recommendationsData.data.learningPath ? (
                        <List>
                          {recommendationsData.data.learningPath.map((step: any, index: number) => (
                            <ListItem key={`step-${index}`}>
                              <ListItemIcon>
                                <Avatar sx={{ bgcolor: step.completed ? 'success.main' : 'primary.main', width: 30, height: 30 }}>
                                  {index + 1}
                                </Avatar>
                              </ListItemIcon>
                              <ListItemText 
                                primary={step.title} 
                                secondary={step.description} 
                                primaryTypographyProps={{
                                  fontWeight: step.current ? 'bold' : 'normal'
                                }}
                              />
                              {step.completed && (
                                <Chip label="Completed" color="success" size="small" />
                              )}
                              {step.current && (
                                <Chip label="Current Focus" color="primary" size="small" />
                              )}
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography>No learning path available yet.</Typography>
                      )}
                    </Paper>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
        
        {/* Performance Comparison Tab */}
        {currentTab === 4 && (
          <Box>
            {/* Show access denied message if user doesn't have permission */}
            {!hasPersonalizedAccess && !accessCheckLoading && (
              <RestrictedAccessFallback 
                message="Access to performance comparison is restricted. Your email address needs to be added to the allowed list by an administrator."
                fallbackContent={
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      In the meantime, you can:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        View your individual performance metrics in the other tabs
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Analyze your progress trends in the "Time Analysis" tab  
                      </Typography>
                      <Typography component="li" variant="body2">
                        Contact your administrator to request access to comparison features
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            )}
            
            {/* Show loading while checking access */}
            {accessCheckLoading && (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Checking access permissions...
                </Typography>
              </Box>
            )}
            
            {/* Show content if user has access */}
            {hasPersonalizedAccess && (
              <>
                {/* Show loading state for performance comparison */}
                {performanceComparisonLoading && (
                  <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress />
                  </Box>
                )}
                
                {/* Show error state if applicable */}
                {performanceComparisonError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {performanceComparisonError}
                  </Alert>
                )}
                  {/* Handle access restriction errors */}
                {performanceComparisonData?.status === 'error' && (
                  <RestrictedAccessFallback 
                    message={performanceComparisonData.message || 'You do not have access to personalized performance comparison data. Please contact an administrator for access.'}
                    fallbackContent={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          You can still view your individual performance metrics in the other tabs. Performance comparison features require additional permissions.
                        </Typography>
                      </Box>
                    }
                  />
                )}
                
                {/* Show performance comparison if available */}
                {performanceComparisonData?.status === 'success' && performanceComparisonData.data && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Performance Comparison
                    </Typography>
                    
                    {/* Overall Performance Comparison */}
                    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Your Performance vs. Average
                      </Typography>
                      
                      <Box sx={{ height: '400px', mt: 2 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={performanceComparisonData.data.metrics ? performanceComparisonData.data.metrics.map(metric => ({
                              metric: metric.name,
                              yourScore: metric.user_value,
                              averageScore: metric.average_value
                            })) : []}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="metric" />
                            <YAxis label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                            <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                            <Legend />
                            <Bar dataKey="yourScore" name="Your Score" fill="#8884d8" />
                            <Bar dataKey="averageScore" name="Average Score" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                    
                    {/* Comparison by Difficulty */}
                    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Performance by Difficulty
                      </Typography>
                      
                      <Box sx={{ height: '350px', mt: 2 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={performanceComparisonData.data.difficulty_comparison ? [
                              {
                                level: 'Easy',
                                yourScore: performanceComparisonData.data.difficulty_comparison.easy.user_accuracy || 0,
                                averageScore: performanceComparisonData.data.difficulty_comparison.easy.average_accuracy || 0
                              },
                              {
                                level: 'Medium',
                                yourScore: performanceComparisonData.data.difficulty_comparison.medium.user_accuracy || 0,
                                averageScore: performanceComparisonData.data.difficulty_comparison.medium.average_accuracy || 0
                              },
                              {
                                level: 'Hard',
                                yourScore: performanceComparisonData.data.difficulty_comparison.hard.user_accuracy || 0,
                                averageScore: performanceComparisonData.data.difficulty_comparison.hard.average_accuracy || 0
                              }
                            ] : []}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="level" />
                            <YAxis label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft' }} />
                            <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                            <Legend />
                            <Bar dataKey="yourScore" name="Your Score" fill="#8884d8" />
                            <Bar dataKey="averageScore" name="Average Score" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Paper>
      
      {/* Enhanced Visualizations Section */}
      <Paper elevation={3} sx={{ p: 3, mt: 4, overflow: 'hidden' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Enhanced Performance Visualizations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            These advanced visualizations provide deeper insights into your performance trends and patterns.
          </Typography>
        </Box>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Row 1: Difficulty and Topic Charts */}
          {/* Difficulty Trends Chart */}
          <Grid item xs={12} lg={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              height: 450, 
              maxHeight: 450,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <DifficultyTrendsChart enablePersonalization={true} />
            </Box>
          </Grid>
          
          {/* Topic Mastery Progression Chart */}
          <Grid item xs={12} lg={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              height: 450, 
              maxHeight: 450,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <TopicMasteryProgressionChart />
            </Box>
          </Grid>
          
          {/* Row 2: Comparison and Recommendations Charts */}
          {/* Performance Comparison Chart */}
          <Grid item xs={12} lg={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              height: 450, 
              maxHeight: 450,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <PerformanceComparisonChart />
            </Box>
          </Grid>
          
          {/* Personalized Recommendations */}
          <Grid item xs={12} lg={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              height: 450, 
              maxHeight: 450,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <PersonalizedRecommendationDisplay />
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Last Updated Info */}
      {overallData?.last_updated && (
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 2 }}>
          Last updated: {new Date(overallData.last_updated).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};
