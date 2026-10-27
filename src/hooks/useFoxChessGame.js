import { useCallback, useEffect, useRef, useState } from 'react'
import { FoxChess, pickFoxBotMove } from '../services/foxChessEngine'
import {
  getStoredAccessToken,
  loadTokenScopedState,
  saveTokenScopedState,
} from '../services/request'
import * as playApi from '../api/playApi'
import { STORAGE_KEYS } from '../utils/constants'

function createInitialFoxPracticeGame() {
  const engine = new FoxChess()
  const saved = loadTokenScopedState(STORAGE_KEYS.foxPracticeState)
  if (!saved) return engine

  if (Array.isArray(saved.history) && saved.history.length > 0) {
    let replayed = 0
    for (const m of saved.history) {
      if (m?.from && m?.to) {
        const res = engine.move({
          from: m.from,
          to: m.to,
          promotion: m.promotion || 'q',
        })
        if (res) replayed++
      }
    }
    if (replayed > 0) return engine
  }

  if (saved.fen && engine.load(saved.fen)) {
    if (saved.captured) {
      engine.captured = {
        w: [...(saved.captured.white || saved.captured.w || [])],
        b: [...(saved.captured.black || saved.captured.b || [])],
      }
    }
  }
  return engine
}

export function useFoxChessGame({
  playMode = 'bot', // 'bot' | 'pass'
  orientation = 'white',
  difficulty = 'medium',
  botDelayMs = 700,
} = {}) {
  const gameRef = useRef(null)
  if (!gameRef.current) {
    gameRef.current = createInitialFoxPracticeGame()
  }

  const botTimerRef = useRef(null)
  const dbGameIdRef = useRef(
    loadTokenScopedState(STORAGE_KEYS.foxPracticeState)?.dbGameId || null,
  )
  const creatingDbGameRef = useRef(null)
  const [resetKey, setResetKey] = useState(0)
  const [, setTick] = useState(0) // Force re-render on state mutation

  const recordPracticeMoveToDb = useCallback((moveObj, nextFen, isGameOver, result) => {
    if (!getStoredAccessToken() || !moveObj) return
    ;(async () => {
      try {
        let gameId = dbGameIdRef.current
        if (!gameId) {
          if (!creatingDbGameRef.current) {
            creatingDbGameRef.current = playApi
              .createGame({
                boardType: 'achess',
                variant: 'fox',
                fen: new FoxChess().fen(),
              })
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
            boardType: 'achess',
            variant: 'fox',
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
      const verboseHistory = game.history({ verbose: true }).map((m) => ({
        from: m.from,
        to: m.to,
        promotion: m.promotion,
        san: m.san,
        color: m.color,
        piece: m.piece,
        captured: m.captured,
      }))
      saveTokenScopedState(STORAGE_KEYS.foxPracticeState, {
        playMode: mode,
        orientation: orient,
        difficulty: diff,
        dbGameId: dbGameIdRef.current,
        fen: game.fen(),
        history: verboseHistory,
        captured: { white: game.captured.w, black: game.captured.b },
      })
    },
    [playMode, orientation, difficulty],
  )

  const sync = useCallback(() => {
    persistPracticeState()
    setTick((t) => t + 1)
  }, [persistPracticeState])

  useEffect(() => {
    persistPracticeState(playMode, orientation, difficulty)
  }, [playMode, orientation, difficulty, persistPracticeState])

  const scheduleBotMove = useCallback(
    (delay = botDelayMs) => {
      clearTimeout(botTimerRef.current)
      botTimerRef.current = setTimeout(() => {
        const game = gameRef.current
        if (game.isGameOver()) return

        const botMove = pickFoxBotMove(game, difficulty)
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
    [botDelayMs, difficulty, recordPracticeMoveToDb, sync],
  )

  const handleMove = useCallback(
    (sourceSquare, targetSquare, promotion = 'q') => {
      const game = gameRef.current
      if (game.isGameOver()) return false

      const executed = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion,
      })

      if (!executed) return false

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
      sync()

      // If playing against bot, bot responds if it's black's turn
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

    if (playMode === 'bot') {
      // Revert bot's move as well so player gets their turn back
      const history = game.history({ verbose: true })
      const botColor = orientation === 'white' ? 'b' : 'w'
      if (history.length > 0 && history[history.length - 1].color === botColor) {
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
    gameRef.current = new FoxChess()
    setResetKey((k) => k + 1)
    sync()

    // If bot plays white, it opens first
    if (playMode === 'bot' && orientation === 'black') {
      scheduleBotMove(botDelayMs)
    }
  }, [playMode, orientation, botDelayMs, scheduleBotMove, sync])

  // Bot moves whenever it is the bot's turn (opening as White or resuming after page refresh)
  const currentTurn = gameRef.current.turn()
  const historyLen = gameRef.current.history().length
  useEffect(() => {
    const botColor = orientation === 'white' ? 'b' : 'w'
    if (
      playMode === 'bot' &&
      !gameRef.current.isGameOver() &&
      currentTurn === botColor
    ) {
      scheduleBotMove(botDelayMs)
    }
  }, [playMode, orientation, currentTurn, historyLen, botDelayMs, scheduleBotMove])

  useEffect(() => {
    return () => clearTimeout(botTimerRef.current)
  }, [])

  const game = gameRef.current
  const history = game.history({ verbose: true })
  const status = game.getStatus()
  const isPlayerTurn = playMode === 'bot' ? game.turn() === orientation[0] : true

  return {
    game,
    history,
    captured: { white: game.captured.w, black: game.captured.b },
    status,
    turn: game.turn(),
    isGameOver: game.isGameOver(),
    isPlayerTurn,
    resetKey,
    makeMove: handleMove,
    undo,
    reset,
    canUndo: history.length > 0,
  }
}
