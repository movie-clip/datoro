import { COLORS } from '../../utils/colors'

/**
 * Chart Theme Configuration
 * Centralizes all chart styling to ensure consistency with the application design.
 */
export const chartTheme = {
    colors: {
        primary: COLORS.brand.primary,
        primaryDark: COLORS.brand.primaryDark,
        success: COLORS.status.success,
        warning: COLORS.status.warning,
        danger: COLORS.status.danger,
        text: '#E5E5E5',
        textSecondary: '#9CA3AF',
        gridLine: 'rgba(255, 255, 255, 0.05)',
        axisLine: 'rgba(255, 255, 255, 0.1)',
        tooltipBg: 'rgba(20, 20, 25, 0.95)',
        tooltipBorder: 'rgba(255, 255, 255, 0.1)',
        crosshair: 'rgba(255, 255, 255, 0.2)',
    },
    fonts: {
        main: '"Inter", "Manrope", sans-serif',
    },
    textStyle: {
        title: {
            color: '#E5E5E5',
            fontSize: 14,
            fontWeight: 600,
        },
        axis: {
            color: '#9CA3AF',
            fontSize: 10,
        },
        legend: {
            color: '#DDD',
            fontSize: 12,
        },
    },
}

export const getChartColor = (type: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' = 'primary') => {
    switch (type) {
        case 'success': return chartTheme.colors.success
        case 'warning': return chartTheme.colors.warning
        case 'danger': return chartTheme.colors.danger
        case 'neutral': return chartTheme.colors.textSecondary
        case 'primary':
        default: return chartTheme.colors.primary
    }
}

export const DEFAULT_SLIDER_CONFIG = {
    backgroundColor: 'rgba(47, 69, 84, 0)',
    fillerColor: 'rgba(167, 183, 204, 0.4)',
    borderColor: '#ddd',
    handleColor: '#a7b7cc',
    textColor: '#333',
    dataBackgroundLine: '#2A2E36',
    dataBackgroundArea: '#2A2E36',
    moveHandleSize: 0
}
