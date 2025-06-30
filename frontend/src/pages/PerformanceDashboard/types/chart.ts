/**
 * Chart Component Types
 * 
 * Interfaces for chart components and data visualization
 */

import { TimePeriod, TimeSeriesDataPoint } from './api';

/**
 * Chart color palette and theme
 */
export interface ChartTheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  neutral: string[];
}

/**
 * Chart size configuration
 */
export interface ChartSize {
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
}

/**
 * Chart configuration options
 */
export interface ChartConfig {
  theme: ChartTheme;
  size: ChartSize;
  responsive: boolean;
  animation: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  showGrid: boolean;
}

/**
 * Data point for pie/donut charts
 */
export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

/**
 * Data point for bar charts
 */
export interface BarChartDataPoint {
  category: string;
  value: number;
  label?: string;
  color?: string;
}

/**
 * Chart props for different chart types
 */
export interface BaseChartProps {
  config?: Partial<ChartConfig>;
  className?: string;
  testId?: string;
}

export interface PieChartProps extends BaseChartProps {
  data: PieChartDataPoint[];
  title?: string;
  centerLabel?: string;
}

export interface BarChartProps extends BaseChartProps {
  data: BarChartDataPoint[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface LineChartProps extends BaseChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  timePeriod?: TimePeriod;
  xAxisLabel?: string;
  yAxisLabel?: string;
  lines: Array<{
    key: string;
    name: string;
    color?: string;
  }>;
}

/**
 * Chart container props
 */
export interface ChartContainerProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}
