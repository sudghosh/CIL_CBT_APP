import React, { Component, ErrorInfo } from 'react';
import { Box, Typography, Button, Paper, Container, Divider } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console and possibly to an error monitoring service
    console.error('Uncaught error:', error, errorInfo);
    
    // Store errorInfo in state
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    // Attempt to reload the page to recover from error
    window.location.reload();
  };

  handleGoHome = () => {
    // Reset error state and navigate to home page
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Check for custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default error UI with retry option
      return (
        <Container maxWidth="sm">
          <Paper 
            elevation={3} 
            sx={{
              p: 4,
              mt: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom align="center">
              Something went wrong
            </Typography>
            
            <Divider sx={{ width: '100%', my: 2 }} />

            <Typography variant="body1" color="text.secondary" paragraph align="center">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              <Button 
                variant="outlined"  
                onClick={this.handleGoHome}
              >
                Go to Home
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}
