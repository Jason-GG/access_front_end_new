import { useCallback, useEffect, useRef, useState } from 'react'
import { GAME } from '../../utils/constants'
import { cx, formatClock } from '../../utils/helpers'
import styles from './GameTimer.module.css'

const DEFAULT_CLOCK_MS = GAME.defaultTimeSeconds * 1000

function msToDisplaySeconds(ms) {
  if (ms <= 0) return 0
  if (ms < 1000) return 1
  return Math.floor(ms / 1000)
}

function Clock({ label, seconds, active }) {
  return (
    <div className={cx(styles.clock, active && styles.clockActive)}>
      <span className={styles.clockLabel}>{label}</span>
      <span className={cx(styles.clockTime, 'notation')}>{formatClock(seconds)}</span>
      {active && <span className={styles.dot} aria-hidden="true" />}
    </div>
  )
}

export function GameTimer({
  turn,
  running,
  resetKey,
  times,
  whiteLabel = 'White',
  blackLabel = 'Black',
  onTimeout,
}) {
  const controlled = Boolean(times && typeof times.white === 'number')

  const clocksRef = useRef({
    white: DEFAULT_CLOCK_MS,
    black: DEFAULT_CLOCK_MS,
    activeTurn: turn || 'w',
    lastTickAt: null,
    timedOut: false,
  })
  const [uncontrolledClocks, setUncontrolledClocks] = useState({
    white: DEFAULT_CLOCK_MS,
    black: DEFAULT_CLOCK_MS,
  })
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout
  const latestTurnRef = useRef(turn || 'w')
  latestTurnRef.current = turn || 'w'
  const latestRunningRef = useRef(Boolean(running))
  latestRunningRef.current = Boolean(running)

  const flushElapsed = useCallback((now = Date.now(), nextTurn) => {
    const state = clocksRef.current
    if (state.lastTickAt != null && !state.timedOut) {
      const elapsed = Math.max(0, now - state.lastTickAt)
      if (elapsed > 0) {
        if (state.activeTurn === 'w') {
          state.white = Math.max(0, state.white - elapsed)
        } else {
          state.black = Math.max(0, state.black - elapsed)
        }
      }
      state.lastTickAt = now
    }
    if (nextTurn) {
      state.activeTurn = nextTurn
    }
    setUncontrolledClocks({ white: state.white, black: state.black })

    if (!state.timedOut && (state.white <= 0 || state.black <= 0)) {
      state.timedOut = true
      state.lastTickAt = null
      const loser = state.white <= 0 ? 'w' : 'b'
      onTimeoutRef.current?.(loser)
    }
  }, [])

  useEffect(() => {
    if (controlled) return
    clocksRef.current = {
      white: DEFAULT_CLOCK_MS,
      black: DEFAULT_CLOCK_MS,
      activeTurn: latestTurnRef.current,
      lastTickAt: latestRunningRef.current ? Date.now() : null,
      timedOut: false,
    }
    setUncontrolledClocks({ white: DEFAULT_CLOCK_MS, black: DEFAULT_CLOCK_MS })
  }, [resetKey, controlled])

  // Flush exact elapsed milliseconds for the previous side whenever the active turn flips
  useEffect(() => {
    if (controlled) return
    const nextTurn = turn || 'w'
    if (clocksRef.current.activeTurn !== nextTurn) {
      flushElapsed(Date.now(), nextTurn)
    }
  }, [turn, controlled, flushElapsed])

  useEffect(() => {
    if (controlled) return undefined
    if (!running) {
      flushElapsed(Date.now())
      clocksRef.current.lastTickAt = null
      return undefined
    }

    if (clocksRef.current.lastTickAt == null && !clocksRef.current.timedOut) {
      clocksRef.current.lastTickAt = Date.now()
    }
    clocksRef.current.activeTurn = turn || 'w'

    const id = setInterval(() => {
      flushElapsed(Date.now())
    }, 100)

    return () => clearInterval(id)
  }, [controlled, running, turn, resetKey, flushElapsed])

  const whiteMs = controlled ? Math.max(0, times.white) : uncontrolledClocks.white
  const blackMs = controlled ? Math.max(0, times.black) : uncontrolledClocks.black
  const whiteSeconds = msToDisplaySeconds(whiteMs)
  const blackSeconds = msToDisplaySeconds(blackMs)

  return (
    <div className={styles.panel}>
      <Clock label={whiteLabel} seconds={whiteSeconds} active={running && turn === 'w'} />
      <Clock label={blackLabel} seconds={blackSeconds} active={running && turn === 'b'} />
    </div>
  )
}
