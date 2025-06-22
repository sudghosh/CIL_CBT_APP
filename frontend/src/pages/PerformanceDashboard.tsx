import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  ButtonGroup,
  Button,
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
} from 'recharts';
import { performanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Interface for overall performance summary data
 */
interface OverallSummary {
  total_tests_taken: number;
  total_questions_attempted: number;
  total_correct_answers: number;
  avg_score_percentage: number;
  avg_response_time_seconds: number;
  easy_questions_accuracy: number;
  medium_questions_accuracy: number;
  hard_questions_accuracy: number;
  last_updated: string;
  adaptive_tests_count: number;
  non_adaptive_tests_count: number;
  adaptive_avg_score: number;
  non_adaptive_avg_score: number;
}

/**
 * Interface for topic performance data
 */
interface TopicSummary {
  topic: string;
  total_questions: number;
  correct_answers: number;
  accuracy_percentage: number;
  avg_response_time_seconds: number;
}

/**
 * Performance Dashboard component displays user performance metrics
 * across tests, question types, and difficulty levels
 * 
 * @returns React component
 */
export const PerformanceDashboard: React.FC = () => {
  // State for performance data
  const [overallData, setOverallData] = useState<OverallSummary | null>(null);
  const [topicData, setTopicData] = useState<TopicSummary[]>([]);
  const [difficultyData, setDifficultyData] = useState<any>(null);
  const [timeData, setTimeData] = useState<any>(null);
  
  // State for loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for UI controls
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('month');
  const [chartType, setChartType] = useState<string>('bar');
  
  // Get current user info
  const { user } = useAuth();
  
  /**
   * Fetch performance data when component mounts
   */
  useEffect(() => {
    fetchPerformanceData();
  }, []);
  
  /**
   * Fetch all performance data from the API
   */
  const fetchPerformanceData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
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
   * Handle tab change
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  /**
   * Handle time period change for time-based charts
   */
  const handleTimePeriodChange = async (period: string) => {
    setSelectedTimePeriod(period);
    
    try {
      setIsLoading(true);
      const timeResponse = await performanceAPI.getTimePerformance(undefined, { timePeriod: period as any });
      setTimeData(timeResponse);
    } catch (err: any) {
      setError(`Failed to fetch time data: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Format time in seconds to minutes:seconds
   */
  const formatTime = (seconds: number): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          variant="fullWidth" 
          sx={{ mb: 3 }}
        >
          <Tab label="Difficulty Analysis" />
          <Tab label="Topic Performance" />
          <Tab label="Time Analysis" />
        </Tabs>
        
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
            
            <Box sx={{ height: '400px', mt: 2 }}>
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
            </Box>
          </Box>
        )}
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
