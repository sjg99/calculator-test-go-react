import type { PersistenceOptions } from '../../../shared/hooks/usePersistentReducer'
import { HISTORY_LIMIT, isBinaryOperation } from './operations'
import type { CalculatorState, HistoryEntry } from './types'

/** Bump the version when the stored shape changes; old data is then ignored. */
export const STORAGE_KEY = 'sezzle-calculator:v1'

type StoredState = Omit<CalculatorState, 'pendingRequest'>

/** Everything except the in-flight request, which cannot survive a reload (spec P2). */
export function serialize(state: CalculatorState): StoredState {
  return {
    entry: state.entry,
    overwrite: state.overwrite,
    awaitingOperand: state.awaitingOperand,
    accumulator: state.accumulator,
    pendingOperator: state.pendingOperator,
    expression: state.expression,
    error: state.error,
    history: state.history,
    sequence: state.sequence,
  }
}

/** Rebuilds state from stored data, or returns null if any field is invalid (spec P3). */
export function deserialize(stored: unknown): CalculatorState | null {
  if (!isRecord(stored)) return null
  const s = stored

  if (
    !isEntry(s.entry) ||
    typeof s.overwrite !== 'boolean' ||
    typeof s.awaitingOperand !== 'boolean' ||
    !(s.accumulator === null || isFiniteNumber(s.accumulator)) ||
    !(s.pendingOperator === null || isBinaryOperation(s.pendingOperator)) ||
    typeof s.expression !== 'string' ||
    !(s.error === null || typeof s.error === 'string') ||
    !Array.isArray(s.history) ||
    !s.history.every(isHistoryEntry) ||
    !(Number.isInteger(s.sequence) && (s.sequence as number) >= 0)
  ) {
    return null
  }

  const history = (s.history as HistoryEntry[]).slice(0, HISTORY_LIMIT)
  // Keep ids unique even if the stored sequence is behind the history.
  const sequence = Math.max(s.sequence as number, ...history.map((h) => h.id))

  return {
    entry: s.entry,
    overwrite: s.overwrite,
    awaitingOperand: s.awaitingOperand,
    accumulator: s.accumulator,
    pendingOperator: s.pendingOperator,
    expression: s.expression,
    error: s.error,
    history,
    sequence,
    pendingRequest: null,
  }
}

export const calculatorPersistence: PersistenceOptions<CalculatorState> = {
  key: STORAGE_KEY,
  serialize,
  deserialize,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Text the calculator could have produced: "-12.5", "0.", "1e+21". */
function isEntry(value: unknown): value is string {
  return typeof value === 'string' && /^-?\d+(\.\d*)?(e[+-]?\d+)?$/i.test(value)
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    isRecord(value) &&
    Number.isInteger(value.id) &&
    typeof value.expression === 'string' &&
    isFiniteNumber(value.result)
  )
}
