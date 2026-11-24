import type { BinaryOperation } from '../../../api/types'
import { formatNumber } from '../../../shared/lib/formatNumber'

/** Maximum number of digits in a typed entry (functional spec E5). */
export const MAX_ENTRY_DIGITS = 16

/** Maximum number of history entries kept (functional spec H2). */
export const HISTORY_LIMIT = 50

export const OPERATOR_SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
}

export const BINARY_OPERATIONS = Object.keys(OPERATOR_SYMBOLS) as BinaryOperation[]

export function isBinaryOperation(value: unknown): value is BinaryOperation {
  return typeof value === 'string' && (BINARY_OPERATIONS as string[]).includes(value)
}

/**
 * Operands for a percent request, following ADR 0007: after + or − the
 * percentage is taken of the left operand ("200 + 10%" → 10% of 200);
 * otherwise it is a plain value / 100.
 */
export function percentOperands(
  value: number,
  accumulator: number | null,
  pendingOperator: BinaryOperation | null,
): [number] | [number, number] {
  if (accumulator !== null && (pendingOperator === 'add' || pendingOperator === 'subtract')) {
    return [value, accumulator]
  }
  return [value]
}

export function pendingLabel(left: number, operator: BinaryOperation): string {
  return `${formatNumber(left)} ${OPERATOR_SYMBOLS[operator]}`
}

export function binaryLabel(left: number, operator: BinaryOperation, right: number): string {
  return `${pendingLabel(left, operator)} ${formatOperand(right)}`
}

export function sqrtLabel(value: number): string {
  return `√${formatOperand(value)}`
}

export function percentLabel(operands: [number] | [number, number]): string {
  const [value, base] = operands
  const percent = `${formatOperand(value)}%`
  return base === undefined ? percent : `${percent} of ${formatOperand(base)}`
}

/** Negative operands are wrapped in parentheses so "5 − -3" reads "5 − (-3)". */
function formatOperand(value: number): string {
  const text = formatNumber(value)
  return value < 0 ? `(${text})` : text
}

/** Counts the digits in an entry, ignoring sign and decimal point. */
export function countDigits(entry: string): number {
  return entry.replace(/[^0-9]/g, '').length
}
