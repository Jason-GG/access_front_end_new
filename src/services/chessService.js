import { Chess } from 'chess.js'
import { randomItem } from '../utils/helpers'

export function createGame() {
  return new Chess()
}

export function makeMove(game, from, to, promotion = 'q') {
  try {
    return game.move({ from, to, promotion })
  } catch {
    return null
  }
}

export function getGameStatus(game) {
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White'
    return { kind: 'checkmate', label: `Checkmate — ${winner} wins` }
  }
  if (game.isStalemate()) {
    return { kind: 'draw', label: 'Draw by stalemate' }
  }
  if (game.isThreefoldRepetition()) {
    return { kind: 'draw', label: 'Draw by repetition' }
  }
  if (game.isInsufficientMaterial()) {
    return { kind: 'draw', label: 'Draw — insufficient material' }
  }
  if (game.isDraw()) {
    return { kind: 'draw', label: 'Draw' }
  }
  if (game.isCheck()) {
    return { kind: 'check', label: 'Check' }
  }
  return { kind: 'playing', label: 'Playing' }
}

export function getCapturedPieces(history) {
  const captured = { white: [], black: [] }
  for (const move of history) {
    if (move.captured) {
      captured[move.color].push(move.captured)
    }
  }
  return captured
}

export function getMovePairings(history) {
  const pairs = []
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([history[i], history[i + 1] || null])
  }
  return pairs
}

// A humble clubhouse opponent: prefers a capture when one exists,
// otherwise plays a random legal move.
export function pickBotMove(game) {
  const moves = game.moves({ verbose: true })
  if (moves.length === 0) return null
  const captures = moves.filter((move) => move.captured)
  return randomItem(captures.length > 0 ? captures : moves)
}
