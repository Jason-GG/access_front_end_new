import { Chess } from 'chess.js'
import { randomItem } from '../utils/helpers'

const START_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1 }
const DRAW_RESULTS = new Set([
  'stalemate',
  'insufficient_material',
  'fifty_move_rule',
  'threefold_repetition',
  'agreed_draw',
])

const RESULT_LABELS = {
  white_checkmate: 'White wins by checkmate',
  black_checkmate: 'Black wins by checkmate',
  white_resigned: 'White resigned — Black wins',
  black_resigned: 'Black resigned — White wins',
  white_timeout: 'White ran out of time — Black wins',
  black_timeout: 'Black ran out of time — White wins',
  stalemate: 'Draw by stalemate',
  insufficient_material: 'Draw — insufficient material',
  fifty_move_rule: 'Draw by the fifty-move rule',
  threefold_repetition: 'Draw by repetition',
  agreed_draw: 'Draw by agreement',
  aborted: 'Game aborted',
}

export function createGame() {
  return new Chess()
}

export function describeResult(result) {
  if (!result) return 'Game over'
  return RESULT_LABELS[result] || result
}

export function isDrawResult(result) {
  return DRAW_RESULTS.has(result)
}

export function getCapturedFromFen(fen) {
  const captured = { white: [], black: [] }
  if (!fen) return captured

  const board = fen.split(' ')[0]
  const counts = { w: {}, b: {} }
  for (const char of board) {
    if (/[a-zA-Z]/.test(char)) {
      const color = char === char.toUpperCase() ? 'w' : 'b'
      const type = char.toLowerCase()
      counts[color][type] = (counts[color][type] || 0) + 1
    }
  }

  for (const [type, total] of Object.entries(START_COUNTS)) {
    const missingBlack = total - (counts.b[type] || 0)
    const missingWhite = total - (counts.w[type] || 0)
    for (let i = 0; i < missingBlack; i += 1) captured.white.push(type)
    for (let i = 0; i < missingWhite; i += 1) captured.black.push(type)
  }

  return captured
}

export function buildHistoryFromMoves(rawMoves = []) {
  const game = new Chess()
  const history = []

  for (const raw of rawMoves) {
    const move = raw?.move ?? raw
    let applied = null
    try {
      if (typeof move === 'string') {
        applied = game.move(move)
      } else if (move?.from && move?.to) {
        applied = game.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' })
      } else if (move?.san) {
        applied = game.move(move.san)
      }
    } catch {
      applied = null
    }
    history.push(applied || move)
  }

  return { history, fen: game.fen() }
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
      captured[move.color === 'w' ? 'white' : 'black'].push(move.captured)
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
