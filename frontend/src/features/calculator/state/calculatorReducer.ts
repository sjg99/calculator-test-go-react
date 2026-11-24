import type { BinaryOperation, CalculationRequest } from '../../../api/types'
import { numberToEntry } from '../../../shared/lib/formatNumber'
import {
  binaryLabel,
  countDigits,
  HISTORY_LIMIT,
  MAX_ENTRY_DIGITS,
  pendingLabel,
  percentLabel,
  percentOperands,
  sqrtLabel,
} from './operations'
import type { CalculatorAction, CalculatorState, Digit, RequestPurpose } from './types'

export const initialState: CalculatorState = {
  entry: '0',
  overwrite: false,
  awaitingOperand: false,
  accumulator: null,
  pendingOperator: null,
  expression: '',
  error: null,
  pendingRequest: null,
  history: [],
  sequence: 0,
}

/**
 * The calculator state machine (functional spec §3). It is pure: arithmetic
 * is never done here. An arithmetic intent sets `pendingRequest`, and the
 * outcome arrives later as requestSucceeded or requestFailed.
 */
export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  // Actions that apply in every state.
  switch (action.type) {
    case 'requestSucceeded':
      return completeRequest(state, action.requestId, action.result)
    case 'requestFailed':
      return failRequest(state, action.requestId, action.error)
    case 'clear':
      // R4: AC resets everything but history, and cancels a request in flight.
      return reset(state)
    case 'clearHistory':
      return { ...state, history: [] }
  }

  // R6: input is ignored while a request is in flight.
  if (state.pendingRequest) return state

  // R2/R3: after an error, only starting a new number (or picking from history) works.
  if (state.error !== null) {
    switch (action.type) {
      case 'digit':
      case 'decimal':
      case 'recallHistoryEntry':
        return calculatorReducer({ ...reset(state), overwrite: true }, action)
      default:
        return state
    }
  }

  switch (action.type) {
    case 'digit':
      return inputDigit(state, action.digit)
    case 'decimal':
      return inputDecimal(state)
    case 'backspace':
      return backspace(state)
    case 'toggleSign':
      return toggleSign(state)
    case 'operator':
      return chooseOperator(state, action.operator)
    case 'equals':
      return equals(state)
    case 'sqrt': {
      const value = Number(state.entry)
      return startRequest(state, { operation: 'sqrt', operands: [value] }, { kind: 'unary' }, sqrtLabel(value))
    }
    case 'percent': {
      const operands = percentOperands(Number(state.entry), state.accumulator, state.pendingOperator)
      return startRequest(state, { operation: 'percent', operands }, { kind: 'unary' }, percentLabel(operands))
    }
    case 'recallHistoryEntry':
      return recallHistoryEntry(state, action.id)
  }
}

function reset(state: CalculatorState): CalculatorState {
  return { ...initialState, history: state.history, sequence: state.sequence }
}

/** State changes shared by every way of starting a new number. */
function startEntry(state: CalculatorState, entry: string): CalculatorState {
  return {
    ...state,
    entry,
    overwrite: false,
    awaitingOperand: false,
    // A fresh number with nothing pending starts a new calculation.
    expression: state.pendingOperator === null ? '' : state.expression,
  }
}

function inputDigit(state: CalculatorState, digit: Digit): CalculatorState {
  if (state.overwrite) return startEntry(state, digit) // E6
  if (countDigits(state.entry) >= MAX_ENTRY_DIGITS) return state // E5
  if (state.entry === '0') return { ...state, entry: digit } // E1
  if (state.entry === '-0') return { ...state, entry: `-${digit}` }
  return { ...state, entry: state.entry + digit } // E2
}

function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.overwrite) return startEntry(state, '0.') // E4
  if (state.entry.includes('.')) return state // E3
  return { ...state, entry: `${state.entry}.` }
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.overwrite) return state // E8
  const entry = state.entry.slice(0, -1)
  return { ...state, entry: entry === '' || entry === '-' ? '0' : entry } // E7
}

function toggleSign(state: CalculatorState): CalculatorState {
  if (state.entry === '0') return state // E9
  const entry = state.entry.startsWith('-') ? state.entry.slice(1) : `-${state.entry}`
  // The negated number is now the right operand, not a copy of the left one.
  return { ...state, entry, awaitingOperand: false }
}

function chooseOperator(state: CalculatorState, operator: BinaryOperation): CalculatorState {
  const { accumulator, pendingOperator } = state

  if (accumulator !== null && pendingOperator !== null) {
    if (state.awaitingOperand) {
      // B2: replace the operator; nothing to calculate yet.
      return { ...state, pendingOperator: operator, expression: pendingLabel(accumulator, operator) }
    }
    // B4: complete "a op b" first, then continue with the new operator.
    const right = Number(state.entry)
    return startRequest(
      state,
      { operation: pendingOperator, operands: [accumulator, right] },
      { kind: 'chain', nextOperator: operator },
      binaryLabel(accumulator, pendingOperator, right),
    )
  }

  // B1/B7: the entry (typed or a previous result) becomes the left operand.
  const left = Number(state.entry)
  return {
    ...state,
    accumulator: left,
    pendingOperator: operator,
    awaitingOperand: true,
    overwrite: true,
    expression: pendingLabel(left, operator),
  }
}

function equals(state: CalculatorState): CalculatorState {
  const { accumulator, pendingOperator } = state
  if (accumulator === null || pendingOperator === null) return state // B6

  // B3/B5: the entry is the right operand, even if it was not retyped.
  const right = Number(state.entry)
  return startRequest(
    state,
    { operation: pendingOperator, operands: [accumulator, right] },
    { kind: 'equals' },
    binaryLabel(accumulator, pendingOperator, right),
  )
}

function recallHistoryEntry(state: CalculatorState, id: number): CalculatorState {
  const item = state.history.find((h) => h.id === id)
  if (!item) return state
  // H3: the result becomes the entry, as if just computed; a pending operator is kept.
  return {
    ...state,
    entry: numberToEntry(item.result),
    overwrite: true,
    awaitingOperand: false,
    expression: state.pendingOperator === null ? '' : state.expression,
  }
}

function startRequest(
  state: CalculatorState,
  request: CalculationRequest,
  purpose: RequestPurpose,
  label: string,
): CalculatorState {
  const id = state.sequence + 1
  return { ...state, sequence: id, pendingRequest: { id, request, purpose, label } }
}

function completeRequest(state: CalculatorState, requestId: number, result: number): CalculatorState {
  const request = state.pendingRequest
  if (!request || request.id !== requestId) return state // stale or cancelled

  const entry = numberToEntry(result)
  const history = [{ id: request.id, expression: request.label, result }, ...state.history].slice(0, HISTORY_LIMIT)
  const next: CalculatorState = { ...state, pendingRequest: null, history, entry, overwrite: true }

  switch (request.purpose.kind) {
    case 'equals':
      return {
        ...next,
        awaitingOperand: false,
        accumulator: null,
        pendingOperator: null,
        expression: `${request.label} =`,
      }
    case 'chain': {
      const { nextOperator } = request.purpose
      return {
        ...next,
        awaitingOperand: true,
        accumulator: result,
        pendingOperator: nextOperator,
        expression: pendingLabel(result, nextOperator),
      }
    }
    case 'unary': {
      const { accumulator, pendingOperator } = state
      const expression =
        accumulator !== null && pendingOperator !== null
          ? `${pendingLabel(accumulator, pendingOperator)} ${request.label}`
          : `${request.label} =`
      return { ...next, awaitingOperand: false, expression }
    }
  }
}

function failRequest(state: CalculatorState, requestId: number, error: string): CalculatorState {
  const request = state.pendingRequest
  if (!request || request.id !== requestId) return state

  // R1: the failed calculation is abandoned; the expression shows what failed.
  return {
    ...reset(state),
    error,
    overwrite: true,
    expression: request.label,
  }
}
