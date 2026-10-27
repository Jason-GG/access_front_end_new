import { useCallback, useEffect, useRef, useState } from 'react'
import { GAME, STORAGE_KEYS } from '../utils/constants'
import {
  createGame,
  getCapturedPieces,
  getGameStatus,
  makeMove,
  pickBotMove,
} from '../services/chessService'
import {
  getStoredAccessToken,
  loadTokenScopedState,
  saveTokenScopedState,
} from '../services/request'
import * as playApi from '../api/playApi'

function createInitialChessPracticeGame() {
  const game = createGame()
  const saved = loadTokenScopedState(STORAGE_KEYS.chessPracticeState)
  if (!saved) return game

  if (Array.isArray(saved.history) && saved.history.length > 0) {
    let replayed = 0
    for (const m of saved.history) {
      try {
        const res = m?.from && m?.to
          ? game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' })
          : m?.san
            ? game.move(m.san)
            : null
        if (res) replayed++
      } catch {
        // ignore invalid move
      }
    }
    if (replayed > 0) return game
  }

  if (saved.fen) {
    try {
      return createGame(saved.fen)
    } catch {
      return game
    }
  }

  return game
}

export function useChessGame({
  playMode = 'bot',
  orientation = 'white',
  difficulty = 'medium',
  resetKey = 0,
} = {}) {
  const gameRef = useRef(null)
  if (!gameRef.current) {
    gameRef.current = createInitialChessPracticeGame()
  }

  const botTimerRef = useRef(null)
  const dbGameIdRef = useRef(
    loadTokenScopedState(STORAGE_KEYS.chessPracticeState)?.dbGameId || null,
  )
  const creatingDbGameRef = useRef(null)
  const initialVerbose = gameRef.current.history({ verbose: true })
  const [fen, setFen] = useState(() => gameRef.current.fen())
  const [history, setHistory] = useState(() => initialVerbose)
  const [captured, setCaptured] = useState(() => getCapturedPieces(initialVerbose))
  const [status, setStatus] = useState(() => getGameStatus(gameRef.current))
  const [turn, setTurn] = useState(() => gameRef.current.turn())
  const [internalResetKey, setInternalResetKey] = useState(0)

  const recordPracticeMoveToDb = useCallback((moveObj, nextFen, isGameOver, result) => {
    if (!getStoredAccessToken() || !moveObj) return
    ;(async () => {
      try {
        let gameId = dbGameIdRef.current
        if (!gameId) {
          if (!creatingDbGameRef.current) {
            creatingDbGameRef.current = playApi
              .createGame({ boardType: 'chess' })
              .then((res) => res?.game?.id || res?.id || null)
              .catch(() => null)
          }
          gameId = await creatingDbGameRef.current
          creatingDbGameRef.current = null
          if (gameId) {
            dbGameIdRef.current = gameId
          }
        }
        if (gameId) {
          await playApi.makeGameMove(gameId, {
            boardType: 'chess',
            from: moveObj.from,
            to: moveObj.to,
            ...(moveObj.promotion ? { promotion: moveObj.promotion } : {}),
            san: moveObj.san,
            fen: nextFen,
            gameOver: isGameOver,
            ...(result ? { result } : {}),
          })
        }
      } catch {
        // Ignore background persistence errors in practice mode
      }
    })()
  }, [])

  const persistPracticeState = useCallback(
    (mode = playMode, orient = orientation, diff = difficulty) => {
      const game = gameRef.current
      if (!game) return
      const verbose = game.history({ verbose: true })
      saveTokenScopedState(STORAGE_KEYS.chessPracticeState, {
        playMode: mode,
        orientation: orient,
        difficulty: diff,
        dbGameId: dbGameIdRef.current,
        fen: game.fen(),
        history: verbose.map((m) => ({
          from: m.from,
          to: m.to,
          promotion: m.promotion,
          san: m.san,
          color: m.color,
          piece: m.piece,
          captured: m.captured,
        })),
      })
    },
    [playMode, orientation, difficulty],
  )

  const sync = useCallback(() => {
    const game = gameRef.current
    const verbose = game.history({ verbose: true })
    const nextFen = game.fen()
    setFen(nextFen)
    setHistory(verbose)
    setCaptured(getCapturedPieces(verbose))
    setStatus(getGameStatus(game))
    setTurn(game.turn())
    persistPracticeState()
  }, [persistPracticeState])

  useEffect(() => {
    persistPracticeState(playMode, orientation, difficulty)
  }, [playMode, orientation, difficulty, persistPracticeState])

  const scheduleBotMove = useCallback(
    (delay = GAME.botDelayMs) => {
      clearTimeout(botTimerRef.current)
      botTimerRef.current = setTimeout(() => {
        const game = gameRef.current
        if (game.isGameOver()) return
        const botMove = pickBotMove(game, difficulty)
        if (botMove) {
          const executed = game.move({
            from: botMove.from,
            to: botMove.to,
            promotion: botMove.promotion || 'q',
          })
          if (executed) {
            recordPracticeMoveToDb(
              executed,
              game.fen(),
              game.isGameOver(),
              game.isCheckmate()
                ? executed.color === 'w'
                  ? 'white_checkmate'
                  : 'black_checkmate'
                : game.isStalemate()
                  ? 'stalemate'
                  : null,
            )
          }
        }
        sync()
      }, delay)
    },
    [difficulty, recordPracticeMoveToDb, sync],
  )

  const handleMove = useCallback(
    (sourceSquare, targetSquare) => {
      const game = gameRef.current
      if (game.isGameOver()) return false

      const move = makeMove(game, sourceSquare, targetSquare)
      if (!move) return false

      recordPracticeMoveToDb(
        move,
        game.fen(),
        game.isGameOver(),
        game.isCheckmate()
          ? move.color === 'w'
            ? 'white_checkmate'
            : 'black_checkmate'
          : game.isStalemate()
            ? 'stalemate'
            : null,
      )
      sync()
      const botColor = orientation === 'white' ? 'b' : 'w'
      if (playMode === 'bot' && !game.isGameOver() && game.turn() === botColor) {
        scheduleBotMove()
      }
      return true
    },
    [playMode, orientation, recordPracticeMoveToDb, scheduleBotMove, sync],
  )

  const undo = useCallback(() => {
    const game = gameRef.current
    clearTimeout(botTimerRef.current)

    const verbose = game.history({ verbose: true })
    if (verbose.length === 0) return

    if (playMode === 'bot') {
      // If the bot answered, take its move back too so the player retries
      // from their own last move.
      const botColor = orientation === 'white' ? 'b' : 'w'
      if (verbose[verbose.length - 1].color === botColor) {
        game.undo()
      }
    }
    game.undo()
    sync()
  }, [playMode, orientation, sync])

  const reset = useCallback(() => {
    clearTimeout(botTimerRef.current)
    dbGameIdRef.current = null
    creatingDbGameRef.current = null
    gameRef.current = createGame()
    setInternalResetKey((k) => k + 1)
    sync()
    if (playMode === 'bot' && orientation === 'black') {
      scheduleBotMove(GAME.botDelayMs)
    }
  }, [playMode, orientation, scheduleBotMove, sync])

  // Reset when a new game is explicitly requested (from the button or GameContext).
  useEffect(() => {
    if (resetKey > 0) {
      reset()
    }
  }, [resetKey, reset])

  // Bot moves when it is the bot's turn (including on opening or after page refresh).
  useEffect(() => {
    const botColor = orientation === 'white' ? 'b' : 'w'
    if (playMode === 'bot' && !gameRef.current.isGameOver() && turn === botColor) {
      scheduleBotMove(GAME.botDelayMs)
    }
  }, [playMode, orientation, history.length, turn, scheduleBotMove])

  useEffect(() => () => clearTimeout(botTimerRef.current), [])

  return {
    fen,
    history,
    captured,
    status,
    turn,
    isGameOver: gameRef.current.isGameOver(),
    resetKey: internalResetKey,
    makeMove: handleMove,
    undo,
    reset,
    canUndo: history.length > 0,
    isPlayerTurn: playMode === 'bot' ? turn === orientation[0] : true,
  }
}
