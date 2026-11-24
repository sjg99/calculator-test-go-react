import { useId } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { Panel } from '../../../../shared/components/Panel/Panel'
import { cx } from '../../../../shared/lib/classNames'
import { formatNumber } from '../../../../shared/lib/formatNumber'
import type { HistoryEntry } from '../../state/types'
import styles from './HistoryPanel.module.css'

export interface HistoryPanelProps {
  entries: HistoryEntry[]
  onSelect: (id: number) => void
  onClear: () => void
  id?: string
  className?: string
}

/** Past calculations, newest first. Selecting one reuses its result. */
export function HistoryPanel({ entries, onSelect, onClear, id, className }: HistoryPanelProps) {
  const headingId = useId()

  return (
    <Panel id={id} className={cx(styles.panel, className)} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          History
        </h2>
        <Button variant="ghost" onClick={onClear} disabled={entries.length === 0}>
          Clear
        </Button>
      </header>

      {entries.length === 0 ? (
        <p className={styles.empty}>No calculations yet</p>
      ) : (
        <ol className={styles.list}>
          {entries.map((entry) => {
            const result = formatNumber(entry.result)
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => onSelect(entry.id)}
                  aria-label={`${entry.expression} = ${result}. Use this result`}
                >
                  <span className={styles.expression}>{entry.expression}</span>
                  <span className={styles.result}>= {result}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
