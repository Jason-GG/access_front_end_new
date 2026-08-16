import { PIECE_GLYPHS, PIECE_VALUES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import styles from './CapturedPieces.module.css'

function sortByValue(pieces) {
  return [...pieces].sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a])
}

function CapturedRow({ label, glyphs, tone }) {
  const sorted = sortByValue(glyphs)
  return (
    <div className={styles.row}>
      <span className={cx(styles.label, 'notation')}>{label}</span>
      <span className={cx(styles.glyphs, tone === 'black' && styles.glyphsBlack)}>
        {sorted.length === 0
          ? '—'
          : sorted.map((piece, index) => (
              <span key={`${piece}-${index}`} aria-label={`${piece}`}>
                {PIECE_GLYPHS[piece]}
              </span>
            ))}
      </span>
    </div>
  )
}

export function CapturedPieces({ captured }) {
  return (
    <div className={styles.panel}>
      <p className={styles.title}>Captured pieces</p>
      <CapturedRow label="White holds" glyphs={captured.white} />
      <CapturedRow label="Black holds" glyphs={captured.black} tone="black" />
    </div>
  )
}
