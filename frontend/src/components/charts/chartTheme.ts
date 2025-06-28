/**
 * Chart theming constants for consistent styling across visualization components
 * 
 * IMPORTANT: These constants have been moved to utils/chartConstants.ts
 * to avoid circular dependencies. This file is kept for backward compatibility.
 */

// Re-export from chartConstants to maintain backward compatibility
import { CHART_COLORS } from './utils/chartConstants';
export * from './utils/chartConstants';

/**
 * Returns an array of colors for charts with multiple series
 * @param count The number of colors needed
 * @returns Array of colors
 */
export const getSeriesColors = (count: number): string[] => {
  const colorList = [
    CHART_COLORS.color1,
    CHART_COLORS.color2, 
    CHART_COLORS.color3,
    CHART_COLORS.color4,
    CHART_COLORS.color5,
    CHART_COLORS.color6,
    CHART_COLORS.color7,
    CHART_COLORS.color8
  ];
  
  // If there are more items than colors, cycle through colors again
  if (count > colorList.length) {
    const extendedColors = [];
    for (let i = 0; i < count; i++) {
      extendedColors.push(colorList[i % colorList.length]);
    }
    return extendedColors;
  }
  
  return colorList.slice(0, count);
};

/**
 * Chart height constants
 */
export const CHART_HEIGHT = {
  small: 200,
  medium: 300,
  large: 400,
};
