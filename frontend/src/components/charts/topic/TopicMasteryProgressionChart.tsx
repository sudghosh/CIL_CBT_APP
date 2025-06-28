import React, { useState, useEffect } from 'react';
// Hot reload test - updated at 8:20 PM
import {
  LineChart,
  Line,
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
import { getSeriesColors } from '../utils/chartHelpers';

/**
 * Topic mastery data structure
 */
interface TopicMasteryData {
  status: 'success' | 'error';
  message?: string;
  data: {
    topic_mastery: {
      [topic: string]: number;  // Topic name -> mastery level (0-100)
    };
    mastery_progression: Array<{
      date: string;
      [key: string]: string | number;  // Topic name -> mastery level for that date or date string
    }>;
  } | null;
}

/**
 * Chart type for topic mastery
 */
type ChartType = 'line' | 'radar';

interface TopicMasteryProgressionChartProps {
  /**
   * Maximum number of topics to show
   */
  maxTopics?: number;
}

/**
 * Component for visualizing topic mastery progression over time
 */
const TopicMasteryProgressionChart: React.FC<TopicMasteryProgressionChartProps> = ({
  maxTopics = 5
}) => {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TopicMasteryData | null>(null);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  // Fetch data
  useEffect(() => {
    const fetchTopicMastery = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await performanceAPI.getTopicMastery();
        setData(result);
        
        if (result.status === 'error') {
          // Check if it's a no-data scenario vs actual error
          const isNoDataError = result.message?.toLowerCase().includes('no data') || 
                                result.message?.toLowerCase().includes('not found') ||
                                result.message?.toLowerCase().includes('no tests');
          
          if (isNoDataError) {
            setError('Your learning progress will appear here once you complete your first test. Start a practice test to begin tracking your topic mastery across different subjects!');
          } else {
            setError('Unable to load your progress data right now. Please check your internet connection and try refreshing the page. If the issue persists, contact support.');
          }
        } else if (result.data) {
          // Auto-select top topics based on mastery level
          const topicEntries = Object.entries(result.data.topic_mastery || {});
            // Sort topics by mastery level (descending)
          const sortedTopics = topicEntries
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, maxTopics)
            .map(([topic]) => topic);
            
          setSelectedTopics(sortedTopics);
        }
      } catch (err) {
        console.error('Error fetching topic mastery:', err);
        
        // Determine error type for better user messaging
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setError('Unable to load your progress data right now. Please check your internet connection and try refreshing the page.');
        } else if (err instanceof Error && err.message.includes('500')) {
          setError('Our servers are experiencing issues. We\'re working to resolve this quickly. Your progress data is safe and will be available once we\'re back online.');
        } else {
          setError('Unable to load your progress data right now. Please try refreshing the page. If the issue persists, contact support.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchTopicMastery();
  }, [maxTopics]);
  
  // Handle chart type change
  const handleChartTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newChartType: ChartType | null,
  ) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  };
  
  // Handle topic selection change
  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic].slice(0, maxTopics)
    );
  };
  
  // Check for access restriction
  const isAccessRestricted = data?.status === 'error' && data?.message?.includes('access');
  
  // Check for empty data
  const isEmpty = !loading && !error && (
    !data?.data?.topic_mastery || 
    Object.keys(data.data.topic_mastery).length === 0 ||
    !data.data.mastery_progression || 
    data.data.mastery_progression.length === 0
  );
  
  // Check if it's a "no data" success response
  const isNoDataResponse = data?.status === 'success' && data?.message && data.message.includes('No adaptive test data available');
  
  // Chart actions component
  const chartActions = (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
      <ToggleButtonGroup
        value={chartType}
        exclusive
        onChange={handleChartTypeChange}
        aria-label="chart type"
        size="small"
        sx={{ ml: 2 }}
      >
        <ToggleButton value="line" aria-label="Line Chart">
          Line
        </ToggleButton>
        <ToggleButton value="radar" aria-label="Radar Chart">
          Radar
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
  
  // If access is restricted, show restricted access message
  if (isAccessRestricted) {
    return (
      <ChartContainer
        title="Topic Mastery Progression"
        description="Track your mastery progress across different topics"
        loading={loading}
        error={null}
        isEmpty={isEmpty}
        height={350}
      >
        <Box>
          <ChartRestrictedAccess
            message={data?.message || 'You do not have access to topic mastery data.'}
            featureName="Topic Mastery Progression"
          />
        </Box>
      </ChartContainer>
    );
  }

  // If it's a "no data" response, show a helpful message
  if (isNoDataResponse || isEmpty) {
    return (
      <ChartContainer
        title="Topic Mastery Progression"
        description="Track your mastery progress across different topics"
        loading={loading}
        error={null}
        isEmpty={true}
        height={350}
      >
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Topic Mastery Data Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete some adaptive tests to see your topic mastery progression here.
            The system tracks your performance across different topics and difficulty levels
            to show how your mastery improves over time.
          </Typography>
        </Box>
      </ChartContainer>
    );
  }
  
  // If using line chart
  if (chartType === 'line') {
    const lineColors = getSeriesColors(selectedTopics.length);
    
    return (
      <ChartContainer
        title="Topic Mastery Progression"
        description="Track your mastery progress across different topics"
        loading={loading}
        error={error}
        isEmpty={isEmpty}
        actions={chartActions}
        height={350}
        ariaLabel="Line chart showing topic mastery progression over time"
      >
        <LineChart
          data={data?.data?.mastery_progression || []}
          margin={CHART_MARGIN}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          />
          <YAxis domain={[0, 100]} />
          <Tooltip
            formatter={(value: number | string, name: string) => {
              const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
              return [`${numValue.toFixed(1)}%`, name];
            }}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc'
            }}
          />          <Legend 
            verticalAlign="bottom" 
            height={36}
            onClick={(e) => e.dataKey && handleTopicToggle(e.dataKey.toString())}
          />
          {selectedTopics.map((topic, index) => (
            <Line
              key={topic}
              type="monotone"
              dataKey={topic}
              name={topic}
              stroke={lineColors[index]}
              activeDot={{ r: 6 }}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ChartContainer>
    );
  }
  
  // If using radar chart
  const radarData = data?.data?.topic_mastery 
    ? Object.entries(data.data.topic_mastery)
        .filter(([topic]) => selectedTopics.includes(topic))
        .map(([topic, mastery]) => {
          // Ensure mastery is a valid number
          const masteryValue = typeof mastery === 'number' ? mastery : parseFloat(String(mastery)) || 0;
          return { 
            topic, 
            mastery: masteryValue,
            // Format mastery value for tooltip
            formattedMastery: `${masteryValue.toFixed(1)}%`
          };
        })
    : [];
    
  return (
    <ChartContainer
      title="Topic Mastery"
      description="View your current mastery levels across topics"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      actions={chartActions}
      height={350}
      ariaLabel="Radar chart showing topic mastery levels"
    >
      <RadarChart 
        cx="50%" 
        cy="50%" 
        outerRadius="70%" 
        data={radarData}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey="topic" />
        <PolarRadiusAxis angle={30} domain={[0, 100]} />
        <Radar
          name="Mastery"
          dataKey="mastery"
          stroke={CHART_COLORS.primary}
          fill={CHART_COLORS.primary}
          fillOpacity={0.6}
        />
        <Tooltip
          formatter={(value: number | string) => {
            const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
            return [`${numValue.toFixed(1)}%`, 'Mastery'];
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

export default TopicMasteryProgressionChart;
