import { calculateGrowthRates, type GrowthRates } from '../../utils/growthCalculator'
import { getGrowthRates } from '../../services/financials/growthService'
import { getAllDataPoints, extractYearsFromSeries } from '../../utils/chartDataTransformers'
import { buildFiscalQuarterMap, formatFiscalQuarter, calculateCalendarQuarter } from '../../utils/fiscalQuarterUtils'

type TimeSeriesPoint = [number, number] | [number, number, string, string]

export interface ChartDataSeries {
    data?: TimeSeriesPoint[]
    name?: string
    [key: string]: unknown
}

type ChartSeriesInput = TimeSeriesPoint[] | ChartDataSeries[] | ChartDataSeries | null | undefined

function isChartSeriesObject(value: unknown): value is ChartDataSeries {
    return typeof value === 'object' && value !== null
}

function isChartSeriesPoint(value: unknown): value is TimeSeriesPoint {
    return Array.isArray(value)
        && typeof value[0] === 'number'
        && typeof value[1] === 'number'
}

function hasSeriesDataArray(value: unknown): value is ChartDataSeries & { data: TimeSeriesPoint[] } {
    return isChartSeriesObject(value) && Array.isArray(value.data)
}

export interface CategoryData {
    uniqueYears: number | null
    yearsList: number[]
    categoryData: string[]
    timestamps: number[]
}

/**
 * Checks if the chart data is effectively empty
 */
export function isChartDataEmpty(
    series: ChartSeriesInput,
    loading: boolean,
    error: string | null | undefined
): boolean {
    if (error) return false // Has a real error
    if (loading) return false // Still loading

    if (!series) return true

    if (Array.isArray(series)) {
        if (series.length === 0) return true
        if (isChartSeriesPoint(series[0])) return false
        return series.every((s) => !isChartSeriesObject(s) || !Array.isArray(s.data) || s.data.length === 0)
    }

    return false
}

/**
 * Calculates growth rates for the chart data
 */
export function calculateChartGrowth(
    series: ChartSeriesInput,
    ticker: string | null,
    customGrowthData: GrowthRates | null,
    stacked: boolean = false
): GrowthRates | null {
    if (customGrowthData) return customGrowthData

    let dataToAnalyze: Array<[number, number]> = []

    if (Array.isArray(series)) {
        if (series.length > 0 && isChartSeriesPoint(series[0])) {
            // Simple array of [timestamp, value] pairs
            dataToAnalyze = (series as TimeSeriesPoint[]).map(([timestamp, value]) => [timestamp, value] as [number, number])
        } else if (series.length > 0 && hasSeriesDataArray(series[0])) {
            // Multi-series
            if (stacked && series.length > 1) {
                // Sum all series values at each timestamp
                const dateMap = new Map<number, number>()
                series.forEach((s) => {
                    if (hasSeriesDataArray(s)) {
                        s.data.forEach((point) => {
                            const date = point[0]
                            const value = point[1]
                            dateMap.set(date, (dateMap.get(date) || 0) + value)
                        })
                    }
                })
                dataToAnalyze = Array.from(dateMap.entries()).sort((a, b) => a[0] - b[0])
            } else {
                // Use first series
                const firstSeries = hasSeriesDataArray(series[0])
                    ? series[0].data
                    : []
                dataToAnalyze = firstSeries.map(([timestamp, value]) => [timestamp, value] as [number, number])
            }
        }
    }

    if (dataToAnalyze.length < 2) return null

    // Use cached calculations when ticker is available
    if (ticker) {
        return getGrowthRates(dataToAnalyze)
    }

    return calculateGrowthRates(dataToAnalyze)
}

/**
 * Generates category data (timestamps, labels) for the X-axis
 */
export function generateCategoryData(
    series: ChartSeriesInput,
    kind: 'line' | 'bar',
    timeframe: 'annual' | 'quarterly'
): CategoryData {
    let uniqueYears: number | null = null
    let yearsList: number[] = []
    let categoryData: string[] = []
    let timestamps: number[] = []

    if (kind === 'bar') {
        const dataSource = series

        if (Array.isArray(dataSource)) {
            const allDataPoints = getAllDataPoints(dataSource as TimeSeriesPoint[] | Array<{ name: string; data: TimeSeriesPoint[] }>)

            if (allDataPoints.length > 0) {
                if (timeframe === 'quarterly') {
                    const uniqueTimestamps = [...new Set(allDataPoints.map(point => point[0]))].sort((a, b) => a - b)

                    const firstPoint = allDataPoints.find(p => p && p.length > 0)
                    const hasFiscalQuarters = firstPoint && firstPoint.length === 4

                    if (hasFiscalQuarters) {
                        const fiscalQuarterMap = buildFiscalQuarterMap(allDataPoints)

                        const timestampQuarterPairs = uniqueTimestamps.map(ts => {
                            const fiscalInfo = fiscalQuarterMap.get(ts)
                            const label = fiscalInfo
                                ? formatFiscalQuarter(fiscalInfo.period, fiscalInfo.year)
                                : ''
                            return { ts, label }
                        })

                        timestamps = timestampQuarterPairs.map(item => item.ts)
                        categoryData = timestampQuarterPairs.map(item => item.label)
                        uniqueYears = timestamps.length
                    } else {
                        const timestampQuarterPairs = uniqueTimestamps.map(ts => {
                            const label = calculateCalendarQuarter(ts)
                            return { ts, label }
                        })

                        timestamps = timestampQuarterPairs.map(item => item.ts)
                        categoryData = timestampQuarterPairs.map(item => item.label)
                        uniqueYears = timestamps.length
                    }
                } else {
                    yearsList = extractYearsFromSeries(allDataPoints)
                    uniqueYears = yearsList.length
                    categoryData = yearsList.map(y => String(y))
                }
            }
        }
    }

    return { uniqueYears, yearsList, categoryData, timestamps }
}
