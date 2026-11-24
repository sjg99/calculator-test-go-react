import { describe, expect, it } from 'vitest'
import { calculatorReducer, initialState } from './calculatorReducer'
import { HISTORY_LIMIT } from './operations'
import { press } from './testing'
import type { CalculatorState } from './types'

const entryAfter = (keys: string) => press(keys).state.entry

describe('number entry (spec §3.2)', () => {
  it.each([
    ['E1 replaces the leading zero', '7', '7'],
    ['E1 keeps a single zero', '00', '0'],
    ['E2 appends digits', '123', '123'],
    ['E3 allows one decimal point', '12..', '12.'],
    ['E3 ignores a second decimal point later', '1.2.3', '1.23'],
    ['E4 starts with 0. when the entry is fresh', '.', '0.'],
    ['E4 keeps zeros after the point', '0.05', '0.05'],
    ['E5 stops at 16 digits', '12345678901234567', '1234567890123456'],
    ['E5 counts digits after the point', '1234567890.1234567', '1234567890.123456'],
    ['E7 removes the last character', '123<', '12'],
    ['E7 falls back to 0', '5<', '0'],
    ['E7 on a negative single digit falls back to 0', '5n<', '0'],
    ['E9 negates', '5n', '-5'],
    ['E9 negates twice', '5nn', '5'],
    ['E9 leaves 0 alone', 'n', '0'],
    ['typing after negating a zero decimal', '0.n5', '-0.5'],
  ])('%s', (_, keys, expected) => {
    expect(entryAfter(keys)).toBe(expected)
  })

  it('E6 starts a new number after a result', () => {
    const { state } = press('2+3=7')
    expect(state.entry).toBe('7')
    expect(state.expression).toBe('')
  })

  it('E6 starts a new decimal number after a result', () => {
    expect(entryAfter('2+3=.5')).toBe('0.5')
  })

  it('E8 backspace does nothing on a result', () => {
    expect(entryAfter('2+3=<')).toBe('5')
  })

  it('backspace does nothing right after choosing an operator', () => {
    expect(entryAfter('12+<')).toBe('12')
  })

  it('replaces a negative zero with the digit', () => {
    const from: CalculatorState = { ...initialState, entry: '-0' }
    expect(press('4', { from }).state.entry).toBe('-4')
  })
})

describe('binary operations and chaining (spec §3.3)', () => {
  it('B1 stores the left operand and shows the pending operation', () => {
    const { state, requests } = press('12*')
    expect(state).toMatchObject({ accumulator: 12, pendingOperator: 'multiply', expression: '12 ×', entry: '12' })
    expect(requests).toEqual([])
  })

  it('B2 replaces the operator without a request', () => {
    const { state, requests } = press('12*+')
    expect(state).toMatchObject({ pendingOperator: 'add', expression: '12 +' })
    expect(requests).toEqual([])
  })

  it('B3 equals sends the operation and shows the result', () => {
    const { state, requests } = press('12*3=')
    expect(requests).toEqual([{ operation: 'multiply', operands: [12, 3] }])
    expect(state).toMatchObject({ entry: '36', expression: '12 × 3 =', accumulator: null, pendingOperator: null })
  })

  it('B4 chains left to right without precedence', () => {
    const { state, requests } = press('2+3*4=')
    expect(requests).toEqual([
      { operation: 'add', operands: [2, 3] },
      { operation: 'multiply', operands: [5, 4] },
    ])
    expect(state.entry).toBe('20')
  })

  it('B4 shows the intermediate result as the new left operand', () => {
    const { state } = press('2+3*')
    expect(state).toMatchObject({ entry: '5', accumulator: 5, pendingOperator: 'multiply', expression: '5 ×' })
  })

  it('B5 uses the entry as the right operand when none was typed', () => {
    const { state, requests } = press('5+=')
    expect(requests).toEqual([{ operation: 'add', operands: [5, 5] }])
    expect(state.entry).toBe('10')
  })

  it('B6 equals without a pending operator does nothing', () => {
    const { state, requests } = press('5=')
    expect(requests).toEqual([])
    expect(state.entry).toBe('5')
  })

  it('B6 pressing equals twice does not repeat the operation', () => {
    const { requests } = press('2+3==')
    expect(requests).toHaveLength(1)
  })

  it('B7 continues from a result', () => {
    const { state, requests } = press('2+3=*4=')
    expect(requests.at(-1)).toEqual({ operation: 'multiply', operands: [5, 4] })
    expect(state.entry).toBe('20')
  })

  it('subtracts a negated operand and wraps it in parentheses', () => {
    const { state, requests } = press('5-3n=')
    expect(requests).toEqual([{ operation: 'subtract', operands: [5, -3] }])
    expect(state.expression).toBe('5 − (-3) =')
  })

  it('negating right after choosing an operator makes it the right operand', () => {
    const { requests } = press('5+n=')
    expect(requests).toEqual([{ operation: 'add', operands: [5, -5] }])
  })

  it('supports power', () => {
    const { state, requests } = press('2^10=')
    expect(requests).toEqual([{ operation: 'power', operands: [2, 10] }])
    expect(state.entry).toBe('1024')
  })

  it('formats large numbers in the expression', () => {
    expect(press('1234567+').state.expression).toBe('1,234,567 +')
  })
})

describe('unary operations (spec §3.4)', () => {
  it('U1 square root replaces the entry', () => {
    const { state, requests } = press('16r')
    expect(requests).toEqual([{ operation: 'sqrt', operands: [16] }])
    expect(state).toMatchObject({ entry: '4', expression: '√16 =' })
  })

  it('U2 square root keeps the pending operator', () => {
    const afterSqrt = press('9+16r')
    expect(afterSqrt.state).toMatchObject({ entry: '4', accumulator: 9, pendingOperator: 'add', expression: '9 + √16' })

    const { state, requests } = press('=', { from: afterSqrt.state })
    expect(requests).toEqual([{ operation: 'add', operands: [9, 4] }])
    expect(state.entry).toBe('13')
  })

  it('U2 an operator after a unary result chains', () => {
    const { requests } = press('9+16r*')
    expect(requests.at(-1)).toEqual({ operation: 'add', operands: [9, 4] })
  })

  it('U3 percent alone divides by 100', () => {
    const { state, requests } = press('50%')
    expect(requests).toEqual([{ operation: 'percent', operands: [50] }])
    expect(state).toMatchObject({ entry: '0.5', expression: '50% =' })
  })

  it.each([
    ['+', 'add', 220],
    ['-', 'subtract', 180],
  ])('U4 percent after %s is taken of the left operand', (key, _op, expected) => {
    const afterPercent = press(`200${key}10%`)
    expect(afterPercent.requests).toEqual([{ operation: 'percent', operands: [10, 200] }])
    expect(afterPercent.state.entry).toBe('20')
    expect(afterPercent.state.expression).toContain('10% of 200')

    expect(press('=', { from: afterPercent.state }).state.entry).toBe(String(expected))
  })

  it.each(['*', '/', '^'])('U5 percent after %s divides by 100', (key) => {
    const { requests } = press(`200${key}10%`)
    expect(requests).toEqual([{ operation: 'percent', operands: [10] }])
  })

  it('U5 200 × 10% = 20', () => {
    expect(press('200*10%=').state.entry).toBe('20')
  })

  it('shows a negative square root operand in parentheses', () => {
    expect(press('9nr', { respond: false }).state.pendingRequest?.label).toBe('√(-9)')
  })
})

describe('errors and loading (spec §3.5)', () => {
  it('R1 division by zero shows an error and clears the operation', () => {
    const { state } = press('10/0=')
    expect(state).toMatchObject({
      error: 'division_by_zero',
      accumulator: null,
      pendingOperator: null,
      expression: '10 ÷ 0',
    })
  })

  it('R1 a failed square root shows an error', () => {
    expect(press('9nr').state.error).toBe('negative_square_root')
  })

  it.each(['+', '=', '%', 'r', 'n', '<'])('R2 %s does nothing while an error is shown', (key) => {
    const errored = press('10/0=').state
    const { state, requests } = press(key, { from: errored })
    expect(state).toBe(errored)
    expect(requests).toEqual([])
  })

  it('R3 a digit clears the error and starts a new number', () => {
    const { state } = press('10/0=7')
    expect(state).toMatchObject({ error: null, entry: '7', expression: '' })
  })

  it('R3 a decimal point clears the error', () => {
    expect(press('10/0=.').state).toMatchObject({ error: null, entry: '0.' })
  })

  it('R3 the new number can be used normally', () => {
    expect(press('10/0=2+2=').state.entry).toBe('4')
  })

  it('R4 AC resets everything except history', () => {
    const { state } = press('2+3=4*c')
    expect(state).toEqual({ ...initialState, history: state.history, sequence: 1 })
    expect(state.history).toHaveLength(1)
  })

  it('R4 AC clears an error', () => {
    expect(press('10/0=c').state.error).toBeNull()
  })

  it('R6 input is ignored while a request is in flight', () => {
    const waiting = press('2+3=', { respond: false }).state
    expect(waiting.pendingRequest).not.toBeNull()

    for (const key of ['4', '.', '+', '=', 'r', '%', 'n', '<']) {
      expect(press(key, { from: waiting, respond: false }).state).toBe(waiting)
    }
  })

  it('R6 AC cancels a request in flight and ignores its late answer', () => {
    const waiting = press('2+3=', { respond: false }).state
    const requestId = waiting.pendingRequest!.id

    const cleared = calculatorReducer(waiting, { type: 'clear' })
    expect(cleared.pendingRequest).toBeNull()

    const late = calculatorReducer(cleared, { type: 'requestSucceeded', requestId, result: 5 })
    expect(late).toBe(cleared)
    const lateError = calculatorReducer(cleared, { type: 'requestFailed', requestId, error: 'network_error' })
    expect(lateError).toBe(cleared)
  })

  it('ignores an answer for a different request', () => {
    const waiting = press('2+3=', { respond: false }).state
    const wrongId = waiting.pendingRequest!.id + 1
    expect(calculatorReducer(waiting, { type: 'requestSucceeded', requestId: wrongId, result: 5 })).toBe(waiting)
  })

  it('starting a request leaves the visible state unchanged (spec P2)', () => {
    const before = press('2+3').state
    const waiting = calculatorReducer(before, { type: 'equals' })
    expect({ ...waiting, pendingRequest: null, sequence: before.sequence }).toEqual(before)
  })
})

describe('history (spec §3.6)', () => {
  it('H1 records each successful calculation, newest first', () => {
    const { state } = press('2+3*4=16r50%')
    expect(state.history.map((h) => `${h.expression} = ${h.result}`)).toEqual([
      '50% = 0.5',
      '√16 = 4',
      '5 × 4 = 20',
      '2 + 3 = 5',
    ])
  })

  it('H1 records percent of a base', () => {
    expect(press('200+10%').state.history[0]?.expression).toBe('10% of 200')
  })

  it('H1 gives each entry a unique id', () => {
    const ids = press('1+1=2+2=3+3=').state.history.map((h) => h.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('H2 keeps at most 50 entries', () => {
    const { state } = press('1+'.repeat(HISTORY_LIMIT + 5) + '1=')
    expect(state.history).toHaveLength(HISTORY_LIMIT)
    expect(state.history[0]?.result).toBe(HISTORY_LIMIT + 6)
  })

  it('H3 recalling an entry puts its result on the display', () => {
    const calculated = press('12*3=c').state
    const id = calculated.history[0]!.id

    const state = calculatorReducer(calculated, { type: 'recallHistoryEntry', id })
    expect(state).toMatchObject({ entry: '36', overwrite: true })
    expect(press('+1=', { from: state }).state.entry).toBe('37')
  })

  it('H3 a recalled entry becomes the right operand of a pending operation', () => {
    const calculated = press('12*3=c100+').state
    const id = calculated.history[0]!.id

    const recalled = calculatorReducer(calculated, { type: 'recallHistoryEntry', id })
    expect(recalled).toMatchObject({ entry: '36', pendingOperator: 'add', expression: '100 +' })
    expect(press('=', { from: recalled }).state.entry).toBe('136')
  })

  it('H3 recalling an entry clears an error', () => {
    const errored = press('12*3=10/0=').state
    const id = errored.history[0]!.id
    expect(calculatorReducer(errored, { type: 'recallHistoryEntry', id })).toMatchObject({ error: null, entry: '36' })
  })

  it('H3 ignores an unknown id', () => {
    const state = press('12*3=').state
    expect(calculatorReducer(state, { type: 'recallHistoryEntry', id: 999 })).toBe(state)
  })

  it('H4 clears history', () => {
    const state = calculatorReducer(press('12*3=').state, { type: 'clearHistory' })
    expect(state.history).toEqual([])
    expect(state.entry).toBe('36')
  })

  it('H5 failed calculations are not recorded', () => {
    expect(press('10/0=').state.history).toEqual([])
  })
})
