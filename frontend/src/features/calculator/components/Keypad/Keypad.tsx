import type { BinaryOperation } from '../../../../api/types'
import { Button } from '../../../../shared/components/Button/Button'
import type { CalculatorActions } from '../../hooks/useCalculator'
import { KEYS } from './keys'
import styles from './Keypad.module.css'

export interface KeypadProps {
  actions: CalculatorActions
  /** The operator waiting for its right operand, highlighted on the keypad. */
  activeOperator?: BinaryOperation | null
  /** A calculation is in flight; key presses are ignored meanwhile. */
  busy?: boolean
}

export function Keypad({ actions, activeOperator = null, busy = false }: KeypadProps) {
  return (
    <div className={styles.keypad} role="group" aria-label="Keypad" aria-busy={busy}>
      {KEYS.map((key) => {
        const isOperator = key.operator !== undefined
        return (
          <Button
            key={key.id}
            variant={key.variant}
            active={isOperator && key.operator === activeOperator}
            aria-pressed={isOperator ? key.operator === activeOperator : undefined}
            aria-label={key.name}
            style={{ gridArea: key.id }}
            onClick={() => key.press(actions)}
          >
            {key.label}
          </Button>
        )
      })}
    </div>
  )
}
