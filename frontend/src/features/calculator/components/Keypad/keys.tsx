import type { ReactNode } from 'react'
import type { BinaryOperation } from '../../../../api/types'
import type { ButtonVariant } from '../../../../shared/components/Button/Button'
import type { CalculatorActions } from '../../hooks/useCalculator'
import { OPERATOR_SYMBOLS } from '../../state/operations'
import type { Digit } from '../../state/types'

export interface KeyDefinition {
  /** Unique id; also the CSS grid area the key is placed in. */
  id: string
  label: ReactNode
  /** Accessible name, read by screen readers. */
  name: string
  variant: ButtonVariant
  press: (actions: CalculatorActions) => void
  /** Set for binary operator keys, so the active one can be highlighted. */
  operator?: BinaryOperation
}

const digit = (d: Digit): KeyDefinition => ({
  id: `d${d}`,
  label: d,
  name: d,
  variant: 'digit',
  press: (a) => a.inputDigit(d),
})

const operator = (op: BinaryOperation, name: string, label: ReactNode = OPERATOR_SYMBOLS[op]): KeyDefinition => ({
  id: op,
  label,
  name,
  variant: 'operator',
  operator: op,
  press: (a) => a.chooseOperator(op),
})

/** Keys in reading order. Their placement is defined in Keypad.module.css. */
export const KEYS: KeyDefinition[] = [
  { id: 'clear', label: 'AC', name: 'All clear', variant: 'function', press: (a) => a.clear() },
  { id: 'backspace', label: '⌫', name: 'Backspace', variant: 'function', press: (a) => a.backspace() },
  { id: 'sign', label: '±', name: 'Toggle sign', variant: 'function', press: (a) => a.toggleSign() },
  operator('divide', 'Divide'),

  { id: 'sqrt', label: '√', name: 'Square root', variant: 'function', press: (a) => a.squareRoot() },
  operator(
    'power',
    'Power',
    <span>
      x<sup>y</sup>
    </span>,
  ),
  { id: 'percent', label: '%', name: 'Percent', variant: 'function', press: (a) => a.percent() },
  operator('multiply', 'Multiply'),

  digit('7'),
  digit('8'),
  digit('9'),
  operator('subtract', 'Subtract'),

  digit('4'),
  digit('5'),
  digit('6'),
  operator('add', 'Add'),

  digit('1'),
  digit('2'),
  digit('3'),
  { id: 'equals', label: '=', name: 'Equals', variant: 'equals', press: (a) => a.equals() },

  digit('0'),
  { id: 'decimal', label: '.', name: 'Decimal point', variant: 'digit', press: (a) => a.inputDecimal() },
]
