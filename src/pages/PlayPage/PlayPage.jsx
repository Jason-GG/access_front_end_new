import { useContext, useState } from 'react'
import { CapturedPieces } from '../../components/chess/CapturedPieces'
import { ChessBoard } from '../../components/chess/ChessBoard'
import { GameTimer } from '../../components/chess/GameTimer'
import { MoveHistory } from '../../components/chess/MoveHistory'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { GameContext } from '../../context/gameContext'
import { useAuth } from '../../hooks/useAuth'
import { useChessGame } from '../../hooks/useChessGame'
import { cx } from '../../utils/helpers'
import styles from './PlayPage.module.css'

export function PlayPage() {
  const { user } = useAuth()
  const { playMode, setPlayMode, orientation, setOrientation, newGameKey, startNewGame } =
    useContext(GameContext)

  const game = useChessGame({ playMode, orientation, resetKey: newGameKey })
  const [showRules, setShowRules] = useState(false)

  const gameOver = game.status.kind === 'checkmate' || game.status.kind === 'draw'
  const botThinking = playMode === 'bot' && game.turn !== orientation[0] && !gameOver

  const canDragPiece = (pieceType) => {
    if (game.status.kind !== 'playing') return false
    if (playMode === 'bot' && pieceType[0] !== orientation[0]) return false
    return pieceType[0] === game.turn
  }

  function switchMode(mode) {
    if (mode === playMode) return
    setPlayMode(mode)
    startNewGame()
  }

  function switchOrientation(side) {
    if (side === orientation) return
    setOrientation(side)
    startNewGame()
  }

  return (
    <>
      <section className={styles.page}>
        <div className="container">
          <header className={styles.header}>
            <div>
              <p className="eyebrow">The play room</p>
              <h1 className={styles.title}>Play</h1>
            </div>
            <p className={cx(styles.statusLine, 'notation')}>
              {gameOver
                ? game.status.label
                : botThinking
                  ? 'Opponent is thinking…'
                  : game.status.kind === 'check'
                    ? 'Check — the king must answer'
                    : user
                      ? `${user.handle} · ${playMode === 'bot' ? 'vs the house bot' : 'two-player mode'}`
                      : ''}
            </p>
          </header>

          <div className={styles.grid}>
            <div className={styles.boardCol}>
              <div className={styles.controls}>
                <div className={styles.segmented} role="group" aria-label="Opponent">
                  <button
                    type="button"
                    className={cx(styles.segment, playMode === 'bot' && styles.segmentActive)}
                    onClick={() => switchMode('bot')}
                  >
                    vs Bot
                  </button>
                  <button
                    type="button"
                    className={cx(styles.segment, playMode === 'friend' && styles.segmentActive)}
                    onClick={() => switchMode('friend')}
                  >
                    vs Friend
                  </button>
                </div>

                <div className={styles.segmented} role="group" aria-label="Board orientation">
                  <button
                    type="button"
                    className={cx(styles.segment, orientation === 'white' && styles.segmentActive)}
                    onClick={() => switchOrientation('white')}
                  >
                    White
                  </button>
                  <button
                    type="button"
                    className={cx(styles.segment, orientation === 'black' && styles.segmentActive)}
                    onClick={() => switchOrientation('black')}
                  >
                    Black
                  </button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={game.undo}
                  disabled={!game.canUndo}
                  className={styles.controlButton}
                >
                  Undo
                </Button>
                <Button variant="primary" size="sm" onClick={startNewGame} className={styles.controlButton}>
                  New game
                </Button>
              </div>

              <ChessBoard
                fen={game.fen}
                orientation={orientation}
                onPieceDrop={game.makeMove}
                canDragPiece={canDragPiece}
              />

              <button type="button" className={styles.rulesToggle} onClick={() => setShowRules(true)}>
                How moves work here
              </button>
            </div>

            <aside className={styles.sideCol}>
              <GameTimer turn={game.turn} running={!gameOver} resetKey={newGameKey} />
              <CapturedPieces captured={game.captured} />
              <MoveHistory history={game.history} status={game.status} />
            </aside>
          </div>
        </div>
      </section>

      <Modal open={gameOver} title="Game over" onClose={startNewGame}>
        <p className={styles.modalResult}>{game.status.label}</p>
        <p className={styles.modalBody}>
          The moves are on the scoresheet. Want another round at the same board?
        </p>
        <Button size="lg" className={styles.modalButton} onClick={startNewGame}>
          Play again
        </Button>
      </Modal>

      <Modal open={showRules} title="House rules" onClose={() => setShowRules(false)}>
        <ul className={styles.rulesList}>
          <li>Drag a piece to move it. Illegal moves simply snap back.</li>
          <li>Pawn promotions auto-promote to a queen for now.</li>
          <li>In bot mode, the house bot answers after a short pause.</li>
          <li>Undo takes the bot’s reply back too, so you can retry your move.</li>
          <li>Clocks run at 10 minutes per side — a friendly club pace.</li>
        </ul>
        <Button variant="secondary" onClick={() => setShowRules(false)}>
          Close
        </Button>
      </Modal>
    </>
  )
}
