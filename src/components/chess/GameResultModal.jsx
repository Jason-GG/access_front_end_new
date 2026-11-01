import { useEffect, useState } from 'react'
import { Button } from '../common/Button'
import styles from './GameResultModal.module.css'

const CONFETTI_PIECES = Array.from({ length: 24 }, (_, idx) => ({
  id: idx,
  left: `${(idx * 17 + 7) % 96}%`,
  delay: `${(idx % 8) * 0.14}s`,
  duration: `${2.2 + (idx % 5) * 0.35}s`,
  variant: idx % 3,
}))

function resolveGameOutcome({ isGameOver, winner, mySeat, mode }) {
  if (!isGameOver) return null

  const normalizedWinner =
    winner === 'w' || winner === 'white'
      ? 'w'
      : winner === 'b' || winner === 'black'
        ? 'b'
        : null

  if (!normalizedWinner) {
    return {
      outcome: 'draw',
      badge: 'Match Drawn',
      headline: 'DRAW',
      subheadline: 'Neither side yielded — an evenly matched battle.',
    }
  }

  const winnerName = normalizedWinner === 'w' ? 'White' : 'Black'

  if (mySeat === 'white' || mySeat === 'black') {
    const myColor = mySeat === 'white' ? 'w' : 'b'
    const didWin = normalizedWinner === myColor
    return didWin
      ? {
          outcome: 'victory',
          badge: `${winnerName} Triumphs`,
          headline: 'VICTORY!',
          subheadline: 'Brilliant tactics! You conquered the board.',
        }
      : {
          outcome: 'defeat',
          badge: `${winnerName} Wins`,
          headline: 'DEFEAT',
          subheadline: 'A tough battle — review the board and strike back next match.',
        }
  }

  if (mode === 'computer') {
    const didWin = normalizedWinner === 'w'
    return didWin
      ? {
          outcome: 'victory',
          badge: 'You Beat the AI',
          headline: 'VICTORY!',
          subheadline: 'Impressive play! You outsmarted the computer.',
        }
      : {
          outcome: 'defeat',
          badge: 'Computer Wins',
          headline: 'DEFEAT',
          subheadline: 'The AI prevailed this time. Try another strategy!',
        }
  }

  return {
    outcome: 'victory',
    badge: 'Decisive Finish',
    headline: `${winnerName.toUpperCase()} WINS!`,
    subheadline: `${winnerName} takes the victory.`,
  }
}

export function GameResultModal({
  open,
  winner,
  mySeat,
  mode,
  statusLabel,
  whiteName,
  blackName,
  scoreDelta,
  currentScore,
  primaryActionLabel = 'Back to lobby',
  onPrimaryAction,
  secondaryActionLabel = 'Inspect board',
  onClose,
}) {
  const [dismissedKey, setDismissedKey] = useState(null)
  const outcomeKey = open ? `${winner || 'none'}-${statusLabel || ''}-${mySeat || ''}` : null

  useEffect(() => {
    if (!open) {
      setDismissedKey(null)
    }
  }, [open])

  if (!open || (outcomeKey && dismissedKey === outcomeKey)) return null

  const resolved = resolveGameOutcome({
    isGameOver: open,
    winner,
    mySeat,
    mode,
  })
  if (!resolved) return null

  const { outcome, badge, headline, subheadline } = resolved
  const isScoredMode =
    (mode === 'online' && (mySeat === 'white' || mySeat === 'black')) ||
    mode === 'computer'
  const effectiveDelta =
    typeof scoreDelta === 'number'
      ? scoreDelta
      : isScoredMode
        ? outcome === 'victory'
          ? 5
          : outcome === 'defeat'
            ? -5
            : 0
        : null

  function handleDismiss() {
    setDismissedKey(outcomeKey)
    if (onClose) onClose()
  }

  return (
    <div className={styles.overlay} onMouseDown={handleDismiss} role="presentation">
      <div
        className={`${styles.dialog} ${styles[outcome]}`}
        role="dialog"
        aria-modal="true"
        aria-label={headline}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {outcome === 'victory' && (
          <div className={styles.confettiContainer} aria-hidden="true">
            {CONFETTI_PIECES.map((piece) => (
              <span
                key={piece.id}
                className={`${styles.confetti} ${styles[`confettiVar${piece.variant}`]}`}
                style={{
                  left: piece.left,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                }}
              />
            ))}
          </div>
        )}

        {outcome === 'defeat' && (
          <div className={styles.defeatPulse} aria-hidden="true" />
        )}

        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleDismiss}
          aria-label="Close result dialog"
        >
          ×
        </button>

        <div className={styles.emblemWrap} aria-hidden="true">
          <div className={styles.emblemRing} />
          <div className={styles.emblemIcon}>
            {outcome === 'victory' && (
              <svg viewBox="0 0 64 64" className={styles.svgIcon}>
                <path
                  d="M16 12h32v10c0 10.5-6.8 19.2-16 21.5C22.8 41.2 16 32.5 16 22V12z"
                  fill="currentColor"
                />
                <path
                  d="M16 16H8v6c0 6.6 3.8 11.4 9.5 12.6M48 16h8v6c0 6.6-3.8 11.4-9.5 12.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M28 43h8v9h-8zM20 52h24v4H20z"
                  fill="currentColor"
                />
              </svg>
            )}
            {outcome === 'defeat' && (
              <svg viewBox="0 0 64 64" className={styles.svgIcon}>
                <path
                  d="M32 10v8M28 14h8"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M22 22h20l-3 18H25l-3-18z"
                  fill="currentColor"
                />
                <path
                  d="M18 46h28l3 6H15l3-6z"
                  fill="currentColor"
                />
                <path
                  d="M14 18l36 32"
                  stroke="#ef4444"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {outcome === 'draw' && (
              <svg viewBox="0 0 64 64" className={styles.svgIcon}>
                <path
                  d="M32 12v36M16 24h32M22 48h20"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M16 24l-6 12h12l-6-12zM48 24l-6 12h12l-6-12z"
                  fill="currentColor"
                />
              </svg>
            )}
          </div>
        </div>

        <span className={styles.badge}>{badge}</span>
        <h2 className={styles.headline}>{headline}</h2>
        <p className={styles.reason}>{statusLabel || 'Game over'}</p>
        <p className={styles.subheadline}>{subheadline}</p>

        {effectiveDelta !== null && (
          <div
            className={`${styles.scoreBanner} ${
              effectiveDelta > 0
                ? styles.scoreGain
                : effectiveDelta < 0
                  ? styles.scoreLoss
                  : styles.scoreNeutral
            }`}
          >
            <span className={styles.scoreDeltaText}>
              {effectiveDelta > 0
                ? `+${effectiveDelta} Score`
                : effectiveDelta < 0
                  ? `${effectiveDelta} Score`
                  : '0 Score Change'}
            </span>
            {typeof currentScore === 'number' && (
              <span className={styles.scoreTotalText}>Total Score: ★ {currentScore} pts</span>
            )}
          </div>
        )}

        {typeof currentScore === 'number' && currentScore <= 0 && (
          <p className={styles.zeroScoreNotice}>
            You have 0 score remaining! Play against the Computer (+5 pts per win) to recover points before competing with normal users.
          </p>
        )}

        {(whiteName || blackName) && (
          <div className={styles.matchup}>
            <span className={styles.playerTag}>
              <span className={styles.dotWhite} /> {whiteName || 'White'}
            </span>
            <span className={styles.vs}>vs</span>
            <span className={styles.playerTag}>
              <span className={styles.dotBlack} /> {blackName || 'Black'}
            </span>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleDismiss}>
            {secondaryActionLabel}
          </Button>
          {onPrimaryAction && (
            <Button onClick={onPrimaryAction}>
              {primaryActionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
