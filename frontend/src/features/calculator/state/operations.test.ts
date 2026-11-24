import { describe, expect, it } from 'vitest'
import {
  binaryLabel,
  countDigits,
  isBinaryOperation,
  percentLabel,
  percentOperands,
  sqrtLabel,
} from './operations'

describe('percentOperands (ADR 0007)', () => {
  it('uses the left operand as base after add and subtract', () => {
    expect(percentOperands(10, 200, 'add')).toEqual([10, 200])
    expect(percentOperands(10, 200, 'subtract')).toEqual([10, 200])
  })

  it('is a plain percentage after multiply, divide and power', () => {
    expect(percentOperands(10, 200, 'multiply')).toEqual([10])
    expect(percentOperands(10, 200, 'divide')).toEqual([10])
    expect(percentOperands(10, 200, 'power')).toEqual([10])
  })

  it('is a plain percentage with nothing pending', () => {
    expect(percentOperands(50, null, null)).toEqual([50])
  })
})

describe('labels', () => {
  it('formats binary operations', () => {
    expect(binaryLabel(1234, 'divide', -2)).toBe('1,234 ÷ (-2)')
  })

  it('formats square roots', () => {
    expect(sqrtLabel(16)).toBe('√16')
    expect(sqrtLabel(-4)).toBe('√(-4)')
  })

  it('formats percentages', () => {
    expect(percentLabel([50])).toBe('50%')
    expect(percentLabel([10, 2000])).toBe('10% of 2,000')
  })
})

describe('helpers', () => {
  it('recognises binary operations', () => {
    expect(isBinaryOperation('add')).toBe(true)
    expect(isBinaryOperation('sqrt')).toBe(false)
    expect(isBinaryOperation(5)).toBe(false)
  })

  it('counts digits only', () => {
    expect(countDigits('-12.50')).toBe(4)
  })
})
