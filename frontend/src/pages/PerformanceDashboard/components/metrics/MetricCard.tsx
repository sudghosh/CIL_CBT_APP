/**
 * MetricCard Component
 * 
 * Reusable card component for displaying key performance metrics
 * with consistent styling and optional trend indicators.
 */

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Chip,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';

/**
 * Trend direction for metric changes
 */
export type TrendDirection = 'up' | 'down' | 'flat';

/**
 * Props for MetricCard component
 */
export interface MetricCardProps {
  /** Main metric title */
  title: string;
  /** Primary metric value */
  value: string | number;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Icon component to display */
  icon?: React.ReactNode;
  /** Trend direction */
  trend?: TrendDirection;
  /** Trend percentage change */
  trendValue?: number;
  /** Additional info chip */
  chip?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  /** Card color theme */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Click handler */
  onClick?: () => void;
  /** Loading state */
  loading?: boolean;
}

/**
 * Get trend icon and color based on direction
 */
const getTrendInfo = (direction: TrendDirection, theme: any) => {
  switch (direction) {
    case 'up':
      return {
        icon: <TrendingUpIcon fontSize="small" />,
        color: theme.palette.success.main,
      };
    case 'down':
      return {
        icon: <TrendingDownIcon fontSize="small" />,
        color: theme.palette.error.main,
      };
    case 'flat':
      return {
        icon: <TrendingFlatIcon fontSize="small" />,
        color: theme.palette.text.secondary,
      };
    default:
      return null;
  }
};

/**
 * MetricCard component
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  chip,
  color = 'primary',
  onClick,
  loading = false,
}) => {
  const theme = useTheme();
  const trendInfo = trend ? getTrendInfo(trend, theme) : null;
  
  // Get color based on theme
  const iconColor = theme.palette[color].main;

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        {/* Header with title and chip */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography color="text.secondary" gutterBottom variant="body2">
            {title}
          </Typography>
          {chip && (
            <Chip
              label={chip.label}
              size="small"
              color={chip.color || 'primary'}
              variant="outlined"
            />
          )}
        </Box>

        {/* Main content area */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            {/* Main value */}
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {loading ? '...' : value}
            </Typography>
            
            {/* Subtitle */}
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            
            {/* Trend indicator */}
            {trendInfo && trendValue !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ color: trendInfo.color, display: 'flex', alignItems: 'center' }}>
                  {trendInfo.icon}
                  <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 'medium' }}>
                    {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          
          {/* Icon */}
          {icon && (
            <Box sx={{ color: iconColor, opacity: 0.8 }}>
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
