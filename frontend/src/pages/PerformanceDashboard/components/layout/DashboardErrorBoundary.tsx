/**
 * DashboardErrorBoundary Component
 * 
 * Error boundary specifically designed for Performance Dashboard components.
 * Provides graceful error handling with user-friendly error messages and recovery options.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

/**
 * Props for DashboardErrorBoundary
 */
interface Props {
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Component name for error reporting */
  componentName?: string;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State for DashboardErrorBoundary
 */
interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * DashboardErrorBoundary component
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate a unique error ID for tracking
    const errorId = `dashboard-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.group('🚨 Dashboard Component Error');
    console.error('Component:', this.props.componentName || 'Unknown');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error ID:', this.state.errorId);
    console.groupEnd();
  }

  /**
   * Reset error state and retry
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  /**
   * Copy error details to clipboard
   */
  handleCopyError = () => {
    const { error, errorInfo, errorId } = this.state;
    const { componentName } = this.props;
    
    const errorDetails = {
      errorId,
      component: componentName || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card sx={{ m: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ErrorIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
              <Box>
                <Typography variant="h6" color="error.main">
                  Component Error
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {this.props.componentName || 'Dashboard component'} encountered an error
                </Typography>
              </Box>
            </Box>

            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                size="small"
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleCopyError}
                size="small"
              >
                Copy Error Details
              </Button>
            </Box>

            {/* Expandable error details for debugging */}
            {process.env.NODE_ENV === 'development' && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">
                    Debug Information (Error ID: {this.state.errorId})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {this.state.error?.stack}
                    </Typography>
                    {this.state.errorInfo && (
                      <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                        Component Stack:
                        {this.state.errorInfo.componentStack}
                      </Typography>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;
