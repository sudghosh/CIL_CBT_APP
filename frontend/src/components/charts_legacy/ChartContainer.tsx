import React from 'react';
import { Box, CircularProgress, Typography, Alert, Paper, Button } from '@mui/material';
import { ResponsiveContainer } from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChartErrorBoundary from './ChartErrorBoundary';
import { logChartError } from '../../utils/chartErrorLogger';

interface ChartContainerProps {
  /**
   * Title of the chart
   */
  title: string;
  
  /**
   * Optional description text
   */
  description?: string;
  
  /**
   * The chart component to render
   */
  children: React.ReactNode;
  
  /**
   * Is data currently loading
   */
  loading?: boolean;
  
  /**
   * Error message if any
   */
  error?: string | null;
  
  /**
   * Whether the data exists or is empty
   */
  isEmpty?: boolean;
  
  /**
   * Empty state message
   */
  emptyMessage?: string;
  
  /**
   * Height of the chart in pixels or percentage string
   */
  height?: number | string;
  
  /**
   * Whether to add accessibility features
   */
  accessibilityEnabled?: boolean;
  
  /**
   * ARIA description for the chart
   */
  ariaLabel?: string;
  
  /**
   * Additional actions to render above the chart (filters, controls, etc.)
   */
  actions?: React.ReactNode;
  
  /**
   * Callback function to retry loading data when error occurs
   */
  onRetry?: () => void;
  
  /**
   * Whether to enable error boundary for chart rendering errors
   */
  enableErrorBoundary?: boolean;
}

/**
 * A container component for charts that handles loading, error and empty states
 * with enhanced error handling and logging capabilities
 */
const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'No data available for this chart.',
  height = 350,
  accessibilityEnabled = true,
  ariaLabel,
  actions,
  onRetry,
  enableErrorBoundary = true
}) => {
  const chartHeight = typeof height === 'number' ? height : 350;
  
  /**
   * Enhanced error logging for chart issues
   */
  const logChartErrorWithContext = (errorType: string, details: any) => {
    logChartError(
      title,
      details,
      'data_error',
      {
        errorType,
        chartHeight,
        hasChildren: React.Children.count(children) > 0,
        enableErrorBoundary
      }
    );
  };
  
  /**
   * Handle retry action with error logging
   */
  const handleRetry = () => {
    console.log(`🔄 Retrying chart: ${title}`);
    logChartErrorWithContext('retry_attempt', { timestamp: new Date().toISOString() });
    
    if (onRetry) {
      onRetry();
    } else {
      // Fallback: reload the page
      window.location.reload();
    }
  };
  
  // Determine what to render based on state
  let content;
  
  if (loading) {
    content = (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={chartHeight}
        role="status"
        aria-label="Loading chart data"
      >
        <CircularProgress />
      </Box>
    );
  } else if (error) {
    // Log the error for debugging
    logChartErrorWithContext('Chart Data Error', error);
    
    content = (
      <Box height={chartHeight} display="flex" alignItems="center" justifyContent="center">
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 2, 
            maxWidth: '90%',
            '& .MuiAlert-message': {
              fontSize: '0.95rem',
              lineHeight: 1.5
            }
          }}
          action={
            onRetry && (
              <Button 
                color="inherit" 
                size="small" 
                startIcon={<RefreshIcon />}
                onClick={handleRetry}
              >
                Retry
              </Button>
            )
          }
        >
          {error}
        </Alert>
      </Box>
    );
  } else if (isEmpty) {
    content = (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={chartHeight}
        bgcolor="background.paper"
        borderRadius={1}
        border={1}
        borderColor="divider"
      >
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  } else {
    // Chart content with error boundary
    const chartContent = (
      <Box
        height={chartHeight}
        sx={{
          minHeight: chartHeight,
          maxHeight: chartHeight,
          overflow: 'hidden', // Prevent chart overflow
          display: 'flex',
          flexDirection: 'column'
        }}
        role={accessibilityEnabled ? "img" : undefined}
        aria-label={accessibilityEnabled ? (ariaLabel || title) : undefined}
      >
        <ResponsiveContainer width="100%" height="100%">
          {React.Children.count(children) > 0 
            ? React.Children.only(children as React.ReactElement) 
            : <div>No chart content available</div>
          }
        </ResponsiveContainer>
      </Box>
    );
    
    // Wrap with error boundary if enabled
    content = enableErrorBoundary ? (
      <ChartErrorBoundary chartName={title}>
        {chartContent}
      </ChartErrorBoundary>
    ) : chartContent;
  }

  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden', // Prevent content overflow
        border: '1px solid',
        borderColor: 'divider'
      }}
      elevation={1}
      id={`chart-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Box mb={2} sx={{ flexShrink: 0 }}>
        <Typography variant="h6" component="h2">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      
      {actions && (
        <Box mb={2} sx={{ flexShrink: 0 }}>
          {actions}
        </Box>
      )}
      
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: 0, // Allow flex child to shrink
        overflow: 'hidden' // Prevent content overflow
      }}>
        {content}
      </Box>
    </Paper>
  );
};

export { ChartContainer };
export default ChartContainer;
