import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/classNames'
import styles from './Panel.module.css'

/** A raised surface that groups related content. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx(styles.panel, className)} {...props} />
}
