import { useState } from 'react'
import { NEWS_SOURCES } from '../../data/news'
import { cx } from '../../utils/helpers'
import { NewsCard } from './NewsCard'
import styles from './NewsRollingBand.module.css'

function getTargetUrl(item) {
  if (item?.url && /^https?:\/\//i.test(item.url)) {
    return item.url
  }
  if (item?.sourceUrl && /^https?:\/\//i.test(item.sourceUrl)) {
    return item.sourceUrl
  }
  return /chess\.com/i.test(item?.source || item?.category || '')
    ? NEWS_SOURCES.chesscom.url
    : NEWS_SOURCES.chessbase.url
}

function truncateQuote(text = '', maxLength = 110) {
  const clean = String(text).trim()
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength).replace(/\s+\S*$/, '')}…`
}

export function NewsRollingBand({ items = [], variant = 'ticker', onRefresh, loading = false }) {
  const [paused, setPaused] = useState(false)

  if (!items || items.length === 0) {
    return null
  }

  // Duplicate items for seamless infinite horizontal rolling
  const loopItems = [...items, ...items]

  if (variant === 'cards') {
    return (
      <div className={styles.cardsBandWrapper}>
        <div className={styles.cardsToolbar}>
          <div className={styles.sourcesBar}>
            <span className={styles.sourcesLabel}>Sources:</span>
            <a
              href={NEWS_SOURCES.chessbase.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(styles.sourceChip, styles.sourceChipChessBase)}
            >
              ChessBase (en.chessbase.com) ↗
            </a>
            <a
              href={NEWS_SOURCES.chesscom.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(styles.sourceChip, styles.sourceChipChessCom)}
            >
              Chess.com News (chess.com/news) ↗
            </a>
          </div>
          <div className={styles.controlsBar}>
            {onRefresh && (
              <button
                type="button"
                className={styles.controlBtn}
                onClick={onRefresh}
                disabled={loading}
              >
                {loading ? 'Updating…' : '↻ Refresh latest'}
              </button>
            )}
            <button
              type="button"
              className={styles.controlBtn}
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
            >
              {paused ? '▶ Resume roll' : '⏸ Pause roll'}
            </button>
          </div>
        </div>

        <div
          className={styles.cardsViewport}
          aria-label="Rolling latest chess news cards"
        >
          <div
            className={cx(
              styles.cardsTrack,
              paused && styles.trackPaused,
            )}
          >
            {loopItems.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className={styles.cardSlide}>
                <NewsCard item={item} featured={idx % items.length === 0} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={styles.tickerBand}
      role="region"
      aria-label="Live rolling chess news ticker"
    >
      <div className={styles.tickerBadgeGroup}>
        <span className={styles.liveDot} aria-hidden="true" />
        <span className={styles.tickerLabel}>LATEST NEWS</span>
        <div className={styles.tickerSources}>
          <a
            href={NEWS_SOURCES.chessbase.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.tickerSourceLink}
            title="Visit ChessBase News"
          >
            ChessBase
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={NEWS_SOURCES.chesscom.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.tickerSourceLink}
            title="Visit Chess.com News"
          >
            Chess.com
          </a>
        </div>
      </div>

      <div className={styles.tickerViewport}>
        <div className={cx(styles.tickerTrack, paused && styles.trackPaused)}>
          {loopItems.map((item, index) => {
            const url = getTargetUrl(item)
            const isChessCom = item.source === 'Chess.com'
            return (
              <a
                key={`${item.id}-ticker-${index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.tickerItem}
                title={`Click to read on ${item.source}: ${item.title}`}
              >
                <span
                  className={cx(
                    styles.tickerSourceTag,
                    isChessCom ? styles.tagChessCom : styles.tagChessBase,
                  )}
                >
                  {item.source}
                </span>
                <strong className={styles.tickerHeadline}>{item.title}</strong>
                {item.summary && (
                  <span className={styles.tickerQuote}>
                    — “{truncateQuote(item.summary, 95)}”
                  </span>
                )}
                <span className={styles.tickerArrow} aria-hidden="true">
                  ↗
                </span>
              </a>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        className={styles.tickerToggle}
        onClick={() => setPaused((prev) => !prev)}
        aria-label={paused ? 'Resume news ticker' : 'Pause news ticker'}
        title={paused ? 'Resume rolling band' : 'Pause rolling band'}
      >
        {paused ? '▶' : '⏸'}
      </button>
    </div>
  )
}
