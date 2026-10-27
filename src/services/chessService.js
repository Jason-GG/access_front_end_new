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

export function createGame(fen) {
  if (fen) {
    try {
      return new Chess(fen)
    } catch {
      return new Chess()
    }
  }
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

export function buildHistoryFromMoves(rawMoves = [], initialFen) {
  let game
  try {
    game = initialFen ? new Chess(initialFen) : new Chess()
  } catch {
    game = new Chess()
  }
  const history = []
  let lastValidFen = game.fen()

  for (const raw of rawMoves) {
    const move = raw?.move?.move ?? raw?.move ?? raw
    let applied = null
    try {
      if (typeof move === 'string') {
        applied = game.move(move)
      } else if (move?.from && move?.to) {
        try {
          applied = game.move(
            move.promotion
              ? { from: move.from, to: move.to, promotion: move.promotion }
              : { from: move.from, to: move.to },
          )
        } catch {
          applied = game.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' })
        }
      } else if (move?.san) {
        applied = game.move(move.san)
      }
      if (applied) {
        lastValidFen = game.fen()
      }
    } catch {
      applied = null
    }
    const fallbackFen =
      raw?.fen ||
      raw?.clientState?.fen ||
      raw?.client_state?.fen ||
      move?.fen
    if (!applied && fallbackFen) {
      try {
        game = new Chess(fallbackFen)
        lastValidFen = game.fen()
      } catch {
        lastValidFen = fallbackFen
      }
    }
    if (applied || move) {
      history.push(applied || move)
    }
  }

  return { history, fen: lastValidFen }
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

// Computer AI opponent supporting Easy, Medium, and Hard difficulty levels
// using material values, piece-square positional tables, and minimax with alpha-beta pruning.
const AI_PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

const PST_PAWN = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
]

const PST_KNIGHT = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
]

const PST_BISHOP = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
]

const PST_ROOK = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
]

const PST_QUEEN = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
]

const PST_KING = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
]

const PST_TABLES = {
  p: PST_PAWN,
  n: PST_KNIGHT,
  b: PST_BISHOP,
  r: PST_ROOK,
  q: PST_QUEEN,
  k: PST_KING,
}

function evaluateBoard(game, perspectiveColor) {
  if (game.isCheckmate()) {
    return game.turn() === perspectiveColor ? -99999 : 99999
  }
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
    return 0
  }

  const board = game.board()
  let score = 0

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (!piece) continue
      const base = AI_PIECE_VALUES[piece.type] || 0
      const table = PST_TABLES[piece.type]
      const tableRow = piece.color === 'w' ? r : 7 - r
      const positional = table ? table[tableRow][c] : 0
      const total = base + positional
      if (piece.color === perspectiveColor) {
        score += total
      } else {
        score -= total
      }
    }
  }

  if (game.inCheck()) {
    score += game.turn() === perspectiveColor ? -35 : 35
  }

  return score
}

function orderMoves(moves) {
  return [...moves].sort((a, b) => {
    const scoreMove = (m) => {
      let s = 0
      if (m.captured) {
        s += 10 * (AI_PIECE_VALUES[m.captured] || 100) - (AI_PIECE_VALUES[m.piece] || 100) / 10
      }
      if (m.promotion) s += 800
      if (m.san && (m.san.includes('+') || m.san.includes('#'))) s += 150
      return s
    }
    return scoreMove(b) - scoreMove(a)
  })
}

function minimax(game, depth, alpha, beta, maximizingPlayer, perspectiveColor) {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game, perspectiveColor)
  }

  const legalMoves = orderMoves(game.moves({ verbose: true }))
  if (legalMoves.length === 0) {
    return evaluateBoard(game, perspectiveColor)
  }

  if (maximizingPlayer) {
    let maxEval = -Infinity
    for (const move of legalMoves) {
      game.move(move)
      const evaluation = minimax(game, depth - 1, alpha, beta, false, perspectiveColor)
      game.undo()
      if (evaluation > maxEval) maxEval = evaluation
      if (evaluation > alpha) alpha = evaluation
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of legalMoves) {
      game.move(move)
      const evaluation = minimax(game, depth - 1, alpha, beta, true, perspectiveColor)
      game.undo()
      if (evaluation < minEval) minEval = evaluation
      if (evaluation < beta) beta = evaluation
      if (beta <= alpha) break
    }
    return minEval
  }
}

export function pickBotMove(game, difficulty = 'medium') {
  const moves = game.moves({ verbose: true })
  if (moves.length === 0) return null

  const botColor = game.turn()

  // Easy: mostly opportunistic captures with high randomness
  if (difficulty === 'easy') {
    for (const m of moves) {
      if (m.san && m.san.includes('#')) return m
    }
    const captures = moves.filter((move) => move.captured)
    if (captures.length > 0 && Math.random() < 0.65) {
      return randomItem(captures)
    }
    return randomItem(moves)
  }

  // Medium (depth 2) or Hard (depth 3) with alpha-beta pruning
  const searchDepth = difficulty === 'hard' ? 3 : 2
  const jitter = difficulty === 'hard' ? 8 : 30
  const ordered = orderMoves(moves)

  let bestMove = ordered[0]
  let bestScore = -Infinity

  for (const move of ordered) {
    game.move(move)
    if (game.isCheckmate()) {
      game.undo()
      return move
    }
    const baseScore = minimax(game, searchDepth - 1, -Infinity, Infinity, false, botColor)
    game.undo()

    const noisyScore = baseScore + (Math.random() - 0.5) * jitter
    if (noisyScore > bestScore) {
      bestScore = noisyScore
      bestMove = move
    }
  }

  return bestMove
}
