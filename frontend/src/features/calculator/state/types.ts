import type { BinaryOperation, CalculationRequest } from '../../../api/types'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** What the reducer does with a result when it arrives. */
export type RequestPurpose =
  /** `=`: show the result and finish the operation. */
  | { kind: 'equals' }
  /** A binary operator pressed after a full `a op b`: the result becomes the new left operand. */
  | { kind: 'chain'; nextOperator: BinaryOperation }
  /** √ or %: replace the entry, keep any pending operator. */
  | { kind: 'unary' }

export interface PendingRequest {
  id: number
  request: CalculationRequest
  purpose: RequestPurpose
  /** Readable form of the calculation, e.g. "12 × 3" or "10% of 200". */
  label: string
}

export interface HistoryEntry {
  id: number
  expression: string
  result: number
}

export interface CalculatorState {
  /** The number on the main display, as text, e.g. "12." while typing. */
  entry: string
  /** The next digit replaces the entry instead of appending to it. */
  overwrite: boolean
  /** A binary operator was just chosen and no right operand has been given yet. */
  awaitingOperand: boolean
  /** Left operand of the pending operator. */
  accumulator: number | null
  pendingOperator: BinaryOperation | null
  /** The small line above the entry, e.g. "12 ×" or "12 × 3 =". */
  expression: string
  /** Error code of the last failed calculation; the display shows its message. */
  error: string | null
  /** The calculation being sent to the backend. Never persisted. */
  pendingRequest: PendingRequest | null
  /** Most recent first. */
  history: HistoryEntry[]
  /** Last id handed out to a request; history entries reuse request ids. */
  sequence: number
}

export type CalculatorAction =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'backspace' }
  | { type: 'toggleSign' }
  | { type: 'clear' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'equals' }
  | { type: 'sqrt' }
  | { type: 'percent' }
  | { type: 'recallHistoryEntry'; id: number }
  | { type: 'clearHistory' }
  | { type: 'requestSucceeded'; requestId: number; result: number }
  | { type: 'requestFailed'; requestId: number; error: string }
