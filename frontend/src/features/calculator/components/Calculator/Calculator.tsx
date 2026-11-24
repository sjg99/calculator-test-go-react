import { useCallback, useEffect, useId, useState } from 'react'
import type { CalculatorApi } from '../../../../api/calculatorApi'
import { Button } from '../../../../shared/components/Button/Button'
import { Panel } from '../../../../shared/components/Panel/Panel'
import { cx } from '../../../../shared/lib/classNames'
import { formatEntry } from '../../../../shared/lib/formatNumber'
import { errorMessage } from '../../errorMessages'
import { useCalculator } from '../../hooks/useCalculator'
import { useKeyboard } from '../../hooks/useKeyboard'
import { Display } from '../Display/Display'
import { HistoryPanel } from '../HistoryPanel/HistoryPanel'
import { KEYBOARD_MAP, KEYS_BY_ID } from '../Keypad/keys'
import { Keypad } from '../Keypad/Keypad'
import styles from './Calculator.module.css'

/** How long a key flashes after its physical key is pressed. */
const FLASH_MS = 120

export interface CalculatorProps {
  /** Overrides the API client, e.g. in tests. */
  api?: CalculatorApi
}

export function Calculator({ api }: CalculatorProps) {
  const { state, actions, isBusy } = useCalculator(api)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const historyId = useId()

  const pressKey = useCallback(
    (id: string) => {
      KEYS_BY_ID.get(id)?.press(actions)
      setFlashKey(id)
    },
    [actions],
  )
  useKeyboard(KEYBOARD_MAP, pressKey)

  useEffect(() => {
    if (flashKey === null) return
    const timer = setTimeout(() => setFlashKey(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flashKey])

  return (
    <div className={styles.layout}>
      <Panel className={styles.calculator} aria-label="Calculator">
        <div className={styles.toolbar}>
          <Button
            variant="ghost"
            aria-expanded={historyOpen}
            aria-controls={historyId}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            {historyOpen ? 'Hide history' : `History (${state.history.length})`}
          </Button>
        </div>
        <Display
          expression={state.expression}
          value={formatEntry(state.entry)}
          error={state.error === null ? null : errorMessage(state.error)}
          busy={isBusy}
        />
        <Keypad
          actions={actions}
          activeOperator={state.awaitingOperand ? state.pendingOperator : null}
          flashKey={flashKey}
          busy={isBusy}
        />
      </Panel>

      <HistoryPanel
        id={historyId}
        className={cx(styles.history, historyOpen && styles.historyOpen)}
        entries={state.history}
        onSelect={actions.recallHistoryEntry}
        onClear={actions.clearHistory}
      />
    </div>
  )
}
