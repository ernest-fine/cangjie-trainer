import type { ComponentProps } from 'react'
import styles from './Button.module.css'

/** `ComponentProps` includes `ref`, which React 19 passes as a normal prop. */
export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'secondary', className, type = 'button', ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
