import React, { Component, ReactNode } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import { chartErrorLogger } from '../../utils/chartErrorLogger';

interface Props {
  children: ReactNode;
  chartName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
}

/**
 * Error Boundary specifically designed for chart components
 * Catches JavaScript errors in chart rendering and provides helpful user feedback
 */
class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `chart-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      hasError: true, 
      error,
      errorInfo: null,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Log the error using enhanced error logger
    this.logChartError(error, errorInfo);
  }

  /**
   * Enhanced logging for chart errors with context information
   */
  logChartError = (error: Error, errorInfo: any) => {
    const { chartName } = this.props;

    // Use the centralized error logger for comprehensive tracking
    chartErrorLogger.logRenderingError(
      chartName || 'Unknown Chart',
      error,
      {
        componentStack: errorInfo?.componentStack,
        errorBoundaryProps: this.props
      }
    );
  };

  /**
   * Send error to monitoring service (now handled by chartErrorLogger)
   */
  sendErrorToMonitoring = (error: Error, errorInfo: any, errorId: string) => {
    // This is now handled by the centralized error logger
    console.log('📊 Error logging handled by chartErrorLogger:', errorId);
  };

  /**
   * Reset error state to retry rendering
   */
  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: ''
    });
  };

  /**
   * Report the error (placeholder for user feedback)
   */
  handleReport = () => {
    const { errorId } = this.state;
    const { chartName } = this.props;
    
    // TODO: Open user feedback modal or redirect to support
    console.log(`📝 User reported error ${errorId} for chart: ${chartName}`);
    
    // For now, copy error ID to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorId).then(() => {
        alert(`Error ID copied to clipboard: ${errorId}`);
      });
    }
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, chartName, fallback } = this.props;

    if (hasError) {
      // Custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            icon={<BugReportIcon />}
          >
            <Typography variant="h6" gutterBottom>
              Chart Error: {chartName || 'Chart'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {process.env.NODE_ENV === 'development' 
                ? `Error: ${error?.message || 'Unknown error'}`
                : 'Something went wrong while loading this chart. Our team has been notified.'
              }
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="text"
                  size="small"
                  onClick={this.handleReport}
                >
                  Copy Error ID
                </Button>
              )}
            </Box>
            
            {process.env.NODE_ENV === 'development' && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                Error ID: {errorId}
              </Typography>
            )}
          </Alert>
        </Box>
      );
    }

    return children;
  }
}

export default ChartErrorBoundary;
