/**
 * Tests for Eurostat JSON-stat parser
 * Uses real API response structures to verify parsing logic
 */

import { describe, it, expect } from 'vitest'

/**
 * Simplified version of the parser for testing
 * This matches the logic in server/services/eurostatService.ts
 */
function parseEurostatData(data: any): Array<{ date: string; value: number }> {
  try {
    const timeLabels = data.dimension?.time?.category?.label
    const values = data.value

    if (!timeLabels || !values || Object.keys(values).length === 0) {
      return []
    }

    const dimensions = data.dimension
    const dimNames = Object.keys(dimensions)
    const dimSizes = dimNames.map((name: string) => {
      const dim = dimensions[name]
      return dim?.category?.index ? Object.keys(dim.category.index).length : 0
    })

    const timeIndex = dimNames.indexOf('time')
    if (timeIndex === -1) return []

    const timeDim = dimensions['time']
    if (!timeDim?.category?.index) return []

    const timeIndexMap = timeDim.category.index as Record<string, number>
    const timeKeys = Object.keys(timeIndexMap).sort((a, b) => (timeIndexMap[a] ?? 0) - (timeIndexMap[b] ?? 0))
    const timeSize = dimSizes[timeIndex] as number

    const availableKeys = Object.keys(values).map(Number).sort((a, b) => a - b)
    if (availableKeys.length === 0) return []

    const firstKey = availableKeys[0] as number
    const isTimeLastDimension = timeIndex === dimNames.length - 1

    const result: Array<{ date: string; value: number }> = []

    if (isTimeLastDimension) {
      // For time as last dimension, use the index from timeIndexMap directly
      for (const timeKey of timeKeys) {
        const timeLinearIndex = timeIndexMap[timeKey]
        if (timeLinearIndex === undefined) continue
        
        const value = values[timeLinearIndex.toString()]

        if (value !== null && value !== undefined && !isNaN(value)) {
          result.push({ date: timeKey, value })
        }
      }
    } else {
      // For time NOT as last dimension, calculate stride
      let stride = 1
      for (let i = timeIndex + 1; i < dimNames.length; i++) {
        stride *= (dimSizes[i] as number)
      }

      for (let timeIdx = 0; timeIdx < timeKeys.length; timeIdx++) {
        const timeKey = timeKeys[timeIdx]
        if (!timeKey) continue
        
        const valueLinearIndex = (Math.floor(firstKey / timeSize) * timeSize) + (timeIdx * stride)
        const value = values[valueLinearIndex.toString()]

        if (value !== null && value !== undefined && !isNaN(value)) {
          result.push({ date: timeKey, value })
        }
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    return []
  }
}

describe('Eurostat Parser', () => {
  describe('Time as Last Dimension (Sequential)', () => {
    it('should parse Interest Rate data (time is last, sparse data starting at index 240)', () => {
      // Real Eurostat API response structure for irt_st_m?geo=EA&int_rt=IRT_M3
      const mockData = {
        dimension: {
          freq: { category: { index: { 'M': 0 } } },
          int_rt: { category: { index: { 'IRT_M3': 0 } } },
          geo: { category: { index: { 'EA': 0 } } },
          time: {
            category: {
              index: {
                '1990-01': 240,
                '1990-02': 241,
                '1990-03': 242,
                '1990-04': 243,
                '1990-05': 244
              },
              label: {
                '1990-01': 'January 1990',
                '1990-02': 'February 1990',
                '1990-03': 'March 1990',
                '1990-04': 'April 1990',
                '1990-05': 'May 1990'
              }
            }
          }
        },
        value: {
          '240': 10.80,
          '241': 10.76,
          '242': 10.72,
          '243': 10.24,
          '244': 10.17
        },
        size: [1, 1, 1, 670] // [freq, int_rt, geo, time]
      }

      const result = parseEurostatData(mockData)

      expect(result).toHaveLength(5)
      expect(result[0]).toEqual({ date: '1990-01', value: 10.80 })
      expect(result[1]).toEqual({ date: '1990-02', value: 10.76 })
      expect(result[4]).toEqual({ date: '1990-05', value: 10.17 })
    })

    it('should handle simple consecutive data', () => {
      const mockData = {
        dimension: {
          geo: { category: { index: { 'EA': 0 } } },
          time: {
            category: {
              index: {
                '2020-01': 0,
                '2020-02': 1,
                '2020-03': 2
              },
              label: {
                '2020-01': 'January 2020',
                '2020-02': 'February 2020',
                '2020-03': 'March 2020'
              }
            }
          }
        },
        value: {
          '0': 100.5,
          '1': 101.2,
          '2': 102.3
        },
        size: [1, 3]
      }

      const result = parseEurostatData(mockData)

      expect(result).toHaveLength(3)
      expect(result[0]?.date).toBe('2020-01')
      expect(result[0]?.value).toBe(100.5)
      expect(result[2]?.value).toBe(102.3)
    })
  })

  describe('Edge Cases', () => {
    it('should return empty array for missing time dimension', () => {
      const mockData = {
        dimension: {
          geo: { category: { index: { 'EA': 0 } } }
        },
        value: { '0': 100 }
      }

      const result = parseEurostatData(mockData)
      expect(result).toEqual([])
    })

    it('should return empty array for empty values', () => {
      const mockData = {
        dimension: {
          time: {
            category: {
              index: { '2020-01': 0 },
              label: { '2020-01': 'January 2020' }
            }
          }
        },
        value: {}
      }

      const result = parseEurostatData(mockData)
      expect(result).toEqual([])
    })

    it('should skip null/undefined values', () => {
      const mockData = {
        dimension: {
          geo: { category: { index: { 'EA': 0 } } },
          time: {
            category: {
              index: {
                '2020-01': 0,
                '2020-02': 1,
                '2020-03': 2
              },
              label: {
                '2020-01': 'January 2020',
                '2020-02': 'February 2020',
                '2020-03': 'March 2020'
              }
            }
          }
        },
        value: {
          '0': 100,
          '1': null,
          '2': 102
        },
        size: [1, 3]
      }

      const result = parseEurostatData(mockData)

      expect(result).toHaveLength(2)
      expect(result[0]?.value).toBe(100)
      expect(result[1]?.value).toBe(102)
    })

    it('should return empty for missing time labels', () => {
      const mockData = {
        dimension: {
          time: {
            category: {
              index: { '2020-01': 0 }
              // Missing label property
            }
          }
        },
        value: { '0': 100 }
      }

      const result = parseEurostatData(mockData)
      expect(result).toEqual([])
    })
  })
})
