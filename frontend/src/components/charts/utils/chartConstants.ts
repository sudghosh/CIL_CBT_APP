/**
 * Common constants used across chart components
 * These constants are separated to avoid circular dependencies
 */

export const CHART_COLORS = {
  // Primary colors
  primary: '#8884d8', // Purple - primary color for main metrics
  secondary: '#82ca9d', // Green - secondary color for comparisons
  tertiary: '#ffc658', // Yellow - tertiary color for highlights
  
  // Additional colors for multi-series charts (topic-specific data)
  color1: '#8884d8', // Purple
  color2: '#82ca9d', // Green
  color3: '#ffc658', // Yellow
  color4: '#ff8042', // Orange
  color5: '#0088fe', // Blue
  color6: '#00C49F', // Teal
  color7: '#FFBB28', // Gold
  color8: '#FF8042', // Coral
  
  // Status colors
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
  
  // Chart element colors
  axis: '#666666',
  grid: '#cccccc',
  tooltip: '#f5f5f5',
  tooltipBorder: '#d5d5d5',
  
  // Background colors
  background: '#ffffff',
  backgroundAlt: '#f9f9f9',
};

export const CHART_MARGIN = {
  top: 20,
  right: 30,
  bottom: 30,
  left: 20,
};

export const CHART_FONT = {
  family: '"Roboto", "Helvetica", "Arial", sans-serif',
  sizeSmall: 12,
  sizeMedium: 14, 
  sizeLarge: 16,
};

export type ChartTimePeriod = '7d' | '30d' | '90d' | '1y' | 'all';
