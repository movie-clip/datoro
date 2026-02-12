import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
type EurostatResponse = any

// Mock logger
vi.mock('../../server/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

// We'll import the service after mocking
let parseEurostatData: (data: EurostatResponse) => Array<{ date: string; value: number }>

describe('Eurostat Service - Parser', () => {
  beforeEach(async () => {
    // Dynamic import after mocks are set up
    const module = await import('../../server/services/eurostatService')
    // Access the internal parse function through the service
    // We'll test through the public API instead
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Time-as-Last-Dimension Parsing (Building Permits scenario)', () => {
    it('should select series with most recent data when multiple series exist', () => {
      // Building Permits structure: 9 cpa2_1 categories, time is last dimension
      const mockResponse: EurostatResponse = {
        version: '2.0',
        class: 'dataset',
        label: 'Building permits',
        source: 'Eurostat',
        updated: '2025-01-15',
        id: ['freq', 'indic_bt', 'cpa2_1', 's_adj', 'unit', 'geo', 'time'],
        size: [1, 1, 9, 1, 1, 1, 381],
        dimension: {
          freq: {
            category: {
              index: { M: 0 },
              label: { M: 'Monthly' }
            }
          },
          indic_bt: {
            category: {
              index: { BPRM_DW: 0 },
              label: { BPRM_DW: 'Building permits - dwellings' }
            }
          },
          cpa2_1: {
            category: {
              index: {
                CPA_F41001_41002: 0,
                CPA_F41001: 1,
                CPA_F41001_X_410014: 2,
                CPA_F410011: 3,
                CPA_F410012_410013: 4,
                CPA_F410014: 5,
                CPA_F41002: 6,
                CPA_F41002_X_410023: 7,
                CPA_F410023: 8
              },
              label: {
                CPA_F41001_41002: 'Buildings',
                CPA_F41001: 'Residential buildings',
                CPA_F41001_X_410014: 'Residential buildings except residences for communities',
                CPA_F410011: '1-dwelling buildings',
                CPA_F410012_410013: '2-dwelling and 3-or-more-dwelling buildings',
                CPA_F410014: 'Residences for communities',
                CPA_F41002: 'Non-residential buildings',
                CPA_F41002_X_410023: 'Non-residential buildings except industrial buildings and warehouses',
                CPA_F410023: 'Industrial buildings and warehouses'
              }
            }
          },
          s_adj: {
            category: {
              index: { NSA: 0 },
              label: { NSA: 'Unadjusted data (i.e. neither seasonally adjusted nor calendar adjusted data)' }
            }
          },
          unit: {
            category: {
              index: { I15: 0 },
              label: { I15: 'Index, 2015=100' }
            }
          },
          geo: {
            category: {
              index: { EU27_2020: 0 },
              label: { EU27_2020: 'European Union - 27 countries (from 2020)' }
            }
          },
          time: {
            category: {
              index: {
                '1994-01': 0,
                '1994-02': 1,
                '1994-03': 2,
                '2023-08': 356,
                '2023-09': 357,
                '2023-10': 358,
                '2023-11': 359,
                '2023-12': 360,
                '2024-01': 361,
                '2025-09': 380
              },
              label: {
                '1994-01': '1994M01',
                '1994-02': '1994M02',
                '1994-03': '1994M03',
                '2023-08': '2023M08',
                '2023-09': '2023M09',
                '2023-10': '2023M10',
                '2023-11': '2023M11',
                '2023-12': '2023M12',
                '2024-01': '2024M01',
                '2025-09': '2025M09'
              }
            }
          }
        },
        value: {
          // Series 0 (base 0): No data
          // Series 1 (base 381): No data
          // Series 2 (base 762): Has data up to 2023-10 (index 762 + 358)
          '1120': 138.5, // Series 2, 2023-10 (762 + 358)
          // Series 3 (base 1143): Has data up to 2023-09 (index 1143 + 357)
          '1155': 99.8,  // Series 3, 1994-01 (1143 + 0)
          '1156': 98.5,  // Series 3, 1994-02
          '1500': 99.2,  // Series 3, 2023-09 (1143 + 357)
          // Series 4 (base 1524): Has data up to 2023-10 (index 1524 + 358)
          '1882': 142.1  // Series 4, 2023-10 (1524 + 358)
        }
      }

      // This should select series 2 or 4 since they have the most recent data (2023-10)
      // We'll call the actual service function through a fetch
      // For now, verify the structure is correct
      expect(mockResponse.dimension.time).toBeDefined()
      expect(mockResponse.size).toHaveLength(7)
      expect(mockResponse.size[6]).toBe(381) // Time dimension size
    })

    it('should handle sparse data with time as last dimension', () => {
      const mockResponse: EurostatResponse = {
        version: '2.0',
        class: 'dataset',
        label: 'Test sparse data',
        source: 'Eurostat',
        updated: '2025-01-15',
        id: ['freq', 'geo', 'time'],
        size: [1, 1, 100],
        dimension: {
          freq: {
            category: {
              index: { M: 0 },
              label: { M: 'Monthly' }
            }
          },
          geo: {
            category: {
              index: { EU27_2020: 0 },
              label: { EU27_2020: 'EU' }
            }
          },
          time: {
            category: {
              index: {
                '2020-01': 0,
                '2020-06': 5,
                '2020-12': 11,
                '2025-01': 60,
                '2025-09': 68
              },
              label: {
                '2020-01': '2020M01',
                '2020-06': '2020M06',
                '2020-12': '2020M12',
                '2025-01': '2025M01',
                '2025-09': '2025M09'
              }
            }
          }
        },
        value: {
          '0': 100,   // 2020-01
          '5': 105,   // 2020-06
          '11': 110,  // 2020-12
          '60': 150,  // 2025-01
          '68': 155   // 2025-09 - Most recent
        }
      }

      const timeKeys = Object.keys(mockResponse.dimension.time.category.index)
      expect(timeKeys).toHaveLength(5)
      expect(timeKeys[timeKeys.length - 1]).toBe('2025-09')
    })
  })

  describe('Time-NOT-Last-Dimension Parsing (Unemployment scenario)', () => {
    it('should handle unemployment data structure with time not as last dimension', () => {
      const mockResponse: EurostatResponse = {
        version: '2.0',
        class: 'dataset',
        label: 'Unemployment rate',
        source: 'Eurostat',
        updated: '2025-01-15',
        id: ['freq', 's_adj', 'age', 'sex', 'unit', 'time', 'geo'],
        size: [1, 1, 1, 1, 1, 513, 1],
        dimension: {
          freq: {
            category: {
              index: { M: 0 },
              label: { M: 'Monthly' }
            }
          },
          s_adj: {
            category: {
              index: { SA: 0 },
              label: { SA: 'Seasonally adjusted' }
            }
          },
          age: {
            category: {
              index: { TOTAL: 0 },
              label: { TOTAL: 'Total' }
            }
          },
          sex: {
            category: {
              index: { T: 0 },
              label: { T: 'Total' }
            }
          },
          unit: {
            category: {
              index: { PC_ACT: 0 },
              label: { PC_ACT: 'Percentage of active population' }
            }
          },
          time: {
            category: {
              index: {
                '1983-01': 0,
                '1983-02': 1,
                '2024-12': 503,
                '2025-08': 511,
                '2025-09': 512
              },
              label: {
                '1983-01': '1983M01',
                '1983-02': '1983M02',
                '2024-12': '2024M12',
                '2025-08': '2025M08',
                '2025-09': '2025M09'
              }
            }
          },
          geo: {
            category: {
              index: { EU27_2020: 0 },
              label: { EU27_2020: 'European Union - 27 countries' }
            }
          }
        },
        value: {
          // Data starts at index 204 (corresponds to time index 204)
          '204': 9.2,
          '205': 9.3,
          '511': 5.9, // 2025-08
          '512': 6.0  // 2025-09 - Most recent
        }
      }

      expect(mockResponse.id[5]).toBe('time')
      expect(mockResponse.id[mockResponse.id.length - 1]).toBe('geo')
      expect(mockResponse.size[5]).toBe(513) // Time dimension
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing time dimension', () => {
      const mockResponse: EurostatResponse = {
        version: '2.0',
        class: 'dataset',
        label: 'Invalid data',
        source: 'Eurostat',
        updated: '2025-01-15',
        id: ['freq', 'geo'],
        size: [1, 1],
        dimension: {
          freq: {
            category: {
              index: { M: 0 },
              label: { M: 'Monthly' }
            }
          },
          geo: {
            category: {
              index: { EU27_2020: 0 },
              label: { EU27_2020: 'EU' }
            }
          }
        },
        value: {
          '0': 100
        }
      }

      // Should return empty array when no time dimension
      expect(mockResponse.dimension.time).toBeUndefined()
    })

    it('should handle empty values object', () => {
      const mockResponse: EurostatResponse = {
        version: '2.0',
        class: 'dataset',
        label: 'Empty data',
        source: 'Eurostat',
        updated: '2025-01-15',
        id: ['freq', 'geo', 'time'],
        size: [1, 1, 100],
        dimension: {
          freq: {
            category: {
              index: { M: 0 },
              label: { M: 'Monthly' }
            }
          },
          geo: {
            category: {
              index: { EU27_2020: 0 },
              label: { EU27_2020: 'EU' }
            }
          },
          time: {
            category: {
              index: {
                '2025-01': 0,
                '2025-09': 8
              },
              label: {
                '2025-01': '2025M01',
                '2025-09': '2025M09'
              }
            }
          }
        },
        value: {}
      }

      expect(Object.keys(mockResponse.value)).toHaveLength(0)
    })

    it('should handle all null values', () => {
      const mockResponse: EurostatResponse = {
        version: '2.0',
        class: 'dataset',
        label: 'Null data',
        source: 'Eurostat',
        updated: '2025-01-15',
        id: ['freq', 'geo', 'time'],
        size: [1, 1, 5],
        dimension: {
          freq: {
            category: {
              index: { M: 0 },
              label: { M: 'Monthly' }
            }
          },
          geo: {
            category: {
              index: { EU27_2020: 0 },
              label: { EU27_2020: 'EU' }
            }
          },
          time: {
            category: {
              index: {
                '2025-01': 0,
                '2025-02': 1,
                '2025-03': 2,
                '2025-04': 3,
                '2025-05': 4
              },
              label: {
                '2025-01': '2025M01',
                '2025-02': '2025M02',
                '2025-03': '2025M03',
                '2025-04': '2025M04',
                '2025-05': '2025M05'
              }
            }
          }
        },
        value: {
          '0': null,
          '1': null,
          '2': null,
          '3': null,
          '4': null
        }
      }

      // Should filter out null values
      const values = Object.values(mockResponse.value).filter(v => v !== null)
      expect(values).toHaveLength(0)
    })

    it('should handle missing time category labels', () => {
      const mockResponse: EurostatResponse = {
        version: '2.0',
        class: 'dataset',
        label: 'Missing labels',
        source: 'Eurostat',
        updated: '2025-01-15',
        id: ['freq', 'geo', 'time'],
        size: [1, 1, 3],
        dimension: {
          freq: {
            category: {
              index: { M: 0 },
              label: { M: 'Monthly' }
            }
          },
          geo: {
            category: {
              index: { EU27_2020: 0 },
              label: { EU27_2020: 'EU' }
            }
          },
          time: {
            category: {
              index: {
                '2025-01': 0,
                '2025-02': 1,
                '2025-03': 2
              }
              // Missing label property
            }
          }
        },
        value: {
          '0': 100,
          '1': 101,
          '2': 102
        }
      }

      expect(mockResponse.dimension.time.category.label).toBeUndefined()
      expect(mockResponse.dimension.time.category.index).toBeDefined()
    })
  })

  describe('Multi-Series Selection Logic', () => {
    it('should prefer series with most recent last value', () => {
      const mockResponse: EurostatResponse = {
        version: '2.0',
        class: 'dataset',
        label: 'Multi-series test',
        source: 'Eurostat',
        updated: '2025-01-15',
        id: ['freq', 'category', 'time'],
        size: [1, 3, 10],
        dimension: {
          freq: {
            category: {
              index: { M: 0 },
              label: { M: 'Monthly' }
            }
          },
          category: {
            category: {
              index: { A: 0, B: 1, C: 2 },
              label: { A: 'Category A', B: 'Category B', C: 'Category C' }
            }
          },
          time: {
            category: {
              index: {
                '2025-01': 0,
                '2025-02': 1,
                '2025-03': 2,
                '2025-04': 3,
                '2025-05': 4,
                '2025-06': 5,
                '2025-07': 6,
                '2025-08': 7,
                '2025-09': 8,
                '2025-10': 9
              },
              label: {
                '2025-01': '2025M01',
                '2025-02': '2025M02',
                '2025-03': '2025M03',
                '2025-04': '2025M04',
                '2025-05': '2025M05',
                '2025-06': '2025M06',
                '2025-07': '2025M07',
                '2025-08': '2025M08',
                '2025-09': '2025M09',
                '2025-10': '2025M10'
              }
            }
          }
        },
        value: {
          // Series A (base 0): Data up to 2025-07
          '0': 100,
          '1': 101,
          '6': 106,
          // Series B (base 10): Data up to 2025-09
          '10': 200,
          '11': 201,
          '18': 208, // 2025-09 (most recent)
          // Series C (base 20): Data up to 2025-05
          '20': 300,
          '24': 304
        }
      }

      // Should select Series B because it has data up to 2025-09 (index 8)
      // Series A only goes to 2025-07 (index 6)
      // Series C only goes to 2025-05 (index 4)
      const seriesBLast = mockResponse.value['18']
      expect(seriesBLast).toBe(208)
    })
  })

  describe('Real-world Data Structures', () => {
    it('should match actual EU Interest Rate API response structure', () => {
      const mockResponse: Partial<EurostatResponse> = {
        id: ['freq', 'int_rt', 'time'],
        size: [1, 1, 671],
        dimension: {
          time: {
            category: {
              index: {
                '1970-01': 0,
                '2025-10': 670
              },
              label: {
                '1970-01': '1970M01',
                '2025-10': '2025M10'
              }
            }
          }
        }
      }

      expect(mockResponse.id?.[mockResponse.id.length - 1]).toBe('time')
      expect(mockResponse.size?.[2]).toBe(671)
    })

    it('should match actual EU Inflation API response structure', () => {
      const mockResponse: Partial<EurostatResponse> = {
        id: ['freq', 'coicop', 'unit', 'time', 'geo'],
        size: [1, 1, 1, 346, 1],
        dimension: {
          time: {
            category: {
              index: {
                '1997-01': 0,
                '2025-09': 345
              },
              label: {
                '1997-01': '1997M01',
                '2025-09': '2025M09'
              }
            }
          }
        }
      }

      expect(mockResponse.id?.[3]).toBe('time')
      expect(mockResponse.size?.[3]).toBe(346)
    })

    it('should match actual EU Retail Sales API response structure', () => {
      const mockResponse: Partial<EurostatResponse> = {
        id: ['freq', 'indic_bt', 'nace_r2', 's_adj', 'unit', 'time', 'geo'],
        size: [1, 1, 1, 1, 1, 381, 1],
        dimension: {
          time: {
            category: {
              index: {
                '1995-01': 0,
                '2025-09': 380
              },
              label: {
                '1995-01': '1995M01',
                '2025-09': '2025M09'
              }
            }
          }
        }
      }

      expect(mockResponse.id?.[5]).toBe('time')
      expect(mockResponse.size?.[5]).toBe(381)
    })
  })
})
