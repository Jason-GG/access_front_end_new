import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as playApi from '../../api/playApi'
import { CapturedPieces } from '../../components/chess/CapturedPieces'
import { ChessBoard } from '../../components/chess/ChessBoard'
import { GameResultModal } from '../../components/chess/GameResultModal'
import { GameTimer } from '../../components/chess/GameTimer'
import { MoveHistory } from '../../components/chess/MoveHistory'
import { RoomChat } from '../../components/chess/RoomChat'
import { RoomLobby } from '../../components/chess/RoomLobby'
import { Button } from '../../components/common/Button'
import { Loader } from '../../components/common/Loader'
import { Modal } from '../../components/common/Modal'
import { ROUTES, STORAGE_KEYS, formatTimeControlSummary } from '../../utils/constants'
import { buildRoomInviteUrl, copyToClipboard, cx } from '../../utils/helpers'
import { useAuth } from '../../hooks/useAuth'
import { useChessGame } from '../../hooks/useChessGame'
import { usePlayRoom } from '../../hooks/usePlayRoom'
import { loadTokenScopedState, saveTokenScopedState } from '../../services/request'
import {
  isSoundMuted,
  subscribeSoundMuted,
  toggleSoundMuted,
} from '../../services/soundService'
import styles from './PlayPage.module.css'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function sameUser(a, b) {
  return a != null && b != null && String(a) === String(b)
}

function PlayerRow({ label, name, you, active, score }) {
  return (
    <div className={cx(styles.player, active && styles.playerActive)}>
      <span className={styles.playerLabel}>{label}</span>
      <span className={styles.playerName}>
        {name || 'Waiting…'}
        {typeof score === 'number' && !Number.isNaN(score) ? (
          <span className={styles.playerScore}>★ {score} pts</span>
        ) : null}
        {you ? <span className={styles.youTag}>you</span> : null}
      </span>
    </div>
  )
}

function SoundToggleButton() {
  const [muted, setMuted] = useState(() => isSoundMuted())
  useEffect(() => subscribeSoundMuted(setMuted), [])
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={toggleSoundMuted}
      title={muted ? 'Unmute move sounds' : 'Mute move sounds'}
      aria-label={muted ? 'Unmute move sounds' : 'Mute move sounds'}
    >
      {muted ? '🔇 Sound off' : '🔊 Sound on'}
    </Button>
  )
}

function RoomView({ roomId, onLeave }) {
  const { user, score, refreshUser, applyScoreChange } = useAuth()
  const game = usePlayRoom({
    roomId,
    currentUserId: user?.id,
    currentUserRole: user?.role,
    currentUsername: user?.username || user?.handle,
  })
  const [confirmResign, setConfirmResign] = useState(false)
  const [confirmLeaveAction, setConfirmLeaveAction] = useState(null)
  const [copied, setCopied] = useState(false)
  const [justStarted, setJustStarted] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lastScoreDelta, setLastScoreDelta] = useState(null)
  const settledRoomRef = useRef(false)
  const leftExplicitlyRef = useRef(false)
  const prevStatusRef = useRef(game.gameStatus)

  const waiting = game.gameStatus === 'waiting' || game.status?.kind === 'waiting'
  const gameOver =
    game.gameStatus === 'finished' ||
    game.status?.kind === 'finished' ||
    game.status?.kind === 'draw' ||
    game.status?.kind === 'checkmate'
  const isGameUnfinished = !gameOver && !game.loading && !game.roomDeleted
  const hasActiveOpponentOrMoves =
    !waiting ||
    (Array.isArray(game.history) && game.history.length > 0) ||
    Boolean(game.whitePlayer && game.blackPlayer)

  const executeDeleteRoom = useCallback(async () => {
    if (deleting) return
    leftExplicitlyRef.current = true
    setDeleting(true)
    const deleted = await game.deleteRoom()
    if (deleted) {
      refreshUser()
      onLeave()
    } else {
      leftExplicitlyRef.current = false
      setDeleting(false)
    }
  }, [deleting, game, onLeave, refreshUser])

  const executeLeaveRoom = useCallback(
    async (targetHref = null) => {
      if (leaving || deleting) return
      leftExplicitlyRef.current = true
      setLeaving(true)
      try {
        if (!game.roomDeleted && typeof game.leaveRoom === 'function') {
          await game.leaveRoom()
        }
      } finally {
        refreshUser()
        if (typeof targetHref === 'string' && targetHref) {
          const hashIdx = targetHref.indexOf('#')
          if (hashIdx >= 0) {
            window.location.hash = targetHref.slice(hashIdx)
          } else {
            onLeave()
          }
        } else {
          onLeave()
        }
      }
    },
    [leaving, deleting, game, onLeave, refreshUser],
  )

  const handleDeleteRoom = useCallback(() => {
    if (deleting || leaving) return
    if (isGameUnfinished) {
      setConfirmLeaveAction({ type: 'delete', href: null })
      return
    }
    executeDeleteRoom()
  }, [deleting, leaving, isGameUnfinished, executeDeleteRoom])

  const handleLeaveRoom = useCallback(() => {
    if (leaving || deleting) return
    if (isGameUnfinished) {
      setConfirmLeaveAction({ type: 'leave', href: null })
      return
    }
    executeLeaveRoom()
  }, [leaving, deleting, isGameUnfinished, executeLeaveRoom])

  const handleConfirmLeaveAction = useCallback(async () => {
    const action = confirmLeaveAction
    setConfirmLeaveAction(null)
    if (!action) return
    if (action.type === 'delete') {
      await executeDeleteRoom()
    } else {
      await executeLeaveRoom(action.href)
    }
  }, [confirmLeaveAction, executeDeleteRoom, executeLeaveRoom])

  useEffect(() => {
    if (gameOver && confirmLeaveAction) {
      setConfirmLeaveAction(null)
    }
  }, [gameOver, confirmLeaveAction])

  useEffect(() => {
    if (!isGameUnfinished) return undefined
    const handleDocumentClick = (event) => {
      if (leftExplicitlyRef.current) return
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor) return
      const rawHref = anchor.getAttribute('href') || ''
      if (!rawHref || rawHref.startsWith('javascript:') || rawHref === '#') return
      if (roomId && rawHref.includes(roomId)) return
      event.preventDefault()
      event.stopPropagation()
      setConfirmLeaveAction({ type: 'navigate', href: rawHref })
    }
    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [isGameUnfinished, roomId])

  useEffect(() => {
    if (!isGameUnfinished || !hasActiveOpponentOrMoves) return undefined
    const handleBeforeUnload = (event) => {
      if (leftExplicitlyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isGameUnfinished, hasActiveOpponentOrMoves])

  useEffect(() => {
    if (game.roomDeleted) {
      leftExplicitlyRef.current = true
      refreshUser()
      onLeave()
    }
  }, [game.roomDeleted, onLeave, refreshUser])

  useEffect(() => {
    return () => {
      if (!leftExplicitlyRef.current && roomId && !window.location.hash.includes(roomId)) {
        saveTokenScopedState(`${STORAGE_KEYS.roomStatePrefix}chess:${roomId}`, null)
        playApi
          .leaveRoom(roomId)
          .then(() => refreshUser())
          .catch(() => {})
      }
    }
  }, [roomId, refreshUser])

  useEffect(() => {
    if (game.gameStatus === 'waiting') {
      settledRoomRef.current = false
      setLastScoreDelta(null)
      refreshUser()
    }
  }, [game.gameId, game.gameStatus, refreshUser])

  useEffect(() => {
    if (prevStatusRef.current === 'waiting' && game.gameStatus === 'active') {
      setJustStarted(true)
      const timer = setTimeout(() => setJustStarted(false), 4000)
      return () => clearTimeout(timer)
    }
    prevStatusRef.current = game.gameStatus
  }, [game.gameStatus])

  useEffect(() => {
    if (!gameOver || game.result === 'aborted' || !game.isPlayer || settledRoomRef.current) {
      return
    }
    settledRoomRef.current = true
    const rawWinner = game.status?.winner
    const winnerNorm =
      rawWinner === 'white' || rawWinner === 'w'
        ? 'white'
        : rawWinner === 'black' || rawWinner === 'b'
          ? 'black'
          : null
    const myColor =
      game.mySeat === 'black' || game.mySeat === 'b'
        ? 'black'
        : game.mySeat === 'white' || game.mySeat === 'w'
          ? 'white'
          : null
    const delta = winnerNorm && myColor ? (winnerNorm === myColor ? 5 : -5) : 0
    setLastScoreDelta(delta)
    if (delta !== 0) {
      applyScoreChange(delta)
    }
    refreshUser()
  }, [
    gameOver,
    game.result,
    game.isPlayer,
    game.status?.winner,
    game.mySeat,
    applyScoreChange,
    refreshUser,
  ])

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
    const link = buildRoomInviteUrl(`/play/${roomId}`)
    const ok = await copyToClipboard(link)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
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
            <p className="eyebrow">
              Online 8×8 room · ⏱ {formatTimeControlSummary(game.timeControl)}
            </p>
            <h1 className={styles.title}>
              {game.whitePlayer?.username || 'White'} vs {game.blackPlayer?.username || 'Black'}
            </h1>
          </div>
          <div className={styles.headerActions}>
            <span className={cx(styles.statusLine, 'notation')}>{statusText}</span>
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
              <Button variant="secondary" size="sm" onClick={copyInvite}>
                {copied ? 'Copied!' : 'Copy invite link'}
              </Button>
              <SoundToggleButton />
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
                score={game.mySeat === 'white' ? score : game.whitePlayer?.score}
              />
              <PlayerRow
                label="Black"
                name={game.blackPlayer?.username}
                you={game.mySeat === 'black'}
                active={game.gameStatus === 'active' && game.turn === 'b'}
                score={game.mySeat === 'black' ? score : game.blackPlayer?.score}
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

      <Modal
        open={Boolean(confirmLeaveAction)}
        title={
          confirmLeaveAction?.type === 'delete'
            ? 'Delete room before game finishes?'
            : 'Leave unfinished game?'
        }
        onClose={() => {
          if (!leaving && !deleting) setConfirmLeaveAction(null)
        }}
      >
        <p className={styles.modalBody}>
          This chess game is not finished yet. Please read these tips before leaving:
        </p>
        <div className={styles.leaveWarnBox}>
          <p className={styles.leaveWarnTitle}>Important Tips</p>
          <ul className={styles.leaveWarnTips}>
            {hasActiveOpponentOrMoves ? (
              <>
                <li>
                  <strong>Forfeit &amp; Score Penalty:</strong> Leaving an unfinished game counts as
                  a loss and deducts <strong>5 score points (-5 pts)</strong> from your record
                  (your opponent gains +5 pts).
                </li>
                <li>
                  <strong>Game Resets from Beginning:</strong> If you or another player return to
                  this room later, the chess game will <strong>start over from the beginning</strong>.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Game Not Finished:</strong> You are currently waiting for an opponent to
                  join this room.
                </li>
                <li>
                  <strong>Score &amp; Reset Rule:</strong> Once an opponent joins, leaving before
                  the game finishes will cost <strong>-5 score points</strong> and reset the game
                  from the beginning.
                </li>
              </>
            )}
          </ul>
        </div>
        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            onClick={() => setConfirmLeaveAction(null)}
            disabled={leaving || deleting}
          >
            Stay in room
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmLeaveAction}
            disabled={leaving || deleting}
          >
            {confirmLeaveAction?.type === 'delete'
              ? deleting
                ? 'Deleting…'
                : 'Delete room anyway'
              : leaving
                ? 'Leaving…'
                : 'Leave room anyway'}
          </Button>
        </div>
      </Modal>

      <GameResultModal
        open={gameOver && game.result !== 'aborted'}
        winner={game.status?.winner}
        mySeat={game.mySeat}
        mode="online"
        statusLabel={game.status?.label || 'Game over'}
        whiteName={game.whitePlayer?.username || 'White'}
        blackName={game.blackPlayer?.username || 'Black'}
        scoreDelta={lastScoreDelta}
        currentScore={game.isPlayer ? score : null}
        primaryActionLabel="Back to lobby"
        onPrimaryAction={() => executeLeaveRoom()}
      />
    </section>
  )
}

function ChessPracticeView({ playMode, setPlayMode }) {
  const { user, score, applyScoreChange } = useAuth()
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
  const [botScoreDelta, setBotScoreDelta] = useState(null)
  const settledBotGameRef = useRef(null)

  useEffect(() => {
    if (playMode !== 'bot' || !isGameOver) {
      setBotScoreDelta(null)
      return
    }
    const gameKey = `${resetKey}-${history.length}`
    if (settledBotGameRef.current === gameKey) return
    settledBotGameRef.current = gameKey

    const rawWinner = status?.winner
    const winnerNorm =
      rawWinner === 'white' || rawWinner === 'w'
        ? 'white'
        : rawWinner === 'black' || rawWinner === 'b'
          ? 'black'
          : null
    const myColor = orientation === 'black' ? 'black' : 'white'
    const outcome = winnerNorm ? (winnerNorm === myColor ? 'win' : 'loss') : 'draw'
    const delta = outcome === 'win' ? 5 : outcome === 'loss' ? -5 : 0

    setBotScoreDelta(delta)
    if (delta !== 0) {
      applyScoreChange(delta)
    }
    if (user) {
      playApi
        .recordBotResult({ outcome, boardType: 'chess' })
        .then((res) => {
          if (typeof res?.score === 'number') {
            applyScoreChange({ newScore: res.score })
          }
        })
        .catch(() => {})
    }
  }, [playMode, isGameOver, resetKey, history.length, status?.winner, orientation, user, applyScoreChange])

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
        <SoundToggleButton />
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
                  score={score}
                />
              </>
            ) : (
              <>
                <PlayerRow
                  label="White"
                  name={user ? playerDisplayName : 'Player 1'}
                  you={Boolean(user)}
                  active={turn === 'w'}
                  score={user ? score : undefined}
                />
                <PlayerRow label="Black" name="Player 2" active={turn === 'b'} />
              </>
            )}
          </div>

          <CapturedPieces captured={captured} />
          <MoveHistory history={history} status={status} />
        </aside>
      </div>

      <GameResultModal
        open={isGameOver}
        winner={status?.winner}
        mySeat={playMode === 'bot' ? orientation : null}
        mode={playMode === 'bot' ? 'computer' : 'pass'}
        statusLabel={status?.label || 'Game over'}
        whiteName={
          playMode === 'bot'
            ? orientation === 'white'
              ? playerDisplayName
              : `Computer (${difficultyLabel})`
            : user
              ? playerDisplayName
              : 'Player 1'
        }
        blackName={
          playMode === 'bot'
            ? orientation === 'black'
              ? playerDisplayName
              : `Computer (${difficultyLabel})`
            : 'Player 2'
        }
        scoreDelta={playMode === 'bot' ? botScoreDelta : null}
        currentScore={playMode === 'bot' ? score : null}
        primaryActionLabel="New game"
        onPrimaryAction={reset}
      />
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
            <Button variant="secondary" onClick={() => navigate(ROUTES.learn)}>
              Rules & Moves
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
              onSwitchToBot={() => setPlayMode('bot')}
            />
          </>
        ) : (
          <ChessPracticeView playMode={playMode} setPlayMode={setPlayMode} />
        )}
      </div>
    </section>
  )
}
