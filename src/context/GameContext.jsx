import { useCallback, useMemo, useState } from 'react'
import { GameContext } from './gameContext'

export function GameProvider({ children }) {
  const [playMode, setPlayMode] = useState('bot')
  const [orientation, setOrientation] = useState('white')
  const [newGameKey, setNewGameKey] = useState(0)

  const startNewGame = useCallback(() => {
    setNewGameKey((key) => key + 1)
  }, [])

  const value = useMemo(
    () => ({
      playMode,
      setPlayMode,
      orientation,
      setOrientation,
      newGameKey,
      startNewGame,
    }),
    [playMode, orientation, newGameKey, startNewGame],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
