import type { EChartsOption } from 'echarts'
import { getTooltipConfig } from '../../composables/useTooltipFormatter'
import { createSeriesConfig, type SeriesDataObject } from '../../utils/chartSeriesFactory'
import { createXAxisConfig, createYAxisConfig } from '../../utils/chartAxisFactory'
import type { CategoryData } from './chartDataTransformer'

export interface ChartOptionBuilderParams {
    title: string
    series: any
    compactSeries?: any
    kind: 'line' | 'bar'
    yFormat: 'int' | 'currency' | 'percent' | 'short' | 'price' | 'decimal' | 'ratio'
    smooth: number
    barMaxWidth: number
    isModal: boolean
    forceExpanded: boolean
    viewMode?: string | null
    selectedSegments?: string[] | null
    loading: boolean
    showLegend: boolean
    stacked: boolean
    useLegend: boolean
    dualAxis: boolean
    rightAxisType: 'symmetric' | 'percentage'
    alignZero: boolean
    ticker: string | null
    timeframe: 'annual' | 'quarterly'
    enableZoom: boolean
    isMobile: boolean
    categoryData: CategoryData
    // New options for Macro Charts
    color?: string
    areaStyle?: any
    showAverage?: boolean // SMA 200
    sliderConfig?: any
    dataZoomType?: 'inside' | 'slider'
}

/**
 * Calculate Simple Moving Average (SMA)
 */
function calculateSMA(data: [number, number][], period: number): [number, number][] {
    if (!data || data.length < period) return []

    const sma: [number, number][] = []

    for (let i = period - 1; i < data.length; i++) {
        let sum = 0
        for (let j = 0; j < period; j++) {
            const dataPoint = data[i - j]
            if (dataPoint) {
                sum += dataPoint[1]
            }
        }
        const average = sum / period
        const timestamp = data[i]?.[0]
        if (timestamp !== undefined) {
            sma.push([timestamp, average])
        }
    }

    return sma
}

/**
 * Builds the ECharts option object based on the provided parameters.
 */
export function buildChartOption(params: ChartOptionBuilderParams, isLarge: boolean = false): EChartsOption {
    const {
        title,
        series: rawSeries,
        compactSeries,
        kind,
        yFormat,
        smooth,
        barMaxWidth,
        showLegend,
        useLegend,
        dualAxis,
        rightAxisType,
        alignZero,
        timeframe,
        enableZoom,
        isMobile,
        categoryData,
        color,
        areaStyle,
        showAverage,
        sliderConfig,
        dataZoomType = 'inside'
    } = params

    // Use compactSeries for compact view if provided, otherwise use series
    const dataSource = !isLarge && compactSeries ? compactSeries : rawSeries

    // Get cached category data
    const { yearsList, timestamps } = categoryData

    // In modal view with useLegend, show legend at top
    const showLegendAtTop = isLarge && useLegend
    // Increased top padding on mobile modal (50 instead of 30) for toggle buttons
    const topPadding = showLegendAtTop ? 60 : (isLarge ? (isMobile ? 50 : 30) : 45)
    // Add extra bottom padding if showLegend is enabled (for multi-series charts)
    const bottomPadding = isLarge ? 60 : showLegend ? (isMobile ? 15 : 55) : (isMobile ? 15 : 50)

    // Build legend selection
    const legendSelected: Record<string, boolean> = {}
    if (useLegend && Array.isArray(rawSeries) && rawSeries.length > 0 && (rawSeries[0] as any)?.name) {
        rawSeries.forEach((s: any, idx: number) => {
            legendSelected[s.name] = idx === 0 // Only first item selected
        })
    }

    // SMA Calculation
    let smaData: [number, number][] = []
    if (showAverage && Array.isArray(dataSource) && dataSource.length > 0) {
        // Assuming single series for SMA calculation
        // If it's [timestamp, value] array
        if (Array.isArray(dataSource[0])) {
            smaData = calculateSMA(dataSource as [number, number][], 200)
        }
    }
    const hasSMA = smaData.length > 0

    // DataZoom Configuration
    let dataZoom: any[] | undefined = undefined
    if (kind === 'line' && (isLarge || enableZoom)) {
        if (dataZoomType === 'slider' && sliderConfig) {
            dataZoom = [
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    ...sliderConfig,
                    borderColor: sliderConfig.borderColor,
                    fillerColor: sliderConfig.fillerColor,
                    handleStyle: {
                        color: sliderConfig.handleColor,
                        borderColor: sliderConfig.handleColor
                    },
                    textStyle: {
                        color: sliderConfig.textColor
                    },
                    dataBackground: {
                        lineStyle: {
                            color: sliderConfig.dataBackgroundLine
                        },
                        areaStyle: {
                            color: sliderConfig.dataBackgroundArea
                        }
                    },
                    moveHandleSize: sliderConfig.moveHandleSize
                }
            ]
        } else {
            dataZoom = [
                {
                    type: 'inside',
                    start: 0,
                    end: 100,
                    zoomOnMouseWheel: true,
                    moveOnMouseMove: true,
                    moveOnMouseWheel: false,
                    preventDefaultMouseMove: false,
                    throttle: 50,
                    zoomLock: false,
                    minSpan: 1,
                    maxSpan: 100
                }
            ]
        }
    }

    // Performance: Disable animations for large datasets (>500 points)
    const dataPointCount = Array.isArray(dataSource) 
        ? (Array.isArray(dataSource[0]) ? dataSource.length : 0)
        : 0
    const disableAnimation = dataPointCount > 500

    const base: unknown = {
        backgroundColor: 'transparent',
        useUTC: false,
        animation: disableAnimation ? false : (enableZoom ? {
            duration: 300,
            easing: 'cubicOut'
        } : true),
        animationDuration: disableAnimation ? 0 : 400,
        animationEasing: 'cubicOut',
        animationDurationUpdate: disableAnimation ? 0 : 400,
        animationEasingUpdate: 'cubicInOut',
        title: isLarge ? undefined : {
            text: title,
            left: 'center',
            top: 0,
            textStyle: { color: '#fff', fontSize: 14 }
        },
        dataZoom,
        legend: showAverage && hasSMA ? {
            data: [title, 'SMA 200'],
            top: 5,
            left: 'center',
            textStyle: { color: '#9CA3AF', fontSize: 12 },
            selected: { [title]: true, 'SMA 200': false }
        } : showLegendAtTop ? {
            show: true,
            type: 'plain',
            orient: 'horizontal',
            top: 10,
            left: 'center',
            textStyle: { color: '#ddd', fontSize: 12 },
            selectedMode: 'single',
            selected: legendSelected
        } : showLegend ? {
            show: true,
            type: 'plain',
            orient: 'horizontal',
            bottom: 5,
            left: 'center',
            textStyle: { color: '#ddd', fontSize: isMobile ? 11 : 12 },
            selectedMode: 'multiple',
            itemGap: isMobile ? 8 : 12
        } : useLegend ? {
            show: false,
            selected: legendSelected
        } : {
            show: false
        },
        grid: {
            left: isMobile ? 12 : 24,
            right: isMobile ? 12 : 24,
            top: topPadding,
            bottom: bottomPadding
        },
        tooltip: getTooltipConfig({
            isLarge,
            isMobile,
            kind,
            dualAxis,
            yFormat
        }),
        xAxis: createXAxisConfig(kind, {
            categoryData: categoryData.categoryData,
            isLarge,
            isMobile,
            isQuarterly: timeframe === 'quarterly'
        }),
        yAxis: createYAxisConfig({
            dualAxis,
            yFormat,
            rightAxisType: rightAxisType as any,
            alignZero,
            isLarge,
            isMobile,
            chartTitle: title
        }),
    }

    // Handle both single series array and multi-series array
    let series = createSeriesConfig(
        dataSource as [number, number][] | [number, number, string, string][] | SeriesDataObject[] | Record<string, unknown>,
        kind,
        {
            title,
            yearsList: timeframe === 'quarterly' ? timestamps : yearsList,
            barMaxWidth,
            smooth: smooth as any,
            isLarge,
            color,
            areaStyle
        }
    )

    // Add SMA series if needed
    if (showAverage && hasSMA) {
        series.push({
            name: 'SMA 200',
            type: 'line',
            data: smaData,
            smooth: false,
            symbol: 'none',
            lineStyle: {
                color: '#FBBF24', // Yellow
                width: 2,
                type: 'dashed'
            },
            itemStyle: {
                color: '#FBBF24'
            },
            z: 10,
            animation: false
        } as any)
    }

    // CRITICAL: Ensure yAxisIndex consistency with axis configuration
    if (dualAxis && Array.isArray(series)) {
        series = series.map((s: any) => {
            if (s.type === 'line') {
                return { ...s, yAxisIndex: 1 }
            } else {
                return { ...s, yAxisIndex: 0 }
            }
        })
    } else if (!dualAxis && Array.isArray(series)) {
        series = series.map((s: any) => {
            const { yAxisIndex, ...cleanSeries } = s
            return cleanSeries
        })
    }

    if (!base || !series) {
        return {} as EChartsOption
    }

    return { ...base, series } as EChartsOption
}
