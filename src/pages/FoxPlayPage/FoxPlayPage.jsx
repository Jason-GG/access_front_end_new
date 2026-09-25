import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CapturedPieces } from '../../components/chess/CapturedPieces'
import { FoxChessBoard } from '../../components/chess/FoxChessBoard'
import { MoveHistory } from '../../components/chess/MoveHistory'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { useFoxChessGame } from '../../hooks/useFoxChessGame'
import { ROUTES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import styles from './FoxPlayPage.module.css'

function PlayerRow({ label, name, you, active }) {
  return (
    <div className={cx(styles.player, active && styles.playerActive)}>
      <span className={styles.playerLabel}>{label}</span>
      <span className={styles.playerName}>
        {name}
        {you ? <span className={styles.youTag}>you</span> : null}
      </span>
    </div>
  )
}

export function FoxPlayPage() {
  const navigate = useNavigate()
  const [playMode, setPlayMode] = useState('bot') // 'bot' | 'pass'
  const [orientation, setOrientation] = useState('white')
  const [showRules, setShowRules] = useState(false)

  const {
    game,
    history,
    captured,
    status,
    turn,
    isGameOver,
    isPlayerTurn,
    makeMove,
    undo,
    reset,
    canUndo,
  } = useFoxChessGame({ playMode, orientation })

  const statusText = (() => {
    if (status.kind === 'checkmate') return status.label
    if (status.kind === 'draw') return status.label
    if (status.kind === 'check') return 'Check — King is threatened!'
    if (playMode === 'bot') {
      return isPlayerTurn ? 'Your move' : 'House bot is calculating…'
    }
    return turn === 'w' ? 'White’s turn' : 'Black’s turn'
  })()

  const canDragPiece = (piece) => {
    if (isGameOver) return false
    if (playMode === 'bot') {
      return piece.color === orientation[0] && isPlayerTurn
    }
    return piece.color === turn
  }

  const lastMove = history[history.length - 1]

  return (
    <section className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Variant hall</p>
            <h1 className={styles.title}>
              Fox Chess <span className={styles.badge}>10×10 Variant</span>
            </h1>
          </div>

          <div className={styles.headerActions}>
            <span
              className={cx(
                styles.statusLine,
                'notation',
                status.kind === 'check' && styles.statusCheck,
              )}
            >
              {statusText}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setShowRules(true)}>
              Rules & Moves
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.play)}
            >
              Standard 8×8 Chess
            </Button>
          </div>
        </header>

        <div className={styles.controls}>
          <div className={styles.segmented} role="radiogroup" aria-label="Game mode">
            <button
              className={cx(styles.segment, playMode === 'bot' && styles.segmentActive)}
              onClick={() => setPlayMode('bot')}
            >
              Play Bot
            </button>
            <button
              className={cx(styles.segment, playMode === 'pass' && styles.segmentActive)}
              onClick={() => setPlayMode('pass')}
            >
              Pass & Play
            </button>
          </div>

          {playMode === 'bot' && (
            <div className={styles.segmented} role="radiogroup" aria-label="Play as color">
              <button
                className={cx(styles.segment, orientation === 'white' && styles.segmentActive)}
                onClick={() => setOrientation('white')}
              >
                White
              </button>
              <button
                className={cx(styles.segment, orientation === 'black' && styles.segmentActive)}
                onClick={() => setOrientation('black')}
              >
                Black
              </button>
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={undo} disabled={!canUndo}>
            Undo
          </Button>
          <Button variant="secondary" size="sm" onClick={reset}>
            New game
          </Button>
        </div>

        <div className={styles.grid}>
          <div className={styles.boardCol}>
            <FoxChessBoard
              game={game}
              orientation={orientation}
              onPieceDrop={makeMove}
              canDragPiece={canDragPiece}
              lastMove={lastMove}
              disabled={playMode === 'bot' && !isPlayerTurn}
            />
          </div>

          <aside className={styles.sideCol}>
            <div className={styles.players}>
              {playMode === 'bot' ? (
                <>
                  <PlayerRow
                    label="Opponent"
                    name="House Bot"
                    you={orientation === 'black'}
                    active={turn === (orientation === 'white' ? 'b' : 'w')}
                  />
                  <PlayerRow
                    label="Player"
                    name="You"
                    you={orientation === 'white'}
                    active={turn === orientation[0]}
                  />
                </>
              ) : (
                <>
                  <PlayerRow
                    label="White"
                    name="Player 1"
                    active={turn === 'w'}
                  />
                  <PlayerRow
                    label="Black"
                    name="Player 2"
                    active={turn === 'b'}
                  />
                </>
              )}
            </div>

            <CapturedPieces captured={captured} />
            <MoveHistory history={history} status={status} />
          </aside>
        </div>
      </div>

      {/* Rules Modal */}
      <Modal open={showRules} title="Fox Chess (10×10 Rules)" onClose={() => setShowRules(false)}>
        <div className={styles.rulesModalCard}>
          <h3 className={styles.rulesTitle}>Board & Coordinate System</h3>
          <p className={styles.rulesText}>
            The battlefield spans <strong>10 ranks × 10 files (100 squares)</strong>. Columns from
            left to right are labeled:
            <br />
            <code>a, b, c, α (Alpha), d, e, β (Beta), f, g, h</code>
          </p>
        </div>

        <div className={styles.rulesModalCard}>
          <h3 className={styles.rulesTitle}>Back Rank Lineup</h3>
          <p className={styles.rulesText}>
            Each player commands 20 pieces arranged symmetrically:
            <br />
            <strong>Rook, Knight, Bishop, Red-eared Fox (α), Queen (d), King (e), Normal Fox (β), Bishop, Knight, Rook</strong>.
            <br />
            Ranks 2 and 9 are garrisoned with 10 pawns each.
          </p>
        </div>

        <div className={styles.rulesModalCard}>
          <h3 className={styles.rulesTitle}>🦊🔴 Red-eared Fox (Fox1)</h3>
          <p className={styles.rulesText}>
            <strong>Leaper</strong>: Moves 3 squares in one orthogonal direction and 1 square
            perpendicular (a 3,1 leaper, known as a <em>Camel</em>). Like a Knight, it{' '}
            <strong>jumps over any intervening pieces</strong>!
          </p>
        </div>

        <div className={styles.rulesModalCard}>
          <h3 className={styles.rulesTitle}>🦊 Normal Fox (Fox2)</h3>
          <p className={styles.rulesText}>
            <strong>Short Slider</strong>: Moves in all 8 Queen directions (orthogonal & diagonal)
            up to a maximum of <strong>5 squares</strong> out of 10 available on the board. Cannot
            jump over pieces.
          </p>
        </div>

        <div className={styles.rulesModalCard}>
          <h3 className={styles.rulesTitle}>♛ Queen & Pawns</h3>
          <p className={styles.rulesText}>
            The Queen moves in all 8 directions across the entire length of the board. Pawns advance
            1 square (or 2 squares on initial move) and promote on reaching the opposite back rank
            into Queen, Normal Fox, Red-eared Fox, Rook, Bishop, or Knight.
          </p>
        </div>

        <Button size="lg" className={styles.modalButton} onClick={() => setShowRules(false)}>
          Got it, let’s play!
        </Button>
      </Modal>

      {/* Game Over Modal */}
      <Modal open={isGameOver} title="Game over" onClose={reset}>
        <p className={styles.modalResult}>{status.label}</p>
        <p className={styles.modalBody}>
          Well played! Ready to analyze or jump into another game?
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => navigate(ROUTES.home)}>
            Back to Home
          </Button>
          <Button onClick={reset}>Play again</Button>
        </div>
      </Modal>
    </section>
  )
}
