/**
 * Helper functions for chart components
 */
import { CHART_COLORS } from './chartConstants';

/**
 * Returns an array of colors for chart series
 * @param count Number of colors needed
 * @returns Array of colors from the CHART_COLORS palette
 */
export const getSeriesColors = (count: number): string[] => {
  const baseColors = [
    CHART_COLORS.color1,
    CHART_COLORS.color2,
    CHART_COLORS.color3,
    CHART_COLORS.color4,
    CHART_COLORS.color5,
    CHART_COLORS.color6,
    CHART_COLORS.color7,
    CHART_COLORS.color8,
  ];
  
  // If we need more colors than in our palette, we'll start repeating them
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(baseColors[i % baseColors.length]);
  }
  
  return result;
};
