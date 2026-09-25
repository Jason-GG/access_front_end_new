import { useCallback, useEffect, useRef, useState } from 'react'
import { FoxChess, pickFoxBotMove } from '../services/foxChessEngine'

export function useFoxChessGame({
  playMode = 'bot', // 'bot' | 'pass'
  orientation = 'white',
  botDelayMs = 700,
} = {}) {
  const gameRef = useRef(null)
  if (!gameRef.current) {
    gameRef.current = new FoxChess()
  }

  const botTimerRef = useRef(null)
  const [, setTick] = useState(0) // Force re-render on state mutation

  const sync = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  const scheduleBotMove = useCallback(
    (delay = botDelayMs) => {
      clearTimeout(botTimerRef.current)
      botTimerRef.current = setTimeout(() => {
        const game = gameRef.current
        if (game.isGameOver()) return

        const botMove = pickFoxBotMove(game)
        if (botMove) {
          game.move({
            from: botMove.from,
            to: botMove.to,
            promotion: botMove.promotion || 'q',
          })
        }
        sync()
      }, delay)
    },
    [botDelayMs, sync],
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

      sync()

      // If playing against bot, bot responds if it's black's turn
      const botColor = orientation === 'white' ? 'b' : 'w'
      if (playMode === 'bot' && !game.isGameOver() && game.turn() === botColor) {
        scheduleBotMove()
      }

      return true
    },
    [playMode, orientation, scheduleBotMove, sync],
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
    gameRef.current = new FoxChess()
    sync()

    // If bot plays white, it opens first
    if (playMode === 'bot' && orientation === 'black') {
      scheduleBotMove(botDelayMs)
    }
  }, [playMode, orientation, botDelayMs, scheduleBotMove, sync])

  // Bot plays first if player chooses black
  useEffect(() => {
    if (
      playMode === 'bot' &&
      orientation === 'black' &&
      gameRef.current.history().length === 0 &&
      gameRef.current.turn() === 'w'
    ) {
      scheduleBotMove(botDelayMs)
    }
  }, [playMode, orientation, botDelayMs, scheduleBotMove])

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
    makeMove: handleMove,
    undo,
    reset,
    canUndo: history.length > 0,
  }
}
