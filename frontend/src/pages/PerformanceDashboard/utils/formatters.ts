/**
 * Data Formatting Utilities
 * 
 * Helper functions for formatting data in the Performance Dashboard
 */

/**
 * Format a number as a percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format time in seconds to a human-readable string
 */
export const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 */
export const formatNumber = (value: number): string => {
  if (value < 1000) {
    return value.toString();
  }
  
  if (value < 1000000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  if (value < 1000000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  return `${(value / 1000000000).toFixed(1)}B`;
};

/**
 * Get color based on performance score
 */
export const getPerformanceColor = (score: number, theme: any) => {
  if (score >= 80) return theme.palette.success.main;
  if (score >= 60) return theme.palette.warning.main;
  return theme.palette.error.main;
};

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Calculate trend direction based on current and previous values
 */
export const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'flat' => {
  const difference = current - previous;
  const threshold = 0.1; // 0.1% threshold for "flat"
  
  if (Math.abs(difference) < threshold) return 'flat';
  return difference > 0 ? 'up' : 'down';
};

/**
 * Calculate percentage change between two values
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};
