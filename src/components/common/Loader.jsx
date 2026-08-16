import { cx } from '../../utils/helpers'
import styles from './Loader.module.css'

export function Loader({ label = 'Loading', full = false, className }) {
  return (
    <div
      className={cx(styles.wrap, full && styles.full, className)}
      role="status"
      aria-live="polite"
    >
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  )
}
