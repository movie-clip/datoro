// tests/unit/validation.test.ts
// Unit tests for validation middleware

import { describe, it, expect } from 'vitest'
import {
  validateTicker,
  validatePeriod,
  sanitizeString
} from '../../server/middleware/validation.js'

describe('Validation Utilities', () => {
  describe('validateTicker', () => {
    it('should validate correct tickers', () => {
      expect(validateTicker('AAPL')).toBe('AAPL')
      expect(validateTicker('MSFT')).toBe('MSFT')
      expect(validateTicker('GOOGL')).toBe('GOOGL')
      expect(validateTicker('TSLA')).toBe('TSLA')
    })

    it('should convert to uppercase', () => {
      expect(validateTicker('aapl')).toBe('AAPL')
      expect(validateTicker('msft')).toBe('MSFT')
    })

    it('should trim whitespace', () => {
      expect(validateTicker('  AAPL  ')).toBe('AAPL')
      expect(validateTicker('MSFT\n')).toBe('MSFT')
    })

    it('should accept tickers with dots (e.g., BRK.B)', () => {
      expect(validateTicker('BRK.B')).toBe('BRK.B')
      expect(validateTicker('BRK.A')).toBe('BRK.A')
    })

    it('should reject invalid tickers', () => {
      expect(() => validateTicker('invalid123')).toThrow()
      expect(() => validateTicker('TOOLONG')).toThrow()
      expect(() => validateTicker('12345')).toThrow()
      expect(() => validateTicker('')).toThrow()
      expect(() => validateTicker(null as any)).toThrow()
      expect(() => validateTicker(undefined as any)).toThrow()
    })

    it('should reject tickers with special characters', () => {
      expect(() => validateTicker('AAP$')).toThrow()
      expect(() => validateTicker('MSF@')).toThrow()
      expect(() => validateTicker('GOO#L')).toThrow()
    })
  })

  describe('validatePeriod', () => {
    it('should validate "annual"', () => {
      expect(validatePeriod('annual')).toBe('annual')
      expect(validatePeriod('ANNUAL')).toBe('annual')
    })

    it('should validate "quarterly"', () => {
      expect(validatePeriod('quarterly')).toBe('quarterly')
      expect(validatePeriod('QUARTERLY')).toBe('quarterly')
    })

    it('should return default for null/undefined', () => {
      expect(validatePeriod(null as any)).toBe('annual')
      expect(validatePeriod(undefined as any)).toBe('annual')
      expect(validatePeriod('')).toBe('annual')
    })

    it('should trim whitespace', () => {
      expect(validatePeriod('  annual  ')).toBe('annual')
      expect(validatePeriod('quarterly\n')).toBe('quarterly')
    })

    it('should reject invalid periods', () => {
      expect(() => validatePeriod('daily')).toThrow()
      expect(() => validatePeriod('monthly')).toThrow()
      expect(() => validatePeriod('yearly')).toThrow()
      expect(() => validatePeriod('invalid')).toThrow()
    })
  })

  describe('sanitizeString', () => {
    it('should remove XSS payloads', () => {
      const xss = '<script>alert("xss")</script>'
      const sanitized = sanitizeString(xss)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })

    it('should handle normal strings', () => {
      expect(sanitizeString('Apple Inc.')).toBe('Apple Inc.')
      expect(sanitizeString('Tesla Motors')).toBe('Tesla Motors')
    })

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test')
    })

    it('should handle null/undefined', () => {
      expect(sanitizeString(null as any)).toBe('')
      expect(sanitizeString(undefined as any)).toBe('')
    })

    it('should remove SQL injection attempts', () => {
      const sql = "'; DROP TABLE users; --"
      const sanitized = sanitizeString(sql)
      expect(sanitized).toBeDefined()
      expect(sanitized.length).toBeGreaterThan(0)
    })
  })
})
