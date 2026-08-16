import { cx } from '../../utils/helpers'
import styles from './Button.module.css'

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], styles[size], className)}
      {...rest}
    >
      {children}
    </button>
  )
}
