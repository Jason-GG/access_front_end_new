import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CapturedPieces } from '../../components/chess/CapturedPieces'
import { ChessBoard } from '../../components/chess/ChessBoard'
import { GameTimer } from '../../components/chess/GameTimer'
import { MoveHistory } from '../../components/chess/MoveHistory'
import { RoomChat } from '../../components/chess/RoomChat'
import { RoomLobby } from '../../components/chess/RoomLobby'
import { Button } from '../../components/common/Button'
import { Loader } from '../../components/common/Loader'
import { Modal } from '../../components/common/Modal'
import { ROUTES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import { useAuth } from '../../hooks/useAuth'
import { usePlayRoom } from '../../hooks/usePlayRoom'
import styles from './PlayPage.module.css'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function sameUser(a, b) {
  return a != null && b != null && String(a) === String(b)
}

function PlayerRow({ label, name, you, active }) {
  return (
    <div className={cx(styles.player, active && styles.playerActive)}>
      <span className={styles.playerLabel}>{label}</span>
      <span className={styles.playerName}>
        {name || 'Waiting…'}
        {you ? <span className={styles.youTag}>you</span> : null}
      </span>
    </div>
  )
}

function RoomView({ roomId, onLeave }) {
  const { user } = useAuth()
  const game = usePlayRoom({ roomId, currentUserId: user?.id })
  const [confirmResign, setConfirmResign] = useState(false)
  const [copied, setCopied] = useState(false)
  const [justStarted, setJustStarted] = useState(false)
  const prevStatusRef = useRef(game.gameStatus)

  useEffect(() => {
    if (prevStatusRef.current === 'waiting' && game.gameStatus === 'active') {
      setJustStarted(true)
      const timer = setTimeout(() => setJustStarted(false), 4000)
      return () => clearTimeout(timer)
    }
    prevStatusRef.current = game.gameStatus
  }, [game.gameStatus])

  const waiting = game.gameStatus === 'waiting' || game.status?.kind === 'waiting'
  const gameOver =
    game.gameStatus === 'finished' ||
    game.status?.kind === 'finished' ||
    game.status?.kind === 'draw' ||
    game.status?.kind === 'checkmate'

  const drawFromOpponent = Boolean(game.drawOfferBy) && !sameUser(game.drawOfferBy, user?.id)
  const takebackFromOpponent = Boolean(game.takeback) && !sameUser(game.takeback?.by, user?.id)

  const statusText = (() => {
    if (game.loading) return 'Joining room…'
    if (waiting) return 'Waiting for an opponent…'
    if (gameOver) return game.status?.label || 'Game over'
    if (game.status?.kind === 'check') return 'Check — answer the threat'
    if (game.isMyTurn) return 'Your move'
    if (game.isPlayer) return "Opponent's move"
    return 'Spectating'
  })()

  const canDragPiece = (pieceType) => {
    if (!game.canMove) return false
    const myColor = game.mySeat === 'black' ? 'b' : 'w'
    return pieceType[0] === myColor
  }

  async function copyInvite() {
    const link = `${window.location.origin}/play/${roomId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Online room</p>
            <h1 className={styles.title}>
              {game.whitePlayer?.username || 'White'} vs {game.blackPlayer?.username || 'Black'}
            </h1>
          </div>
          <div className={styles.headerActions}>
            <span className={cx(styles.statusLine, 'notation')}>{statusText}</span>
            <Button variant="secondary" size="sm" onClick={onLeave}>
              Leave
            </Button>
          </div>
        </header>

        {game.connection !== 'connected' && !game.loading && (
          <div className={cx(styles.banner, styles.bannerWarn)}>
            {game.connection === 'reconnecting'
              ? 'Reconnecting to the live room…'
              : game.connection === 'busy'
                ? 'The server is busy. Please try again shortly.'
                : game.connection === 'error'
                  ? game.error || 'The live connection failed.'
                  : 'Connecting to the live room…'}
          </div>
        )}

        {drawFromOpponent && (
          <div className={styles.banner}>
            <span>Your opponent offers a draw.</span>
            <div className={styles.bannerActions}>
              <Button size="sm" onClick={game.acceptDraw}>
                Accept
              </Button>
              <Button size="sm" variant="secondary" onClick={game.declineDraw}>
                Decline
              </Button>
            </div>
          </div>
        )}
        {game.drawOfferBy && !drawFromOpponent && (
          <div className={styles.banner}>
            <span>Draw offered — waiting for a reply.</span>
          </div>
        )}

        {takebackFromOpponent && (
          <div className={styles.banner}>
            <span>Your opponent asks to take back the last move.</span>
            <div className={styles.bannerActions}>
              <Button size="sm" onClick={game.acceptTakeback}>
                Accept
              </Button>
              <Button size="sm" variant="secondary" onClick={game.declineTakeback}>
                Decline
              </Button>
            </div>
          </div>
        )}
        {game.takeback && !takebackFromOpponent && (
          <div className={styles.banner}>
            <span>Takeback requested — waiting for a reply.</span>
          </div>
        )}

        {game.error && game.connection === 'connected' && (
          <div className={cx(styles.banner, styles.bannerError)}>{game.error}</div>
        )}

        {justStarted && (
          <div className={cx(styles.banner, styles.bannerSuccess)}>
            Opponent joined! The game has started.
          </div>
        )}

        {waiting && (
          <p className={styles.waitingNote}>
            Waiting for the second player. Share this room id:{' '}
            <code className={styles.roomId}>{roomId}</code>
          </p>
        )}

        <div className={styles.grid}>
          <div className={styles.boardCol}>
            <div className={styles.controls}>
              {game.isPlayer && !gameOver && !waiting && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={game.offerDraw}
                    disabled={Boolean(game.drawOfferBy)}
                  >
                    Offer draw
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={game.requestTakeback}
                    disabled={Boolean(game.takeback) || game.history.length === 0}
                  >
                    Takeback
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmResign(true)}>
                    Resign
                  </Button>
                </>
              )}
              {waiting && game.isPlayer && (
                <Button variant="secondary" size="sm" onClick={game.abort}>
                  Abort game
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={copyInvite}>
                {copied ? 'Copied!' : 'Copy invite link'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className={styles.controlButton}
                onClick={onLeave}
              >
                Leave room
              </Button>
            </div>

            {game.loading ? (
              <Loader label="Joining room" full />
            ) : (
              <ChessBoard
                fen={game.fen || START_FEN}
                orientation={game.orientation}
                onPieceDrop={game.sendMove}
                canDragPiece={canDragPiece}
              />
            )}
          </div>

          <aside className={styles.sideCol}>
            {game.displayClocks && (
              <GameTimer
                turn={game.turn}
                running={game.gameStatus === 'active'}
                times={game.displayClocks}
              />
            )}

            <div className={styles.players}>
              <PlayerRow
                label="White"
                name={game.whitePlayer?.username}
                you={game.mySeat === 'white'}
                active={game.gameStatus === 'active' && game.turn === 'w'}
              />
              <PlayerRow
                label="Black"
                name={game.blackPlayer?.username}
                you={game.mySeat === 'black'}
                active={game.gameStatus === 'active' && game.turn === 'b'}
              />
            </div>

            <CapturedPieces captured={game.captured} />
            <MoveHistory history={game.history} status={game.status} />
            <RoomChat
              comments={game.comments}
              onSend={game.sendComment}
              error={game.chatError}
              disabled={game.loading}
            />
          </aside>
        </div>
      </div>

      <Modal open={confirmResign} title="Resign game" onClose={() => setConfirmResign(false)}>
        <p className={styles.modalBody}>Resigning counts as a loss. Are you sure?</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setConfirmResign(false)}>
            Keep playing
          </Button>
          <Button
            onClick={() => {
              setConfirmResign(false)
              game.resign()
            }}
          >
            Resign
          </Button>
        </div>
      </Modal>

      <Modal open={gameOver} title="Game over" onClose={onLeave}>
        <p className={styles.modalResult}>{game.status?.label || 'Game over'}</p>
        <p className={styles.modalBody}>The result is saved to your history.</p>
        <Button size="lg" className={styles.modalButton} onClick={onLeave}>
          Back to lobby
        </Button>
      </Modal>
    </section>
  )
}

export function PlayPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()

  if (roomId) {
    return <RoomView key={roomId} roomId={roomId} onLeave={() => navigate(ROUTES.play)} />
  }

  return (
    <section className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">The play room</p>
            <h1 className={styles.title}>Play</h1>
          </div>
        </header>
        <RoomLobby onEnterRoom={(id) => navigate(`/play/${id}`)} />
      </div>
    </section>
  )
}
