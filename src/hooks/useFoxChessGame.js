import { useCallback, useEffect, useRef, useState } from 'react'
import { FoxChess, pickFoxBotMove } from '../services/foxChessEngine'
import { playMoveSound } from '../services/soundService'
import {
  getStoredAccessToken,
  loadTokenScopedState,
  saveTokenScopedState,
} from '../services/request'
import * as playApi from '../api/playApi'
import { GAME, STORAGE_KEYS, getBotThinkDelayMs } from '../utils/constants'

const DEFAULT_CLOCK_MS = GAME.defaultTimeSeconds * 1000

function createInitialFoxPracticeGame(saved) {
  const engine = new FoxChess()
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

function resolveInitialClocks(saved, isBoardGameOver) {
  const savedTimeout = saved?.timeoutLoser === 'w' || saved?.timeoutLoser === 'b' ? saved.timeoutLoser : null
  const rawW = saved?.clocks?.white
  const rawB = saved?.clocks?.black

  if (isBoardGameOver || savedTimeout) {
    return {
      white: typeof rawW === 'number' ? Math.max(0, rawW) : DEFAULT_CLOCK_MS,
      black: typeof rawB === 'number' ? Math.max(0, rawB) : DEFAULT_CLOCK_MS,
      timeoutLoser: savedTimeout,
    }
  }

  if (typeof rawW !== 'number' && typeof rawB !== 'number' && Array.isArray(saved?.history) && saved.history.length > 0) {
    let wMoves = 0
    let bMoves = 0
    saved.history.forEach((m, idx) => {
      const c = m?.color || (idx % 2 === 0 ? 'w' : 'b')
      if (c === 'w') wMoves += 1
      else bMoves += 1
    })
    return {
      white: Math.max(60_000, DEFAULT_CLOCK_MS - wMoves * 3500),
      black: Math.max(60_000, DEFAULT_CLOCK_MS - bMoves * 3000),
      timeoutLoser: null,
    }
  }

  return {
    white: typeof rawW === 'number' && rawW > 0 ? rawW : DEFAULT_CLOCK_MS,
    black: typeof rawB === 'number' && rawB > 0 ? rawB : DEFAULT_CLOCK_MS,
    timeoutLoser: null,
  }
}

export function useFoxChessGame({
  playMode = 'bot', // 'bot' | 'pass'
  orientation = 'white',
  difficulty = 'medium',
  botDelayMs,
} = {}) {
  const initialSavedRef = useRef(undefined)
  if (initialSavedRef.current === undefined) {
    initialSavedRef.current = loadTokenScopedState(STORAGE_KEYS.foxPracticeState)
  }

  const gameRef = useRef(null)
  if (!gameRef.current) {
    gameRef.current = createInitialFoxPracticeGame(initialSavedRef.current)
  }

  const initClockData = resolveInitialClocks(
    initialSavedRef.current,
    gameRef.current.isGameOver(),
  )

  const botTimerRef = useRef(null)
  const dbGameIdRef = useRef(initialSavedRef.current?.dbGameId || null)
  const creatingDbGameRef = useRef(null)

  const timeoutLoserRef = useRef(initClockData.timeoutLoser)
  const [timeoutLoser, setTimeoutLoser] = useState(initClockData.timeoutLoser)

  const clockStateRef = useRef({
    white: initClockData.white,
    black: initClockData.black,
    activeTurn: gameRef.current.turn(),
    lastTickAt:
      gameRef.current.isGameOver() || initClockData.timeoutLoser ? null : Date.now(),
  })
  const [displayClocks, setDisplayClocks] = useState(() => ({
    white: initClockData.white,
    black: initClockData.black,
  }))

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
      const st = clockStateRef.current
      saveTokenScopedState(STORAGE_KEYS.foxPracticeState, {
        playMode: mode,
        orientation: orient,
        difficulty: diff,
        dbGameId: dbGameIdRef.current,
        fen: game.fen(),
        clocks: { white: st.white, black: st.black },
        timeoutLoser: timeoutLoserRef.current,
        history: verboseHistory,
        captured: { white: game.captured.w, black: game.captured.b },
      })
    },
    [playMode, orientation, difficulty],
  )

  const advanceClockToNow = useCallback(
    (nextTurnOverride) => {
      const now = Date.now()
      const st = clockStateRef.current
      const game = gameRef.current
      const alreadyOver = game.isGameOver() || Boolean(timeoutLoserRef.current)

      if (!alreadyOver && st.lastTickAt != null) {
        const elapsed = Math.max(0, now - st.lastTickAt)
        if (elapsed > 0) {
          if (st.activeTurn === 'w') {
            st.white = Math.max(0, st.white - elapsed)
          } else {
            st.black = Math.max(0, st.black - elapsed)
          }
        }
      }

      if (nextTurnOverride) {
        st.activeTurn = nextTurnOverride
      }

      if (!alreadyOver && (st.white <= 0 || st.black <= 0)) {
        const loser = st.white <= 0 ? 'w' : 'b'
        timeoutLoserRef.current = loser
        st.lastTickAt = null
        clearTimeout(botTimerRef.current)
        setTimeoutLoser(loser)
        setDisplayClocks({ white: st.white, black: st.black })
        persistPracticeState()
        return
      }

      st.lastTickAt = game.isGameOver() || timeoutLoserRef.current ? null : now
      setDisplayClocks({ white: st.white, black: st.black })
    },
    [persistPracticeState],
  )

  const sync = useCallback(() => {
    const game = gameRef.current
    advanceClockToNow(game.turn())
    persistPracticeState()
    setTick((t) => t + 1)
  }, [advanceClockToNow, persistPracticeState])

  useEffect(() => {
    persistPracticeState(playMode, orientation, difficulty)
  }, [playMode, orientation, difficulty, persistPracticeState])

  const currentTurn = gameRef.current.turn()
  const historyLen = gameRef.current.history().length
  const isGameOver = gameRef.current.isGameOver() || Boolean(timeoutLoser)

  // Continuous 100ms live clock ticker for both Player and Computer turns
  useEffect(() => {
    if (isGameOver) {
      clockStateRef.current.lastTickAt = null
      return undefined
    }
    clockStateRef.current.activeTurn = currentTurn
    if (clockStateRef.current.lastTickAt == null) {
      clockStateRef.current.lastTickAt = Date.now()
    }

    let ticks = 0
    const id = setInterval(() => {
      advanceClockToNow()
      ticks += 1
      if (ticks % 20 === 0) {
        persistPracticeState()
      }
    }, 100)

    return () => {
      clearInterval(id)
      advanceClockToNow()
      persistPracticeState()
    }
  }, [isGameOver, currentTurn, advanceClockToNow, persistPracticeState])

  const scheduleBotMove = useCallback(
    (explicitDelay) => {
      clearTimeout(botTimerRef.current)
      const delay =
        typeof explicitDelay === 'number'
          ? explicitDelay
          : typeof botDelayMs === 'number'
            ? botDelayMs
            : getBotThinkDelayMs(difficulty)

      botTimerRef.current = setTimeout(() => {
        const game = gameRef.current
        if (game.isGameOver() || timeoutLoserRef.current) return
        advanceClockToNow()
        if (timeoutLoserRef.current) return

        const botMove = pickFoxBotMove(game, difficulty)
        if (botMove) {
          const executed = game.move({
            from: botMove.from,
            to: botMove.to,
            promotion: botMove.promotion || 'q',
          })
          if (executed) {
            playMoveSound(executed, {
              inCheck: game.inCheck(),
              isCheckmate: game.isCheckmate(),
              isStalemate: game.isStalemate(),
              isGameOver: game.isGameOver(),
            })
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
    [botDelayMs, difficulty, advanceClockToNow, recordPracticeMoveToDb, sync],
  )

  const handleMove = useCallback(
    (sourceSquare, targetSquare, promotion = 'q') => {
      const game = gameRef.current
      if (game.isGameOver() || timeoutLoserRef.current) return false

      const executed = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion,
      })

      if (!executed) return false

      playMoveSound(executed, {
        inCheck: game.inCheck(),
        isCheckmate: game.isCheckmate(),
        isStalemate: game.isStalemate(),
        isGameOver: game.isGameOver(),
      })

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
      return true
    },
    [recordPracticeMoveToDb, sync],
  )

  const undo = useCallback(() => {
    const game = gameRef.current
    clearTimeout(botTimerRef.current)
    if (timeoutLoserRef.current) return

    if (playMode === 'bot') {
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
    timeoutLoserRef.current = null
    setTimeoutLoser(null)
    gameRef.current = new FoxChess()
    clockStateRef.current = {
      white: DEFAULT_CLOCK_MS,
      black: DEFAULT_CLOCK_MS,
      activeTurn: 'w',
      lastTickAt: Date.now(),
    }
    setDisplayClocks({ white: DEFAULT_CLOCK_MS, black: DEFAULT_CLOCK_MS })
    setResetKey((k) => k + 1)
    sync()
  }, [sync])

  // Bot moves whenever it is the bot's turn (opening as White, answering Player, or after refresh)
  useEffect(() => {
    const botColor = orientation === 'white' ? 'b' : 'w'
    if (playMode === 'bot' && !isGameOver && currentTurn === botColor) {
      scheduleBotMove()
    }
    return () => clearTimeout(botTimerRef.current)
  }, [playMode, orientation, currentTurn, historyLen, isGameOver, scheduleBotMove])

  const game = gameRef.current
  const history = game.history({ verbose: true })
  const boardStatus = game.getStatus()
  const status = timeoutLoser
    ? {
        kind: 'timeout',
        winner: timeoutLoser === 'w' ? 'black' : 'white',
        label:
          timeoutLoser === 'w'
            ? 'White ran out of time — Black wins'
            : 'Black ran out of time — White wins',
      }
    : boardStatus
  const isPlayerTurn = playMode === 'bot' ? game.turn() === orientation[0] : true

  return {
    game,
    history,
    captured: { white: game.captured.w, black: game.captured.b },
    status,
    turn: game.turn(),
    displayClocks,
    isGameOver,
    isPlayerTurn,
    resetKey,
    makeMove: handleMove,
    undo,
    reset,
    canUndo:
      !isGameOver &&
      (playMode === 'bot'
        ? history.some((m) => m.color === orientation[0])
        : history.length > 0),
  }
}
