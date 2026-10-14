import { useCallback, useEffect, useRef, useState } from 'react'
import { GAME, STORAGE_KEYS } from '../utils/constants'
import {
  createGame,
  getCapturedPieces,
  getGameStatus,
  makeMove,
  pickBotMove,
} from '../services/chessService'
import { loadTokenScopedState, saveTokenScopedState } from '../services/request'

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

export function useChessGame({ playMode = 'bot', orientation = 'white', resetKey = 0 } = {}) {
  const gameRef = useRef(null)
  if (!gameRef.current) {
    gameRef.current = createInitialChessPracticeGame()
  }

  const botTimerRef = useRef(null)
  const initialVerbose = gameRef.current.history({ verbose: true })
  const [fen, setFen] = useState(() => gameRef.current.fen())
  const [history, setHistory] = useState(() => initialVerbose)
  const [captured, setCaptured] = useState(() => getCapturedPieces(initialVerbose))
  const [status, setStatus] = useState(() => getGameStatus(gameRef.current))
  const [turn, setTurn] = useState(() => gameRef.current.turn())

  const sync = useCallback(() => {
    const game = gameRef.current
    const verbose = game.history({ verbose: true })
    const nextFen = game.fen()
    setFen(nextFen)
    setHistory(verbose)
    setCaptured(getCapturedPieces(verbose))
    setStatus(getGameStatus(game))
    setTurn(game.turn())
    saveTokenScopedState(STORAGE_KEYS.chessPracticeState, {
      fen: nextFen,
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
  }, [])

  const scheduleBotMove = useCallback(
    (delay = GAME.botDelayMs) => {
      clearTimeout(botTimerRef.current)
      botTimerRef.current = setTimeout(() => {
        const botMove = pickBotMove(gameRef.current)
        if (botMove) {
          gameRef.current.move({
            from: botMove.from,
            to: botMove.to,
            promotion: botMove.promotion || 'q',
          })
        }
        sync()
      }, delay)
    },
    [sync],
  )

  const handleMove = useCallback(
    (sourceSquare, targetSquare) => {
      const game = gameRef.current
      if (game.isGameOver()) return false

      const move = makeMove(game, sourceSquare, targetSquare)
      if (!move) return false

      sync()
      if (playMode === 'bot' && !game.isGameOver() && game.turn() === 'b') {
        scheduleBotMove()
      }
      return true
    },
    [playMode, scheduleBotMove, sync],
  )

  const undo = useCallback(() => {
    const game = gameRef.current
    clearTimeout(botTimerRef.current)

    const verbose = game.history({ verbose: true })
    if (verbose.length === 0) return

    if (playMode === 'bot') {
      // If the bot answered, take its move back too so the player retries
      // from their own last move.
      if (verbose[verbose.length - 1].color === 'b') {
        game.undo()
      }
    }
    game.undo()
    sync()
  }, [playMode, sync])

  const reset = useCallback(() => {
    clearTimeout(botTimerRef.current)
    gameRef.current = createGame()
    sync()
  }, [sync])

  // Reset when a new game is explicitly requested (from the button or GameContext).
  useEffect(() => {
    if (resetKey > 0) {
      reset()
    }
  }, [resetKey, reset])

  // Bot opens when the player chooses black.
  useEffect(() => {
    if (playMode === 'bot' && orientation === 'black' && history.length === 0 && turn === 'w') {
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
    makeMove: handleMove,
    undo,
    reset,
    canUndo: history.length > 0,
    isPlayerTurn: playMode === 'bot' ? turn === orientation[0] : true,
  }
}
