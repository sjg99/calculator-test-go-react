import { describe, expect, it } from 'vitest'
import { formatEntry, formatNumber, numberToEntry } from './formatNumber'

describe('numberToEntry', () => {
  it.each([
    [36, '36'],
    [0.5, '0.5'],
    [-2.25, '-2.25'],
    [-0, '0'],
    [1e21, '1e+21'],
  ])('%s → %s', (value, expected) => {
    expect(numberToEntry(value)).toBe(expected)
  })
})

describe('formatEntry', () => {
  it.each([
    ['0', '0'],
    ['123', '123'],
    ['1234', '1,234'],
    ['1234567.891', '1,234,567.891'],
    ['-9876543', '-9,876,543'],
    ['1234.', '1,234.'],
    ['0.0001', '0.0001'],
    ['-', '-'],
    ['1e+21', '1e+21'],
    ['-1.5e-7', '-1.5e-7'],
  ])('%s → %s', (entry, expected) => {
    expect(formatEntry(entry)).toBe(expected)
  })
})

describe('formatNumber', () => {
  it('formats numbers', () => {
    expect(formatNumber(1234567.5)).toBe('1,234,567.5')
    expect(formatNumber(-0)).toBe('0')
  })
})
