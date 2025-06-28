import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Divider, 
  Button,
  Slider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { performanceAPI } from '../../../services/api';
import { ChartContainer } from '../ChartContainer';
import { ChartRestrictedAccess } from '../ChartRestrictedAccess';

/**
 * Recommendation data structure
 */
interface Recommendation {
  topic: string;
  subtopic?: string;
  difficulty: number;
  importance: number;  // 1-10 scale
  recommendation_type: 'practice' | 'review' | 'focus';
  description: string;
  suggested_questions?: Array<{
    id: number;
    topic: string;
    difficulty: number;
  }>;
  improvement_potential: number;  // 0-100 scale
}

interface RecommendationsData {
  status: 'success' | 'error';
  message?: string;
  data: {
    recommendations: Recommendation[];
    insights: any[];
  } | null;
}

interface PersonalizedRecommendationDisplayProps {
  /**
   * Maximum number of recommendations to show
   */
  maxRecommendations?: number;
}

/**
 * Component for displaying personalized test recommendations with visual elements
 */
const PersonalizedRecommendationDisplay: React.FC<PersonalizedRecommendationDisplayProps> = ({
  maxRecommendations = 5
}) => {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(3);
  
  // Fetch data
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await performanceAPI.getRecommendations(maxRecommendations);
        setData(result);
        
        if (result.status === 'error') {
          // Check if it's a no-data scenario vs actual error
          const isNoDataError = result.message?.toLowerCase().includes('no data') || 
                                result.message?.toLowerCase().includes('not found') ||
                                result.message?.toLowerCase().includes('no tests') ||
                                result.message?.toLowerCase().includes('insufficient');
          
          if (isNoDataError) {
            setError('Personalized study recommendations will appear here. Complete a few tests to unlock tailored learning suggestions based on your performance patterns!');
          } else {
            setError('Unable to generate your recommendations right now. Please check your internet connection and try again. Our AI needs to analyze your recent test data.');
          }
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        
        // Determine error type for better user messaging
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setError('Unable to generate your recommendations right now. Please check your internet connection and try again.');
        } else if (err instanceof Error && err.message.includes('500')) {
          setError('Recommendation engine temporarily unavailable. Our AI analysis system is being updated. Your personalized suggestions will be ready shortly!');
        } else {
          setError('Unable to generate your recommendations right now. Please try again. If the issue persists, contact support.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [maxRecommendations]);
  
  // Handle recommendation count change
  const handleSelectedCountChange = (_event: Event, newValue: number | number[]) => {
    setSelectedCount(newValue as number);
  };
  
  // Check for access restriction
  const isAccessRestricted = data?.status === 'error' && data?.message?.includes('access');
  
  // Check for empty data
  const isEmpty = !loading && !error && (!data?.data || data.data.recommendations.length === 0);
  
  // Check if it's a "no data" success response
  const isNoDataResponse = data?.status === 'success' && (!data?.data || data.data.recommendations.length === 0);
  
  // Chart actions component
  const chartActions = (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mr: 2, minWidth: '180px' }}>
        Recommendations to show: {selectedCount}
      </Typography>
      <Slider
        value={selectedCount}
        onChange={handleSelectedCountChange}
        min={1}
        max={Math.min(maxRecommendations, data?.data?.recommendations?.length || maxRecommendations)}
        valueLabelDisplay="auto"
        aria-label="Recommendations count"
        sx={{ flexGrow: 1, maxWidth: '300px' }}
      />
    </Box>
  );
  
  // If access is restricted, show restricted access message
  if (isAccessRestricted) {
    return (
      <ChartContainer
        title="Personalized Recommendations"
        description="Get targeted recommendations to improve your performance"
        loading={loading}
        error={null}
        isEmpty={isEmpty}
        height="auto"
      >
        <Box>
          <ChartRestrictedAccess
            message={data?.message || 'You do not have access to personalized recommendations.'}
            featureName="Personalized Recommendations"
          />
        </Box>
      </ChartContainer>
    );
  }

  // If it's a "no data" response, show a helpful message
  if (isNoDataResponse || isEmpty) {
    return (
      <ChartContainer
        title="Personalized Recommendations"
        description="Get targeted recommendations to improve your performance"
        loading={loading}
        error={null}
        isEmpty={true}
        height="auto"
      >
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Recommendations Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete some tests to receive personalized recommendations.
            The system will analyze your performance and suggest areas for improvement,
            practice topics, and study strategies tailored to your learning needs.
          </Typography>
        </Box>
      </ChartContainer>
    );
  }
    // If we have data, show recommendations
  const recommendations = data?.data?.recommendations?.slice(0, selectedCount) || [];

  // Prepare visualization data
  const improvementData = recommendations.map((rec) => ({
    name: rec.topic,
    potential: rec.improvement_potential,
    fill: getImportanceColor(rec.importance) // Use importance to determine color intensity
  }));
    
  // Importance data for radial chart  
  const importanceData = recommendations.map((rec, index) => ({
    name: rec.topic,
    importance: rec.importance * 10, // Scale to 0-100
    fill: getRecommendationColor(rec.recommendation_type),
    // Add index for proper ordering in radial bar chart - must be a unique number
    index: recommendations.length - index,
    // Ensure the data is properly ordered for RadialBar
    value: rec.importance * 10 // Required by RadialBar component
  }));
  
  return (
    <ChartContainer
      title="Personalized Recommendations"
      description="Get targeted recommendations to improve your performance"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height="auto"
      actions={!isEmpty && !loading && !error ? chartActions : undefined}
      ariaLabel="Personalized recommendations display with improvement potential and topic priority charts"
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        gap: { xs: 3, md: 4 },
        mt: 2,
        width: '100%',
        overflow: 'visible'
      }}>
        {/* Left side: Recommendations list */}
        <Box sx={{ 
          flexGrow: 1, 
          mr: { xs: 0, md: 2 }, 
          mb: { xs: 4, md: 0 },
          minWidth: { xs: '100%', md: '300px' },
          overflow: 'visible'
        }}>
          <List>
            {recommendations.map((rec, index) => (
              <ListItem
                key={index}
                component={Card}
                sx={{ 
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: '4px solid',
                  borderLeftColor: getRecommendationColor(rec.recommendation_type),
                  p: 0
                }}
              >
                <CardContent sx={{ width: '100%', p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ListItemIcon sx={{ minWidth: '40px' }}>
                      {getRecommendationIcon(rec.recommendation_type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1">
                          {rec.topic}
                          {rec.subtopic && (
                            <Typography component="span" variant="body2" color="text.secondary">
                              {` > ${rec.subtopic}`}
                            </Typography>
                          )}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {getRecommendationTypeLabel(rec.recommendation_type)}
                          {` • Difficulty: ${getDifficultyLabel(rec.difficulty)}`}
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                      <Chip 
                        label={`${rec.improvement_potential}% potential`} 
                        size="small"
                        color={getImportanceChipColor(rec.importance)}
                        icon={<TrendingUpIcon />}
                        sx={{ mr: 1 }}
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" sx={{ my: 1 }}>
                    {rec.description}
                  </Typography>
                  
                  {rec.suggested_questions && rec.suggested_questions.length > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        Suggested questions:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {rec.suggested_questions.map((q) => (
                          <Chip
                            key={q.id}
                            size="small"
                            label={`Q${q.id}`}
                            color="primary"
                            variant="outlined"
                            onClick={() => console.log(`Navigate to question ${q.id}`)}
                            deleteIcon={<OpenInNewIcon />}
                            onDelete={() => console.log(`Open question ${q.id}`)}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button 
                      size="small" 
                      startIcon={<BookmarkIcon />}
                      variant="outlined"
                    >
                      Add to Study Plan
                    </Button>
                  </Box>
                </CardContent>
              </ListItem>
            ))}
          </List>
        </Box>
        
        {/* Right side: Visualizations */}
        <Box sx={{ 
          width: { xs: '100%', md: '420px' },
          minWidth: { xs: 'unset', md: '420px' },
          maxWidth: { xs: '100%', md: '420px' },
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {/* Improvement potential bar chart */}
          <Card elevation={1} variant="outlined" sx={{ p: 2, borderRadius: 2, overflow: 'visible' }}>
            <Typography variant="h6" gutterBottom sx={{ 
              fontWeight: 600, 
              color: 'primary.main',
              fontSize: '1.1rem',
              whiteSpace: 'nowrap',
              overflow: 'visible'
            }}>
              Improvement Pot
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shows how much improvement is possible in each topic
            </Typography>
            <Box height={220} sx={{ width: '100%', overflow: 'visible' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={improvementData}
                  margin={{ top: 10, right: 30, bottom: 10, left: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#666' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={50}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#444' }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Improvement Potential']}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  />
                  <Bar 
                    dataKey="potential" 
                    radius={[0, 4, 4, 0]}
                    fill="url(#improvementGradient)"
                  >
                    <defs>
                      <linearGradient id="improvementGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                    </defs>
                    {improvementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
          
          {/* Topic Priority radial chart */}
          <Card elevation={1} variant="outlined" sx={{ p: 2, borderRadius: 2, overflow: 'visible' }}>
            <Typography variant="h6" gutterBottom sx={{ 
              fontWeight: 600, 
              color: 'primary.main',
              fontSize: '1.1rem',
              whiteSpace: 'nowrap',
              overflow: 'visible'
            }}>
              Topic Priority
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Focus areas ranked by importance for your learning
            </Typography>
            <Box height={280} sx={{ width: '100%', overflow: 'visible' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  innerRadius="30%" 
                  outerRadius="90%" 
                  data={importanceData} 
                  startAngle={180} 
                  endAngle={0}
                  barSize={15}
                >
                  <RadialBar
                    background={{ fill: '#f8f9fa' }}
                    dataKey="importance"
                    cornerRadius={8}
                    label={{
                      position: 'insideStart',
                      fill: '#fff',
                      fontWeight: 'bold', 
                      fontSize: 10
                    }}
                  />
                  <Legend
                    iconSize={12}
                    layout="vertical"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ 
                      fontSize: 11, 
                      paddingTop: '10px',
                      maxWidth: '100%'
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [`Priority: ${Math.round(Number(value) / 10)}/10`, '']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Box>
      </Box>
    </ChartContainer>
  );
};

// Helper functions
const getRecommendationColor = (type: string): string => {
  switch (type) {
    case 'practice':
      return '#3b82f6'; // Blue
    case 'review':
      return '#f59e0b'; // Amber
    case 'focus':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
};

const getImportanceColor = (importance: number): string => {
  if (importance >= 8) return '#ef4444'; // Red - High priority
  if (importance >= 6) return '#f59e0b'; // Amber - Medium priority  
  if (importance >= 4) return '#3b82f6'; // Blue - Low priority
  return '#6b7280'; // Gray - Very low priority
};

const getRecommendationIcon = (type: string) => {
  switch (type) {
    case 'practice':
      return <SchoolIcon color="primary" />;
    case 'review':
      return <TrendingUpIcon color="warning" />;
    case 'focus':
      return <PriorityHighIcon color="error" />;
    default:
      return <SchoolIcon color="primary" />;
  }
};

const getRecommendationTypeLabel = (type: string): string => {
  switch (type) {
    case 'practice':
      return 'Practice more';
    case 'review':
      return 'Review concepts';
    case 'focus':
      return 'Focus area';
    default:
      return 'Recommendation';
  }
};

const getDifficultyLabel = (difficulty: number): string => {
  if (difficulty >= 8) return 'Hard';
  if (difficulty >= 5) return 'Medium';
  return 'Easy';
};

const getImportanceChipColor = (importance: number): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  if (importance >= 8) return 'error';
  if (importance >= 6) return 'warning';
  if (importance >= 4) return 'info';
  return 'default';
};

export default PersonalizedRecommendationDisplay;
