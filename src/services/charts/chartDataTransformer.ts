import { calculateGrowthRates, type GrowthRates } from '../../utils/growthCalculator'
import { getGrowthRates } from '../../services/financials/growthService'
import { getAllDataPoints, extractYearsFromSeries } from '../../utils/chartDataTransformers'
import { buildFiscalQuarterMap, formatFiscalQuarter, calculateCalendarQuarter } from '../../utils/fiscalQuarterUtils'

export interface ChartDataSeries {
    data?: Array<[number, number] | [number, number, string, string]>
    name?: string
    [key: string]: any
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
    series: ChartDataSeries[] | ChartDataSeries | any,
    loading: boolean,
    error: string | null | undefined
): boolean {
    if (error) return false // Has a real error
    if (loading) return false // Still loading

    if (!series) return true

    if (Array.isArray(series)) {
        if (series.length === 0) return true
        return series.every((s: any) =>
            !s?.data || (Array.isArray(s.data) && s.data.length === 0)
        )
    }

    return false
}

/**
 * Calculates growth rates for the chart data
 */
export function calculateChartGrowth(
    series: any,
    ticker: string | null,
    customGrowthData: GrowthRates | null,
    stacked: boolean = false
): GrowthRates | null {
    if (customGrowthData) return customGrowthData

    let dataToAnalyze: Array<[number, number]> = []

    if (Array.isArray(series)) {
        if (series.length > 0 && Array.isArray(series[0])) {
            // Simple array of [timestamp, value] pairs
            dataToAnalyze = series as Array<[number, number]>
        } else if (series.length > 0 && (series[0] as any)?.data) {
            // Multi-series
            if (stacked && series.length > 1) {
                // Sum all series values at each timestamp
                const dateMap = new Map<number, number>()
                series.forEach((s: any) => {
                    if (s.data && Array.isArray(s.data)) {
                        s.data.forEach((point: any) => {
                            const date = Array.isArray(point) ? point[0] : point
                            const value = Array.isArray(point) ? point[1] : 0
                            dateMap.set(date, (dateMap.get(date) || 0) + value)
                        })
                    }
                })
                dataToAnalyze = Array.from(dateMap.entries()).sort((a, b) => a[0] - b[0])
            } else {
                // Use first series
                const firstSeries = (series[0] as any).data || []
                dataToAnalyze = firstSeries.map((point: any) => {
                    if (Array.isArray(point)) {
                        return [point[0], point[1]] as [number, number]
                    }
                    return point
                })
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
    series: any,
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
            const allDataPoints = getAllDataPoints(dataSource as any)

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
