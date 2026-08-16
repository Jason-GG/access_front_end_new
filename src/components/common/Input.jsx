import { cx } from '../../utils/helpers'
import styles from './Input.module.css'

export function Input({ label, id, error, hint, className, ...rest }) {
  return (
    <div className={cx(styles.field, className)}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={cx(styles.input, error && styles.inputError)}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
