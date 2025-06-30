/**
 * Enhanced Chart Error Logging Utility
 * Provides comprehensive error tracking and logging for chart components
 */

export interface ChartError {
  errorId: string;
  chartName: string;
  errorType: 'api_error' | 'rendering_error' | 'data_error' | 'auth_error' | 'network_error' | 'unknown_error';
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  userId?: string;
  additionalContext?: Record<string, any>;
}

export interface ChartErrorSummary {
  totalErrors: number;
  errorsByChart: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: ChartError[];
}

class ChartErrorLogger {
  private errors: ChartError[] = [];
  private maxErrorHistory = 100;
  private errorSubscribers: ((error: ChartError) => void)[] = [];

  /**
   * Log a chart error with comprehensive context
   */
  logError(
    chartName: string,
    error: Error | string,
    errorType: ChartError['errorType'] = 'unknown_error',
    additionalContext?: Record<string, any>
  ): string {
    const errorId = this.generateErrorId();
    
    const chartError: ChartError = {
      errorId,
      chartName,
      errorType,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      additionalContext
    };

    // Add to error history
    this.errors.unshift(chartError);
    
    // Limit error history size
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(0, this.maxErrorHistory);
    }

    // Console logging with enhanced formatting
    this.logToConsole(chartError);

    // Notify subscribers
    this.errorSubscribers.forEach(subscriber => {
      try {
        subscriber(chartError);
      } catch (err) {
        console.error('Error in error subscriber:', err);
      }
    });

    // Optional: Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(chartError);
    }

    return errorId;
  }

  /**
   * Log API-specific errors with request context
   */
  logApiError(
    chartName: string,
    endpoint: string,
    error: any,
    requestData?: any
  ): string {
    const additionalContext = {
      endpoint,
      requestData,
      responseStatus: error.response?.status,
      responseData: error.response?.data
    };

    return this.logError(
      chartName,
      error,
      'api_error',
      additionalContext
    );
  }

  /**
   * Log rendering errors with component context
   */
  logRenderingError(
    chartName: string,
    error: Error,
    componentProps?: any
  ): string {
    const additionalContext = {
      componentProps: componentProps ? JSON.stringify(componentProps, null, 2) : undefined
    };

    return this.logError(
      chartName,
      error,
      'rendering_error',
      additionalContext
    );
  }

  /**
   * Log data validation/processing errors
   */
  logDataError(
    chartName: string,
    message: string,
    data?: any
  ): string {
    const additionalContext = {
      invalidData: data ? JSON.stringify(data, null, 2) : undefined
    };

    return this.logError(
      chartName,
      message,
      'data_error',
      additionalContext
    );
  }

  /**
   * Get error summary for monitoring dashboard
   */
  getErrorSummary(): ChartErrorSummary {
    const errorsByChart: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    this.errors.forEach(error => {
      errorsByChart[error.chartName] = (errorsByChart[error.chartName] || 0) + 1;
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
    });

    return {
      totalErrors: this.errors.length,
      errorsByChart,
      errorsByType,
      recentErrors: this.errors.slice(0, 10)
    };
  }

  /**
   * Subscribe to error events
   */
  subscribeToErrors(callback: (error: ChartError) => void): () => void {
    this.errorSubscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorSubscribers.indexOf(callback);
      if (index > -1) {
        this.errorSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get errors for a specific chart
   */
  getErrorsForChart(chartName: string): ChartError[] {
    return this.errors.filter(error => error.chartName === chartName);
  }

  /**
   * Check if a chart has frequent errors (more than 3 in last 5 minutes)
   */
  isChartProblematic(chartName: string): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentErrors = this.errors.filter(error => 
      error.chartName === chartName && 
      new Date(error.timestamp) > fiveMinutesAgo
    );
    
    return recentErrors.length > 3;
  }

  /**
   * Private helper methods
   */
  private generateErrorId(): string {
    return `chart-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logToConsole(error: ChartError): void {
    console.group(`🔥 Chart Error: ${error.chartName} [${error.errorType}]`);
    console.error('Error ID:', error.errorId);
    console.error('Message:', error.message);
    console.error('Timestamp:', error.timestamp);
    
    if (error.stack) {
      console.error('Stack Trace:', error.stack);
    }
    
    if (error.additionalContext) {
      console.error('Additional Context:', error.additionalContext);
    }
    
    console.error('User Agent:', error.userAgent);
    console.error('URL:', error.url);
    console.groupEnd();
  }

  private sendToMonitoring(error: ChartError): void {
    // TODO: Integrate with error monitoring service
    // This could send to Sentry, LogRocket, or custom monitoring endpoint
    console.log('📊 Error would be sent to monitoring service:', error.errorId);
    
    // Example of what production monitoring might look like:
    /*
    fetch('/api/monitoring/chart-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(error)
    }).catch(err => console.error('Failed to send error to monitoring:', err));
    */
  }
}

// Create singleton instance
export const chartErrorLogger = new ChartErrorLogger();

// Export convenience functions
export const logChartError = chartErrorLogger.logError.bind(chartErrorLogger);
export const logChartApiError = chartErrorLogger.logApiError.bind(chartErrorLogger);
export const logChartRenderingError = chartErrorLogger.logRenderingError.bind(chartErrorLogger);
export const logChartDataError = chartErrorLogger.logDataError.bind(chartErrorLogger);

export default chartErrorLogger;
