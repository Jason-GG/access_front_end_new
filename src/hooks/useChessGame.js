import { useCallback, useEffect, useRef, useState } from 'react'
import { GAME, STORAGE_KEYS, getBotThinkDelayMs } from '../utils/constants'
import {
  createGame,
  getCapturedPieces,
  getGameStatus,
  makeMove,
  pickBotMove,
} from '../services/chessService'
import { playMoveSound } from '../services/soundService'
import {
  getStoredAccessToken,
  loadTokenScopedState,
  saveTokenScopedState,
} from '../services/request'
import * as playApi from '../api/playApi'

const DEFAULT_CLOCK_MS = GAME.defaultTimeSeconds * 1000

function createInitialChessPracticeGame(saved) {
  const game = createGame()
  if (!saved) return game

  if (Array.isArray(saved.history) && saved.history.length > 0) {
    let replayed = 0
    for (const m of saved.history) {
      try {
        const res =
          m?.from && m?.to
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

  return {
    white: typeof rawW === 'number' && rawW > 0 ? rawW : DEFAULT_CLOCK_MS,
    black: typeof rawB === 'number' && rawB > 0 ? rawB : DEFAULT_CLOCK_MS,
    timeoutLoser: null,
  }
}

export function useChessGame({
  playMode = 'bot',
  orientation = 'white',
  difficulty = 'medium',
  resetKey = 0,
} = {}) {
  const initialSavedRef = useRef(undefined)
  if (initialSavedRef.current === undefined) {
    initialSavedRef.current = loadTokenScopedState(STORAGE_KEYS.chessPracticeState)
  }

  const gameRef = useRef(null)
  if (!gameRef.current) {
    gameRef.current = createInitialChessPracticeGame(initialSavedRef.current)
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

  const initialVerbose = gameRef.current.history({ verbose: true })
  const [fen, setFen] = useState(() => gameRef.current.fen())
  const [history, setHistory] = useState(() => initialVerbose)
  const [captured, setCaptured] = useState(() => getCapturedPieces(initialVerbose))
  const [boardStatus, setBoardStatus] = useState(() => getGameStatus(gameRef.current))
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
      const st = clockStateRef.current
      saveTokenScopedState(STORAGE_KEYS.chessPracticeState, {
        playMode: mode,
        orientation: orient,
        difficulty: diff,
        dbGameId: dbGameIdRef.current,
        fen: game.fen(),
        clocks: { white: st.white, black: st.black },
        timeoutLoser: timeoutLoserRef.current,
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
    const nextTurn = game.turn()
    advanceClockToNow(nextTurn)
    const verbose = game.history({ verbose: true })
    const nextFen = game.fen()
    setFen(nextFen)
    setHistory(verbose)
    setCaptured(getCapturedPieces(verbose))
    setBoardStatus(getGameStatus(game))
    setTurn(nextTurn)
    persistPracticeState()
  }, [advanceClockToNow, persistPracticeState])

  useEffect(() => {
    persistPracticeState(playMode, orientation, difficulty)
  }, [playMode, orientation, difficulty, persistPracticeState])

  // Continuous 100ms live clock ticker for both Player and Computer turns
  const isGameOver = gameRef.current.isGameOver() || Boolean(timeoutLoser)
  useEffect(() => {
    if (isGameOver) {
      clockStateRef.current.lastTickAt = null
      return undefined
    }
    clockStateRef.current.activeTurn = turn
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
  }, [isGameOver, turn, advanceClockToNow, persistPracticeState])

  const scheduleBotMove = useCallback(
    (explicitDelay) => {
      clearTimeout(botTimerRef.current)
      const delay =
        typeof explicitDelay === 'number' ? explicitDelay : getBotThinkDelayMs(difficulty)
      botTimerRef.current = setTimeout(() => {
        const game = gameRef.current
        if (game.isGameOver() || timeoutLoserRef.current) return
        advanceClockToNow()
        if (timeoutLoserRef.current) return

        const botMove = pickBotMove(game, difficulty)
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
    [difficulty, advanceClockToNow, recordPracticeMoveToDb, sync],
  )

  const handleMove = useCallback(
    (sourceSquare, targetSquare) => {
      const game = gameRef.current
      if (game.isGameOver() || timeoutLoserRef.current) return false

      const move = makeMove(game, sourceSquare, targetSquare)
      if (!move) return false

      playMoveSound(move, {
        inCheck: game.inCheck(),
        isCheckmate: game.isCheckmate(),
        isStalemate: game.isStalemate(),
        isGameOver: game.isGameOver(),
      })

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
      return true
    },
    [recordPracticeMoveToDb, sync],
  )

  const undo = useCallback(() => {
    const game = gameRef.current
    clearTimeout(botTimerRef.current)
    if (timeoutLoserRef.current) return

    const verbose = game.history({ verbose: true })
    if (verbose.length === 0) return

    if (playMode === 'bot') {
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
    timeoutLoserRef.current = null
    setTimeoutLoser(null)
    gameRef.current = createGame()
    clockStateRef.current = {
      white: DEFAULT_CLOCK_MS,
      black: DEFAULT_CLOCK_MS,
      activeTurn: 'w',
      lastTickAt: Date.now(),
    }
    setDisplayClocks({ white: DEFAULT_CLOCK_MS, black: DEFAULT_CLOCK_MS })
    setInternalResetKey((k) => k + 1)
    sync()
  }, [sync])

  useEffect(() => {
    if (resetKey > 0) {
      reset()
    }
  }, [resetKey, reset])

  // Bot moves whenever it is the bot's turn (opening as White, answering Player, or after refresh).
  useEffect(() => {
    const botColor = orientation === 'white' ? 'b' : 'w'
    if (playMode === 'bot' && !isGameOver && turn === botColor) {
      scheduleBotMove()
    }
    return () => clearTimeout(botTimerRef.current)
  }, [playMode, orientation, history.length, turn, isGameOver, scheduleBotMove])

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

  return {
    fen,
    history,
    captured,
    status,
    turn,
    displayClocks,
    isGameOver,
    resetKey: internalResetKey,
    makeMove: handleMove,
    undo,
    reset,
    canUndo:
      !isGameOver &&
      (playMode === 'bot'
        ? history.some((m) => m.color === orientation[0])
        : history.length > 0),
    isPlayerTurn: playMode === 'bot' ? turn === orientation[0] : true,
  }
}
