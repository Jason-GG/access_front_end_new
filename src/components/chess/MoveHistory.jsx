import { getMovePairings } from '../../services/chessService'
import { cx } from '../../utils/helpers'
import styles from './MoveHistory.module.css'

function isHot(san) {
  return Boolean(san && (san.endsWith('#') || san.endsWith('+')))
}

export function MoveHistory({ history, status }) {
  const pairs = getMovePairings(history)

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span>#</span>
        <span>White</span>
        <span>Black</span>
      </div>

      {pairs.length === 0 ? (
        <p className={styles.empty}>No moves yet — White to play.</p>
      ) : (
        <ol className={styles.list}>
          {pairs.map(([white, black], index) => (
            <li key={index} className={styles.row}>
              <span className={styles.num}>{index + 1}.</span>
              <span className={cx(styles.move, isHot(white) && styles.hot)}>{white}</span>
              <span className={cx(styles.move, isHot(black) && styles.hot)}>
                {black || '—'}
              </span>
            </li>
          ))}
        </ol>
      )}

      {status.kind !== 'playing' && (
        <p className={cx(styles.result, status.kind === 'check' && styles.check)}>
          {status.label}
        </p>
      )}
    </div>
  )
}
