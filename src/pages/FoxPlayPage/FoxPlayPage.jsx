import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as playApi from '../../api/playApi'
import { CapturedPieces } from '../../components/chess/CapturedPieces'
import { FoxChessBoard } from '../../components/chess/FoxChessBoard'
import { GameTimer } from '../../components/chess/GameTimer'
import { MoveHistory } from '../../components/chess/MoveHistory'
import { RoomChat } from '../../components/chess/RoomChat'
import { RoomLobby } from '../../components/chess/RoomLobby'
import { Button } from '../../components/common/Button'
import { Loader } from '../../components/common/Loader'
import { Modal } from '../../components/common/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useFoxChessGame } from '../../hooks/useFoxChessGame'
import { useFoxPlayRoom } from '../../hooks/useFoxPlayRoom'
import { ROUTES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import styles from './FoxPlayPage.module.css'

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

// ---------------------------------------------------------------------------
// Online Fox Chess Room View (Connected via WebSocket & REST to backend API)
// ---------------------------------------------------------------------------
function FoxRoomView({ roomId, onLeave }) {
  const { user } = useAuth()
  const game = useFoxPlayRoom({ roomId, currentUserId: user?.id })
  const [confirmResign, setConfirmResign] = useState(false)
  const [copied, setCopied] = useState(false)
  const [justStarted, setJustStarted] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const prevStatusRef = useRef(game.gameStatus)

  useEffect(() => {
    if (prevStatusRef.current === 'waiting' && game.gameStatus === 'active') {
      setJustStarted(true)
      const timer = setTimeout(() => setJustStarted(false), 4000)
      return () => clearTimeout(timer)
    }
    prevStatusRef.current = game.gameStatus
  }, [game.gameStatus])

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const waiting = game.gameStatus === 'waiting'
  const gameOver = game.gameStatus === 'finished'

  const statusText = (() => {
    if (waiting) return 'Waiting for an opponent…'
    if (gameOver) return game.result ? `Game over · ${game.result}` : 'Game over'
    if (game.status.kind === 'check') return 'Check — King is threatened!'
    return game.isMyTurn ? 'Your move' : 'Opponent’s turn'
  })()

  const canDragPiece = (piece) => {
    if (!game.canMove || gameOver || waiting) return false
    return piece.color === (game.mySeat === 'black' ? 'b' : 'w')
  }

  const drawFromOpponent =
    Boolean(game.drawOfferBy) &&
    (game.drawOfferBy === true || !sameUser(game.drawOfferBy, user?.id))

  const takebackFromOpponent =
    Boolean(game.takeback) && !sameUser(game.takeback?.by, user?.id)

  const lastMove = game.history[game.history.length - 1]

  return (
    <section className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Online 10×10 room</p>
            <h1 className={styles.title}>
              {game.whitePlayer?.username || 'White'} vs{' '}
              {game.blackPlayer?.username || 'Black'}{' '}
              <span className={styles.badge}>Fox Chess</span>
            </h1>
          </div>
          <div className={styles.headerActions}>
            <span
              className={cx(
                styles.statusLine,
                'notation',
                game.status.kind === 'check' && styles.statusCheck,
              )}
            >
              {statusText}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setShowRules(true)}>
              Rules & Moves
            </Button>
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
            Opponent joined! The 10×10 Fox Chess battle has begun.
          </div>
        )}

        {waiting && (
          <p className={styles.waitingNote}>
            Waiting for the second player to join. Share this room ID:{' '}
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
              <Loader label="Joining Fox Chess room" full />
            ) : (
              <FoxChessBoard
                game={game.engine}
                orientation={game.orientation}
                onPieceDrop={game.sendMove}
                canDragPiece={canDragPiece}
                lastMove={lastMove}
                disabled={!game.canMove}
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
        <p className={styles.modalBody}>
          Are you sure you want to resign? Your opponent will be awarded the victory.
        </p>
        <Button
          variant="primary"
          className={styles.modalButton}
          onClick={() => {
            setConfirmResign(false)
            game.resign()
          }}
        >
          Confirm resignation
        </Button>
      </Modal>

      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Offline / Practice View (Play vs House Bot or Local Pass & Play)
// ---------------------------------------------------------------------------
function FoxPracticeView({ playMode, setPlayMode }) {
  const [orientation, setOrientation] = useState('white')

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
            Play Bot
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
                <PlayerRow label="White" name="Player 1" active={turn === 'w'} />
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

function RulesModal({ open, onClose }) {
  return (
    <Modal open={open} title="Fox Chess (10×10 Rules)" onClose={onClose}>
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
        <h3 className={styles.rulesTitle}>Starting Lineup (Ranks 1 & 10)</h3>
        <p className={styles.rulesText}>
          From file <code>a</code> to <code>h</code>:
          <br />
          <strong>
            Rook, Knight, Bishop, Red-eared Fox (α), Queen, King, Normal Fox (β), Bishop, Knight,
            Rook
          </strong>
        </p>
      </div>

      <div className={styles.rulesModalCard}>
        <h3 className={styles.rulesTitle}>🦊🔴 Red-eared Fox (Fox 1)</h3>
        <p className={styles.rulesText}>
          Located on the <strong>α file</strong>. Moves <strong>3 squares</strong> in one
          orthogonal direction and turns <strong>1 square</strong> perpendicular (a (3,1) leaper).
          Like the Knight, it leaps cleanly over intervening pieces!
        </p>
      </div>

      <div className={styles.rulesModalCard}>
        <h3 className={styles.rulesTitle}>🦊 Normal Fox (Fox 2)</h3>
        <p className={styles.rulesText}>
          Located on the <strong>β file</strong>. Moves in all 8 Queen directions (orthogonal &
          diagonal) like the Queen, but <strong>half length</strong>: a maximum of{' '}
          <strong>5 squares</strong> out of the 10 available board squares. Cannot leap over pieces.
        </p>
      </div>

      <div className={styles.rulesModalCard}>
        <h3 className={styles.rulesTitle}>♛ Queen & Officers</h3>
        <p className={styles.rulesText}>
          The Queen moves all 8 directions as many squares as available. Pawns advance 1 square
          forward (optional 2 squares on initial rank 2 for White, rank 9 for Black) and promote to
          Queen, Rook, Bishop, Knight, Red-eared Fox, or Normal Fox.
        </p>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Main Page: Switches between Live Room View and Lobby / Practice
// ---------------------------------------------------------------------------
export function FoxPlayPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const [playMode, setPlayMode] = useState('online') // 'online' | 'bot' | 'pass'
  const [showRules, setShowRules] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [createError, setCreateError] = useState(null)

  const handleCreateRoom = useCallback(async () => {
    setCreatingRoom(true)
    setCreateError(null)
    try {
      const res = await playApi.createRoom()
      const newRoomId = res?.room?.id || res?.id
      if (newRoomId) {
        navigate(`/play/fox/${newRoomId}`)
      } else {
        setCreateError('Room created but ID was missing.')
      }
    } catch (err) {
      setCreateError(err?.message || 'Could not create a room.')
    } finally {
      setCreatingRoom(false)
    }
  }, [navigate])

  // Support ?action=create or ?create=true to instantly create a room
  useEffect(() => {
    if (!roomId && (searchParams.get('create') === 'true' || searchParams.get('action') === 'create')) {
      handleCreateRoom()
    }
  }, [roomId, searchParams, handleCreateRoom])

  // If URL contains a room ID, render the live room directly
  if (roomId) {
    return <FoxRoomView roomId={roomId} onLeave={() => navigate(ROUTES.foxPlay)} />
  }

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
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateRoom}
              disabled={creatingRoom}
            >
              {creatingRoom ? 'Creating room…' : 'Create Fox Chess Room'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowRules(true)}>
              Rules & Moves
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.play)}>
              Standard 8×8 Chess
            </Button>
          </div>
        </header>

        {createError && (
          <div className={cx(styles.banner, styles.bannerError)}>{createError}</div>
        )}

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
                  Play Bot
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
              title="10×10 Fox Chess Rooms"
              eyebrow="Multiplayer Arena"
              createLabel="Create a room"
              emptyText="No open Fox Chess rooms right now. Click 'Create a room' and the next player who joins takes the black seat!"
              onEnterRoom={(id) => navigate(`/play/fox/${id}`)}
            />
          </>
        ) : (
          <FoxPracticeView playMode={playMode} setPlayMode={setPlayMode} />
        )}
      </div>

      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
    </section>
  )
}
