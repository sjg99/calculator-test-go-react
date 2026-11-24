import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/classNames'
import styles from './Button.module.css'

export type ButtonVariant = 'digit' | 'function' | 'operator' | 'equals' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Highlights the button, e.g. the operator waiting for its right operand. */
  active?: boolean
}

export function Button({ variant = 'digit', active = false, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], active && styles.active, className)}
      {...props}
    />
  )
}
