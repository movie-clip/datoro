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
  '#5470C6', // Repeat for more segments
] as const

// Keyword-based color assignments for common segments
const PRODUCT_COLOR_MAP: Record<string, string> = {
  // Apple products
  'iPhone': '#5470C6',        // Blue - flagship product
  'Service': '#91CC75',       // Green - growing segment
  'Services': '#91CC75',      // Green - growing segment
  'Mac': '#FAC858',           // Yellow
  'iPad': '#EE6666',          // Red
  'Wearables': '#73C0DE',     // Light Blue
  'Wearables, Home and Accessories': '#73C0DE',
  
  // Microsoft products
  'Microsoft 365': '#5470C6',      // Blue
  'Office': '#5470C6',             // Blue
  'LinkedIn': '#91CC75',           // Green
  'Linked In Corporation': '#91CC75',
  'Gaming': '#FAC858',             // Yellow
  'Xbox': '#FAC858',               // Yellow
  'Dynamics': '#EE6666',           // Red
  'Server Products': '#73C0DE',    // Light Blue
  'Azure': '#3BA272',              // Dark Green
  'Search': '#FC8452',             // Orange
  'Search and News Advertising': '#FC8452',
  'Enterprise Services': '#9A60B4', // Purple
  'Devices': '#EA7CCC',            // Pink
  
  // Generic categories
  'Hardware': '#FAC858',
  'Software': '#91CC75',
  'Cloud': '#3BA272',
  'Advertising': '#FC8452',
  'Other': '#9A60B4',
}

const GEOGRAPHIC_COLOR_MAP: Record<string, string> = {
  // Americas
  'Americas': '#5470C6',
  'Americas Segment': '#5470C6',
  'United States': '#5470C6',
  'North America': '#5470C6',
  
  // Europe
  'Europe': '#91CC75',
  'Europe Segment': '#91CC75',
  'EMEA': '#91CC75',
  
  // Asia
  'China': '#FAC858',
  'Greater China': '#FAC858',
  'Greater China Segment': '#FAC858',
  'Asia Pacific': '#EE6666',
  'Rest of Asia Pacific': '#EE6666',
  'Rest of Asia Pacific Segment': '#EE6666',
  'Japan': '#73C0DE',
  'Japan Segment': '#73C0DE',
  
  // Other regions
  'Latin America': '#3BA272',
  'Middle East': '#FC8452',
  'Africa': '#9A60B4',
  'Other Countries': '#EA7CCC',
}

/**
 * Get consistent color for a product segment
 */
export function getProductColor(segmentName: string, index: number): string {
  // Try exact match first
  if (PRODUCT_COLOR_MAP[segmentName]) {
    return PRODUCT_COLOR_MAP[segmentName]
  }
  
  // Try partial match (case-insensitive)
  const normalizedName = segmentName.toLowerCase()
  for (const [key, color] of Object.entries(PRODUCT_COLOR_MAP)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return color
    }
  }
  
  // Fallback to index-based color
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length] || '#5470C6'
}

/**
 * Get consistent color for a geographic segment
 */
export function getGeographicColor(regionName: string, index: number): string {
  // Try exact match first
  if (GEOGRAPHIC_COLOR_MAP[regionName]) {
    return GEOGRAPHIC_COLOR_MAP[regionName]
  }
  
  // Try partial match (case-insensitive)
  const normalizedName = regionName.toLowerCase()
  for (const [key, color] of Object.entries(GEOGRAPHIC_COLOR_MAP)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return color
    }
  }
  
  // Fallback to index-based color
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
