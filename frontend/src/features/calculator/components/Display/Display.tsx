import { cx } from '../../../../shared/lib/classNames'
import styles from './Display.module.css'

export interface DisplayProps {
  /** The small line above the value, e.g. "12 × 3 =". */
  expression: string
  /** The formatted number to show. */
  value: string
  /** When set, shown instead of the value. */
  error?: string | null
  busy?: boolean
}

/** Shrinks long numbers so they fit on one line. */
function sizeFor(text: string): 'lg' | 'md' | 'sm' {
  if (text.length <= 9) return 'lg'
  if (text.length <= 14) return 'md'
  return 'sm'
}

export function Display({ expression, value, error = null, busy = false }: DisplayProps) {
  const text = error ?? value
  return (
    <div className={styles.display}>
      <div className={styles.expression} data-testid="expression">
        {expression}
      </div>
      <output
        className={cx(styles.value, error !== null && styles.error)}
        data-size={error === null ? sizeFor(text) : undefined}
        aria-live="polite"
        aria-busy={busy}
      >
        {text}
      </output>
      <span className={cx(styles.progress, busy && styles.progressVisible)} aria-hidden="true" />
    </div>
  )
}
