import { describe, expect, it } from 'vitest'
import { initialState } from './calculatorReducer'
import { HISTORY_LIMIT } from './operations'
import { deserialize, serialize } from './persistence'
import { press } from './testing'

describe('serialize', () => {
  it('drops the in-flight request', () => {
    const waiting = press('2+3=', { respond: false }).state
    expect(waiting.pendingRequest).not.toBeNull()
    expect(serialize(waiting)).not.toHaveProperty('pendingRequest')
  })
})

describe('deserialize', () => {
  it('round-trips a real state', () => {
    const state = press('12*3=100+').state
    const restored = deserialize(JSON.parse(JSON.stringify(serialize(state))))
    expect(restored).toEqual(state)
  })

  it('restores the state from before a request that was in flight (spec P2)', () => {
    const before = press('2+3').state
    const waiting = press('=', { from: before, respond: false }).state

    const restored = deserialize(JSON.parse(JSON.stringify(serialize(waiting))))
    expect(restored).toEqual({ ...before, sequence: waiting.sequence })
    expect(restored?.pendingRequest).toBeNull()
  })

  it('accepts entries produced by the calculator', () => {
    for (const entry of ['0', '-12.5', '0.', '1e+21', '-1.5e-7']) {
      expect(deserialize({ ...serialize(initialState), entry })).not.toBeNull()
    }
  })

  it.each([
    ['not an object', 'hello'],
    ['null', null],
    ['an array', []],
    ['an empty object', {}],
    ['a bad entry', { entry: 'abc' }],
    ['an empty entry', { entry: '' }],
    ['a hex entry', { entry: '0x10' }],
    ['a non-boolean overwrite', { overwrite: 'yes' }],
    ['a non-boolean awaitingOperand', { awaitingOperand: 1 }],
    ['a string accumulator', { accumulator: '5' }],
    ['an infinite accumulator', { accumulator: Number.POSITIVE_INFINITY }],
    ['an unknown operator', { pendingOperator: 'modulo' }],
    ['a non-string expression', { expression: 5 }],
    ['a non-string error', { error: 404 }],
    ['history that is not an array', { history: {} }],
    ['a history entry without a result', { history: [{ id: 1, expression: '1 + 1' }] }],
    ['a history entry with a fractional id', { history: [{ id: 1.5, expression: 'x', result: 1 }] }],
    ['a negative sequence', { sequence: -1 }],
    ['a fractional sequence', { sequence: 1.5 }],
  ])('rejects %s (spec P3)', (_, patch) => {
    const stored = typeof patch === 'object' && patch !== null && !Array.isArray(patch) && Object.keys(patch).length
      ? { ...serialize(initialState), ...patch }
      : patch
    expect(deserialize(stored)).toBeNull()
  })

  it('trims history to the limit', () => {
    const history = Array.from({ length: HISTORY_LIMIT + 10 }, (_, i) => ({ id: i + 1, expression: 'x', result: i }))
    const restored = deserialize({ ...serialize(initialState), history, sequence: HISTORY_LIMIT + 10 })
    expect(restored?.history).toHaveLength(HISTORY_LIMIT)
  })

  it('moves the sequence past every stored history id', () => {
    const history = [{ id: 7, expression: 'x', result: 1 }]
    expect(deserialize({ ...serialize(initialState), history, sequence: 2 })?.sequence).toBe(7)
  })
})
