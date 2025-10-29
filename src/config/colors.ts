/**
 * Centralized color constants for the application
 * Ensures consistency across all components and charts
 */

export const COLORS = {
  // Brand colors (Aston Martin inspired)
  brand: {
    primary: '#00A88E',
    primaryDark: '#00594C',
    primaryLight: '#00755F',
  },
  
  // Chart colors - blue theme
  chart: {
    blue: '#3B82F6',      // Primary blue - matches toggle active state
    blueLight: '#60A5FA', // Light blue variant
    blueDark: '#2563EB',  // Dark blue variant
    green: '#00B59A',     // Brand green
    purple: '#6C5CE7',    // Accent purple
    orange: '#F59E0B',    // Warning/accent
    red: '#EF4444',       // Danger/negative
  },
  
  // Status colors
  status: {
    success: '#00A88E',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  
  // Neutral colors
  neutral: {
    grey: '#AAA',
    greyLight: '#999',
    greyDark: '#444',
    greyDarker: '#333',
  }
} as const

export type ChartColor = typeof COLORS.chart[keyof typeof COLORS.chart]
export type BrandColor = typeof COLORS.brand[keyof typeof COLORS.brand]
