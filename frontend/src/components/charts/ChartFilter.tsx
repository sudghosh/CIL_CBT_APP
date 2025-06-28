import React from 'react';
import { ToggleButtonGroup, ToggleButton, Box, Typography } from '@mui/material';

export type ChartTimePeriod = 'week' | 'month' | 'year' | 'all';

interface ChartFilterProps {
  /**
   * Selected time period
   */
  timePeriod: ChartTimePeriod;
  
  /**
   * Callback when time period changes
   */
  onTimePeriodChange: (period: ChartTimePeriod) => void;
  
  /**
   * Optional label for the filter
   */
  label?: string;
  
  /**
   * Available time periods
   */
  availableTimePeriods?: ChartTimePeriod[];
}

/**
 * Component for filtering chart data by time period
 */
const ChartFilter: React.FC<ChartFilterProps> = ({
  timePeriod,
  onTimePeriodChange,
  label = 'Time Period',
  availableTimePeriods = ['week', 'month', 'year', 'all']
}) => {
  // Handle change event
  const handleTimePeriodChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimePeriod: ChartTimePeriod | null,
  ) => {
    // Don't allow null (unselected state)
    if (newTimePeriod !== null) {
      onTimePeriodChange(newTimePeriod);
    }
  };
  
  // Map time periods to user-friendly labels
  const timePeriodLabels: Record<ChartTimePeriod, string> = {
    'week': 'Week',
    'month': 'Month',
    'year': 'Year',
    'all': 'All Time'
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 2 }}>
      {label && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mr: 1 }}
        >
          {label}:
        </Typography>
      )}
      <ToggleButtonGroup
        size="small"
        value={timePeriod}
        exclusive
        onChange={handleTimePeriodChange}
        aria-label="chart time period filter"
      >
        {availableTimePeriods.map(period => (
          <ToggleButton 
            key={period} 
            value={period} 
            aria-label={timePeriodLabels[period]}
          >
            {timePeriodLabels[period]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export { ChartFilter };
export default ChartFilter;
