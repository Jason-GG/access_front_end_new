import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CapturedPieces } from '../../components/chess/CapturedPieces'
import { ChessBoard } from '../../components/chess/ChessBoard'
import { GameTimer } from '../../components/chess/GameTimer'
import { MoveHistory } from '../../components/chess/MoveHistory'
import { RoomChat } from '../../components/chess/RoomChat'
import { RoomLobby } from '../../components/chess/RoomLobby'
import { Button } from '../../components/common/Button'
import { Loader } from '../../components/common/Loader'
import { Modal } from '../../components/common/Modal'
import { ROUTES, STORAGE_KEYS } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import { useAuth } from '../../hooks/useAuth'
import { useChessGame } from '../../hooks/useChessGame'
import { usePlayRoom } from '../../hooks/usePlayRoom'
import { loadTokenScopedState, saveTokenScopedState } from '../../services/request'
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
  const game = usePlayRoom({
    roomId,
    currentUserId: user?.id,
    currentUserRole: user?.role,
    currentUsername: user?.username || user?.handle,
  })
  const [confirmResign, setConfirmResign] = useState(false)
  const [copied, setCopied] = useState(false)
  const [justStarted, setJustStarted] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const prevStatusRef = useRef(game.gameStatus)

  const handleDeleteRoom = useCallback(async () => {
    if (deleting) return
    setDeleting(true)
    const deleted = await game.deleteRoom()
    if (deleted) {
      onLeave()
    } else {
      setDeleting(false)
    }
  }, [deleting, game, onLeave])

  const handleLeaveRoom = useCallback(async () => {
    if (leaving || deleting) return
    setLeaving(true)
    try {
      if (!game.roomDeleted && typeof game.leaveRoom === 'function') {
        await game.leaveRoom()
      }
    } finally {
      onLeave()
    }
  }, [leaving, deleting, game, onLeave])

  useEffect(() => {
    if (game.roomDeleted) {
      onLeave()
    }
  }, [game.roomDeleted, onLeave])

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
    const base = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '')
    const link = `${base}/#/play/${roomId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (game.wrongBoardType) {
    return (
      <section className={styles.page}>
        <div className="container">
          <header className={styles.header}>
            <div>
              <p className="eyebrow">Normal 8×8 Chess Room</p>
              <h1 className={styles.title}>Cannot open 10×10 Chess game here</h1>
            </div>
            <div className={styles.headerActions}>
              <Button variant="secondary" size="sm" onClick={onLeave}>
                Back to Normal Chess rooms
              </Button>
            </div>
          </header>
          <div className={cx(styles.banner, styles.bannerError)}>
            {game.error ||
              'This room is a 10×10 Chess game. You can only open Normal 8×8 Chess games from the Normal Chess room.'}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Online 8×8 room</p>
            <h1 className={styles.title}>
              {game.whitePlayer?.username || 'White'} vs {game.blackPlayer?.username || 'Black'}
            </h1>
          </div>
          <div className={styles.headerActions}>
            <span className={cx(styles.statusLine, 'notation')}>{statusText}</span>
            {game.canDeleteRoom && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteRoom}
                disabled={deleting || leaving}
              >
                {deleting ? 'Deleting…' : 'Delete room'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLeaveRoom}
              disabled={leaving || deleting}
            >
              {leaving ? 'Leaving…' : 'Leave'}
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
              {game.canDeleteRoom && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteRoom}
                  disabled={deleting || leaving}
                >
                  {deleting ? 'Deleting…' : 'Delete room'}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                className={styles.controlButton}
                onClick={handleLeaveRoom}
                disabled={leaving || deleting}
              >
                {leaving ? 'Leaving…' : 'Leave room'}
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
                lastMove={game.history[game.history.length - 1]}
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

      <Modal open={gameOver} title="Game over" onClose={handleLeaveRoom}>
        <p className={styles.modalResult}>{game.status?.label || 'Game over'}</p>
        <p className={styles.modalBody}>The result is saved to your history.</p>
        <Button size="lg" className={styles.modalButton} onClick={handleLeaveRoom} disabled={leaving}>
          Back to lobby
        </Button>
      </Modal>
    </section>
  )
}

function ChessPracticeView({ playMode, setPlayMode }) {
  const { user } = useAuth()
  const playerDisplayName = user?.username || user?.handle || 'You'
  const [orientation, setOrientation] = useState(
    () => loadTokenScopedState(STORAGE_KEYS.chessPracticeState)?.orientation || 'white',
  )
  const [difficulty, setDifficulty] = useState(
    () => loadTokenScopedState(STORAGE_KEYS.chessPracticeState)?.difficulty || 'medium',
  )

  const {
    fen,
    history,
    captured,
    status,
    turn,
    isGameOver,
    isPlayerTurn,
    resetKey,
    makeMove,
    undo,
    reset,
    canUndo,
  } = useChessGame({ playMode, orientation, difficulty })

  const difficultyLabel =
    difficulty === 'easy' ? 'Easy' : difficulty === 'hard' ? 'Hard' : 'Medium'

  const statusText = (() => {
    if (status.kind === 'checkmate') return status.label
    if (status.kind === 'draw') return status.label
    if (status.kind === 'check') return 'Check — King is threatened!'
    if (playMode === 'bot') {
      return isPlayerTurn
        ? 'Your move'
        : `Computer (${difficultyLabel}) is thinking…`
    }
    return turn === 'w' ? 'White’s turn' : 'Black’s turn'
  })()

  const canDragPiece = useCallback(
    (pieceType) => {
      if (isGameOver) return false
      const color = pieceType?.[0]?.toLowerCase()
      if (playMode === 'bot') {
        return color === orientation[0] && isPlayerTurn
      }
      return color === turn
    },
    [isGameOver, playMode, orientation, isPlayerTurn, turn],
  )

  const lastMove = history[history.length - 1]

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.segmented} role="radiogroup" aria-label="Game mode">
          <button
            className={cx(styles.segment, playMode === 'online' && styles.segmentActive)}
            onClick={() => setPlayMode('online')}
          >
            Online Rooms
          </button>
          <button
            className={cx(styles.segment, playMode === 'bot' && styles.segmentActive)}
            onClick={() => setPlayMode('bot')}
          >
            Play Computer
          </button>
          <button
            className={cx(styles.segment, playMode === 'pass' && styles.segmentActive)}
            onClick={() => setPlayMode('pass')}
          >
            Pass & Play
          </button>
        </div>

        <span
          className={cx(
            styles.statusLine,
            'notation',
            status.kind === 'check' && styles.statusCheck,
          )}
        >
          {statusText}
        </span>

        {playMode === 'bot' && (
          <>
            <div className={styles.segmented} role="radiogroup" aria-label="Computer difficulty">
              <button
                className={cx(styles.segment, difficulty === 'easy' && styles.segmentActive)}
                onClick={() => setDifficulty('easy')}
              >
                Easy
              </button>
              <button
                className={cx(styles.segment, difficulty === 'medium' && styles.segmentActive)}
                onClick={() => setDifficulty('medium')}
              >
                Medium
              </button>
              <button
                className={cx(styles.segment, difficulty === 'hard' && styles.segmentActive)}
                onClick={() => setDifficulty('hard')}
              >
                Hard
              </button>
            </div>

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
          </>
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
          <ChessBoard
            fen={fen}
            orientation={orientation}
            onPieceDrop={makeMove}
            canDragPiece={canDragPiece}
            lastMove={lastMove}
          />
        </div>

        <aside className={styles.sideCol}>
          <GameTimer turn={turn} running={!isGameOver} resetKey={resetKey} />

          <div className={styles.players}>
            {playMode === 'bot' ? (
              <>
                <PlayerRow
                  label="Opponent"
                  name={`Computer (${difficultyLabel})`}
                  you={false}
                  active={turn === (orientation === 'white' ? 'b' : 'w')}
                />
                <PlayerRow
                  label="Player"
                  name={playerDisplayName}
                  you
                  active={turn === orientation[0]}
                />
              </>
            ) : (
              <>
                <PlayerRow
                  label="White"
                  name={user ? playerDisplayName : 'Player 1'}
                  you={Boolean(user)}
                  active={turn === 'w'}
                />
                <PlayerRow label="Black" name="Player 2" active={turn === 'b'} />
              </>
            )}
          </div>

          <CapturedPieces captured={captured} />
          <MoveHistory history={history} status={status} />
        </aside>
      </div>
    </>
  )
}

export function PlayPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const [playMode, setPlayModeState] = useState(
    () => loadTokenScopedState(STORAGE_KEYS.chessPracticeState)?.playMode || 'online',
  ) // 'online' | 'bot' | 'pass'

  const setPlayMode = useCallback((nextMode) => {
    setPlayModeState(nextMode)
    const prev = loadTokenScopedState(STORAGE_KEYS.chessPracticeState) || {}
    saveTokenScopedState(STORAGE_KEYS.chessPracticeState, {
      ...prev,
      playMode: nextMode,
    })
  }, [])

  useEffect(() => {
    const modeParam = searchParams.get('mode')
    if (!roomId && (modeParam === 'bot' || modeParam === 'pass' || modeParam === 'online')) {
      setPlayMode(modeParam)
    }
  }, [roomId, searchParams, setPlayMode])

  if (roomId) {
    return <RoomView key={roomId} roomId={roomId} onLeave={() => navigate(ROUTES.play)} />
  }

  return (
    <section className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Standard 8×8 Chess</p>
            <h1 className={styles.title}>Normal Chess Room</h1>
          </div>
          <div className={styles.headerActions}>
            <Button
              variant={playMode === 'bot' ? 'primary' : 'secondary'}
              onClick={() => setPlayMode(playMode === 'bot' ? 'online' : 'bot')}
            >
              {playMode === 'bot' ? 'Online Rooms' : 'Play vs Computer'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(ROUTES.foxPlay)}
            >
              10×10 Chess Room
            </Button>
          </div>
        </header>

        {playMode === 'online' ? (
          <>
            <div className={styles.controls}>
              <div className={styles.segmented} role="radiogroup" aria-label="Game mode">
                <button
                  className={cx(styles.segment, playMode === 'online' && styles.segmentActive)}
                  onClick={() => setPlayMode('online')}
                >
                  Online Rooms
                </button>
                <button
                  className={cx(styles.segment, playMode === 'bot' && styles.segmentActive)}
                  onClick={() => setPlayMode('bot')}
                >
                  Play Computer
                </button>
                <button
                  className={cx(styles.segment, playMode === 'pass' && styles.segmentActive)}
                  onClick={() => setPlayMode('pass')}
                >
                  Pass & Play
                </button>
              </div>
            </div>

            <RoomLobby
              boardType="chess"
              title="Normal 8×8 Chess Rooms"
              eyebrow="Standard 8×8 Chess"
              createLabel="Create 8×8 room"
              emptyText="No open Normal 8×8 Chess rooms right now. Create one and the next player who joins takes the black seat."
              onEnterRoom={(id) => navigate(`/play/${id}`)}
            />
          </>
        ) : (
          <ChessPracticeView playMode={playMode} setPlayMode={setPlayMode} />
        )}
      </div>
    </section>
  )
}
