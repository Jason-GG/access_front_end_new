import { getMovePairings } from '../../services/chessService'
import { cx } from '../../utils/helpers'
import styles from './MoveHistory.module.css'

function isHot(san) {
  return Boolean(san && (san.endsWith('#') || san.endsWith('+')))
}

function sanOf(move) {
  if (!move) return null
  if (typeof move === 'string') return move
  return move.san || move.move || null
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
              <span className={cx(styles.move, isHot(sanOf(white)) && styles.hot)}>{sanOf(white)}</span>
              <span className={cx(styles.move, isHot(sanOf(black)) && styles.hot)}>
                {sanOf(black) || '—'}
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
