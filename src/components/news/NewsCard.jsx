import { cx } from '../../utils/helpers'
import styles from './NewsCard.module.css'

export function NewsCard({ item, featured = false }) {
  const targetUrl =
    item.url ||
    item.sourceUrl ||
    (/chess\.com/i.test(item.source || item.category || '')
      ? 'https://www.chess.com/news'
      : 'https://en.chessbase.com/')

  const sourceLabel = item.source || (/chess\.com/i.test(targetUrl) ? 'Chess.com' : 'ChessBase')

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.cardLink}
      aria-label={`${item.title} — Open on ${sourceLabel}`}
    >
      <article className={cx(styles.card, featured && styles.cardFeatured)}>
        <div className={styles.topRow}>
          <span
            className={cx(
              styles.category,
              sourceLabel === 'Chess.com' ? styles.categoryChessCom : styles.categoryChessBase,
            )}
          >
            {item.category || sourceLabel}
          </span>
          <span className={styles.externalBadge} aria-hidden="true">
            {sourceLabel} ↗
          </span>
        </div>
        <h3 className={styles.title}>{item.title}</h3>
        <div className={styles.rule} aria-hidden="true" />
        <p className={styles.summary}>“{item.summary}”</p>
        <footer className={cx(styles.meta, 'notation')}>
          <span>{item.date}</span>
          <span>{item.author || sourceLabel}</span>
        </footer>
      </article>
    </a>
  )
}
