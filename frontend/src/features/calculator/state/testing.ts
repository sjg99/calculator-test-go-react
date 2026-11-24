// Test helpers for driving the calculator reducer with key sequences.
import type { CalculationRequest } from '../../../api/types'
import { calculatorReducer, initialState } from './calculatorReducer'
import type { CalculatorAction, CalculatorState, Digit } from './types'

const KEY_ACTIONS: Record<string, CalculatorAction> = {
  '.': { type: 'decimal' },
  '+': { type: 'operator', operator: 'add' },
  '-': { type: 'operator', operator: 'subtract' },
  '*': { type: 'operator', operator: 'multiply' },
  '/': { type: 'operator', operator: 'divide' },
  '^': { type: 'operator', operator: 'power' },
  '=': { type: 'equals' },
  r: { type: 'sqrt' },
  '%': { type: 'percent' },
  n: { type: 'toggleSign' },
  '<': { type: 'backspace' },
  c: { type: 'clear' },
}

export function keyAction(key: string): CalculatorAction {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key as Digit }
  const action = KEY_ACTIONS[key]
  if (!action) throw new Error(`unknown test key ${JSON.stringify(key)}`)
  return action
}

type ServerReply = { result: number } | { error: string }

/** A stand-in for the backend, good enough to exercise the state machine. */
export function fakeServer({ operation, operands }: CalculationRequest): ServerReply {
  const [a = 0, b] = operands
  switch (operation) {
    case 'add':
      return { result: a + (b ?? 0) }
    case 'subtract':
      return { result: a - (b ?? 0) }
    case 'multiply':
      return { result: a * (b ?? 0) }
    case 'divide':
      return b === 0 ? { error: 'division_by_zero' } : { result: a / (b ?? 1) }
    case 'power':
      return { result: a ** (b ?? 1) }
    case 'sqrt':
      return a < 0 ? { error: 'negative_square_root' } : { result: Math.sqrt(a) }
    case 'percent':
      return { result: b === undefined ? a / 100 : (b * a) / 100 }
  }
}

export interface Simulation {
  state: CalculatorState
  requests: CalculationRequest[]
}

/**
 * Presses each key in turn. Whenever the reducer issues a request, the fake
 * server answers it immediately unless `respond` is false.
 */
export function press(
  keys: string,
  { from = initialState, respond = true }: { from?: CalculatorState; respond?: boolean } = {},
): Simulation {
  let state = from
  const requests: CalculationRequest[] = []
  for (const key of keys) {
    state = calculatorReducer(state, keyAction(key))
    const pending = state.pendingRequest
    if (respond && pending) {
      requests.push(pending.request)
      const reply = fakeServer(pending.request)
      state = calculatorReducer(
        state,
        'result' in reply
          ? { type: 'requestSucceeded', requestId: pending.id, result: reply.result }
          : { type: 'requestFailed', requestId: pending.id, error: reply.error },
      )
    }
  }
  return { state, requests }
}
