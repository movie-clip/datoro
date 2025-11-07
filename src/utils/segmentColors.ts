/**
 * Consistent color mapping for revenue segments across all tickers
 */

// Color palette optimized for revenue segments
const SEGMENT_COLORS = [
  '#5470C6', // Blue - Primary product/region
  '#91CC75', // Green - Services/Secondary
  '#FAC858', // Yellow - Hardware/Third
  '#EE6666', // Red - Regional/Fourth
  '#73C0DE', // Light Blue - Additional
  '#3BA272', // Dark Green - Additional
  '#FC8452', // Orange - Additional
  '#9A60B4', // Purple - Additional
  '#EA7CCC', // Pink - Additional
  '#37A2DA', // Cyan - Additional
  '#67E0E3', // Turquoise - Additional
  '#E69D87', // Salmon - Additional
  '#8378EA', // Violet - Additional
  '#96BFFF', // Sky Blue - Additional
  '#DD6B66', // Dark Red - Additional
] as const

/**
 * Get consistent color for a product segment
 */
export function getProductColor(segmentName: string, index: number): string {
  // Always use index-based color to ensure each segment is unique
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length] || '#5470C6'
}

/**
 * Get consistent color for a geographic segment
 */
export function getGeographicColor(regionName: string, index: number): string {
  // Always use index-based color to ensure each segment is unique
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length] || '#5470C6'
}

/**
 * Generate color array for all segments
 */
export function getSegmentColors(
  segments: string[], 
  type: 'product' | 'geographic'
): string[] {
  const colorFn = type === 'product' ? getProductColor : getGeographicColor
  return segments.map((segment, index) => colorFn(segment, index))
}
