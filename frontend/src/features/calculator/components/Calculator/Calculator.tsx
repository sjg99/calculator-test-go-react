import type { CalculatorApi } from '../../../../api/calculatorApi'
import { Panel } from '../../../../shared/components/Panel/Panel'
import { formatEntry } from '../../../../shared/lib/formatNumber'
import { errorMessage } from '../../errorMessages'
import { useCalculator } from '../../hooks/useCalculator'
import { Display } from '../Display/Display'
import { Keypad } from '../Keypad/Keypad'
import styles from './Calculator.module.css'

export interface CalculatorProps {
  /** Overrides the API client, e.g. in tests. */
  api?: CalculatorApi
}

export function Calculator({ api }: CalculatorProps) {
  const { state, actions, isBusy } = useCalculator(api)

  return (
    <Panel className={styles.calculator} aria-label="Calculator">
      <Display
        expression={state.expression}
        value={formatEntry(state.entry)}
        error={state.error === null ? null : errorMessage(state.error)}
        busy={isBusy}
      />
      <Keypad
        actions={actions}
        activeOperator={state.awaitingOperand ? state.pendingOperator : null}
        busy={isBusy}
      />
    </Panel>
  )
}
