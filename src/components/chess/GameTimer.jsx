import { useEffect, useState } from 'react'
import { GAME } from '../../utils/constants'
import { cx, formatClock } from '../../utils/helpers'
import styles from './GameTimer.module.css'

function Clock({ label, seconds, active }) {
  return (
    <div className={cx(styles.clock, active && styles.clockActive)}>
      <span className={styles.clockLabel}>{label}</span>
      <span className={cx(styles.clockTime, 'notation')}>{formatClock(seconds)}</span>
      {active && <span className={styles.dot} aria-hidden="true" />}
    </div>
  )
}

export function GameTimer({ turn, running, resetKey }) {
  const [white, setWhite] = useState(GAME.defaultTimeSeconds)
  const [black, setBlack] = useState(GAME.defaultTimeSeconds)

  useEffect(() => {
    setWhite(GAME.defaultTimeSeconds)
    setBlack(GAME.defaultTimeSeconds)
  }, [resetKey])

  useEffect(() => {
    if (!running) return undefined

    const id = setInterval(() => {
      if (turn === 'w') {
        setWhite((seconds) => Math.max(0, seconds - 1))
      } else {
        setBlack((seconds) => Math.max(0, seconds - 1))
      }
    }, 1000)

    return () => clearInterval(id)
  }, [running, turn, resetKey])

  return (
    <div className={styles.panel}>
      <Clock label="White" seconds={white} active={running && turn === 'w'} />
      <Clock label="Black" seconds={black} active={running && turn === 'b'} />
    </div>
  )
}
