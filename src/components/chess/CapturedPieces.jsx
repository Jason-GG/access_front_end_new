import { PIECE_GLYPHS, PIECE_VALUES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import styles from './CapturedPieces.module.css'
import {
  BlackNormalFox,
  BlackRedEaredFox,
  WhiteNormalFox,
  WhiteRedEaredFox,
} from './pieces/FoxPieceIcons'

function sortByValue(pieces) {
  return [...pieces].sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a])
}

const INLINE_FOX_STYLE = {
  width: '1.05em',
  height: '1.05em',
  verticalAlign: 'middle',
  display: 'inline-block',
}

function renderCapturedGlyph(piece, tone) {
  const lower = String(piece || '').toLowerCase()
  const isBlackPiece = tone !== 'black'
  if (lower === 'rf') {
    return isBlackPiece ? (
      <BlackRedEaredFox svgStyle={INLINE_FOX_STYLE} />
    ) : (
      <WhiteRedEaredFox svgStyle={INLINE_FOX_STYLE} />
    )
  }
  if (lower === 'f') {
    return isBlackPiece ? (
      <BlackNormalFox svgStyle={INLINE_FOX_STYLE} />
    ) : (
      <WhiteNormalFox svgStyle={INLINE_FOX_STYLE} />
    )
  }
  return PIECE_GLYPHS[piece]
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
                {renderCapturedGlyph(piece, tone)}
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
