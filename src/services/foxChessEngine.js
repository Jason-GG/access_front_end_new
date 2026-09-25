/**
 * Fox Chess Engine (10x10 Variant)
 *
 * Board dimensions: 10 ranks x 10 files (100 squares).
 * Files: a, b, c, α, d, e, β, f, g, h (indices 0 to 9)
 * Ranks: 1 to 10 (indices 0 to 9)
 *
 * Back rank lineup:
 * Rook, Knight, Bishop, Red-eared Fox (rf), Queen, King, Normal Fox (f), Bishop, Knight, Rook
 *
 * Fairy pieces:
 * - Red-eared Fox (rf): (3,1) leaper (Camel). Moves 3 squares + 1 turn. Jumps over pieces.
 * - Normal Fox (f): Half-length Queen slider. Moves in all 8 directions up to 5 squares maximum.
 */

export const FOX_FILES = ['a', 'b', 'c', 'α', 'd', 'e', 'β', 'f', 'g', 'h']
export const FOX_RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

export const FOX_PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  rf: 4, // Red-eared fox: agile 3,1 leaper
  r: 5,
  f: 7, // Normal fox: 5-step queen slider
  q: 9,
  k: 0,
}

export const FOX_PIECE_NAMES = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  rf: 'Red-eared Fox',
  r: 'Rook',
  f: 'Normal Fox',
  q: 'Queen',
  k: 'King',
}

export function parseSquare(square) {
  if (!square || typeof square !== 'string') return null
  const s = square.trim()

  for (let f = 0; f < FOX_FILES.length; f++) {
    const fileStr = FOX_FILES[f]
    if (s.startsWith(fileStr)) {
      const rankStr = s.slice(fileStr.length)
      const rankNum = parseInt(rankStr, 10)
      if (rankNum >= 1 && rankNum <= 10) {
        return { f, r: rankNum - 1 }
      }
    }
  }

  // Fallbacks for ascii input if someone types "alpha4" or "beta2"
  if (s.startsWith('alpha')) {
    const rankNum = parseInt(s.slice(5), 10)
    if (rankNum >= 1 && rankNum <= 10) return { f: 3, r: rankNum - 1 }
  }
  if (s.startsWith('beta')) {
    const rankNum = parseInt(s.slice(4), 10)
    if (rankNum >= 1 && rankNum <= 10) return { f: 6, r: rankNum - 1 }
  }

  return null
}

export function toSquare(f, r) {
  if (f < 0 || f >= 10 || r < 0 || r >= 10) return null
  return `${FOX_FILES[f]}${r + 1}`
}

export function createInitialBoard() {
  const board = Array.from({ length: 10 }, () => Array(10).fill(null))

  // Back rank order: Rook, Knight, Bishop, Red-eared Fox, Queen, King, Normal Fox, Bishop, Knight, Rook
  const backRankPieces = ['r', 'n', 'b', 'rf', 'q', 'k', 'f', 'b', 'n', 'r']

  // White pieces (Rank 1 & 2 -> indices 0 & 1)
  for (let f = 0; f < 10; f++) {
    board[0][f] = { type: backRankPieces[f], color: 'w' }
    board[1][f] = { type: 'p', color: 'w' }
  }

  // Black pieces (Rank 9 & 10 -> indices 8 & 9)
  for (let f = 0; f < 10; f++) {
    board[8][f] = { type: 'p', color: 'b' }
    board[9][f] = { type: backRankPieces[f], color: 'b' }
  }

  return board
}

export class FoxChess {
  constructor() {
    this.board = createInitialBoard()
    this.activeTurn = 'w'
    this.moveHistory = []
    this.captured = { w: [], b: [] } // pieces captured by white/black
    this.enPassantSquare = null // e.g. { f, r }
    this.castling = {
      w: { k: true, q: true },
      b: { k: true, q: true },
    }
    this.halfmoveClock = 0
    this.fullmoveNumber = 1
  }

  clone() {
    const copy = new FoxChess()
    copy.board = this.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
    copy.activeTurn = this.activeTurn
    copy.moveHistory = this.moveHistory.map((m) => ({ ...m }))
    copy.captured = { w: [...this.captured.w], b: [...this.captured.b] }
    copy.enPassantSquare = this.enPassantSquare ? { ...this.enPassantSquare } : null
    copy.castling = {
      w: { ...this.castling.w },
      b: { ...this.castling.b },
    }
    copy.halfmoveClock = this.halfmoveClock
    copy.fullmoveNumber = this.fullmoveNumber
    return copy
  }

  turn() {
    return this.activeTurn
  }

  getPiece(f, r) {
    if (typeof f === 'string') {
      const parsed = parseSquare(f)
      if (!parsed) return null
      f = parsed.f
      r = parsed.r
    }
    if (f < 0 || f >= 10 || r < 0 || r >= 10) return null
    return this.board[r][f]
  }

  // Returns all pseudo-legal moves for a piece at (f, r)
  getPseudoMoves(f, r) {
    const piece = this.board[r][f]
    if (!piece) return []

    const moves = []
    const color = piece.color
    const opponent = color === 'w' ? 'b' : 'w'

    const addMove = (toF, toR, flags = {}) => {
      const target = this.board[toR][toF]
      moves.push({
        from: toSquare(f, r),
        to: toSquare(toF, toR),
        fromCoords: { f, r },
        toCoords: { f: toF, r: toR },
        piece: piece.type,
        color,
        captured: target ? target.type : flags.enPassant ? 'p' : null,
        ...flags,
      })
    }

    // 1. Red-eared Fox (rf): (3,1) Leaper (Camel)
    if (piece.type === 'rf') {
      const leaps = [
        [3, 1], [3, -1], [-3, 1], [-3, -1],
        [1, 3], [1, -3], [-1, 3], [-1, -3],
      ]
      for (const [df, dr] of leaps) {
        const nf = f + df
        const nr = r + dr
        if (nf >= 0 && nf < 10 && nr >= 0 && nr < 10) {
          const dest = this.board[nr][nf]
          if (!dest || dest.color === opponent) {
            addMove(nf, nr)
          }
        }
      }
    }

    // 2. Normal Fox (f): Half-length Queen slider (up to 5 squares in all 8 directions)
    else if (piece.type === 'f') {
      const directions = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ]
      for (const [df, dr] of directions) {
        for (let step = 1; step <= 5; step++) {
          const nf = f + df * step
          const nr = r + dr * step
          if (nf < 0 || nf >= 10 || nr < 0 || nr >= 10) break
          const dest = this.board[nr][nf]
          if (!dest) {
            addMove(nf, nr)
          } else {
            if (dest.color === opponent) {
              addMove(nf, nr)
            }
            break // Obstacle encountered
          }
        }
      }
    }

    // 3. Knight (n): (2,1) Leaper
    else if (piece.type === 'n') {
      const jumps = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2],
      ]
      for (const [df, dr] of jumps) {
        const nf = f + df
        const nr = r + dr
        if (nf >= 0 && nf < 10 && nr >= 0 && nr < 10) {
          const dest = this.board[nr][nf]
          if (!dest || dest.color === opponent) {
            addMove(nf, nr)
          }
        }
      }
    }

    // 4. Bishop (b): Diagonal slider (unlimited steps)
    else if (piece.type === 'b') {
      const diagonals = [
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ]
      for (const [df, dr] of diagonals) {
        let step = 1
        while (true) {
          const nf = f + df * step
          const nr = r + dr * step
          if (nf < 0 || nf >= 10 || nr < 0 || nr >= 10) break
          const dest = this.board[nr][nf]
          if (!dest) {
            addMove(nf, nr)
          } else {
            if (dest.color === opponent) addMove(nf, nr)
            break
          }
          step++
        }
      }
    }

    // 5. Rook (r): Orthogonal slider (unlimited steps)
    else if (piece.type === 'r') {
      const orthogonal = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
      ]
      for (const [df, dr] of orthogonal) {
        let step = 1
        while (true) {
          const nf = f + df * step
          const nr = r + dr * step
          if (nf < 0 || nf >= 10 || nr < 0 || nr >= 10) break
          const dest = this.board[nr][nf]
          if (!dest) {
            addMove(nf, nr)
          } else {
            if (dest.color === opponent) addMove(nf, nr)
            break
          }
          step++
        }
      }
    }

    // 6. Queen (q): All 8 directions slider (unlimited steps)
    else if (piece.type === 'q') {
      const allDirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ]
      for (const [df, dr] of allDirs) {
        let step = 1
        while (true) {
          const nf = f + df * step
          const nr = r + dr * step
          if (nf < 0 || nf >= 10 || nr < 0 || nr >= 10) break
          const dest = this.board[nr][nf]
          if (!dest) {
            addMove(nf, nr)
          } else {
            if (dest.color === opponent) addMove(nf, nr)
            break
          }
          step++
        }
      }
    }

    // 7. Pawn (p)
    else if (piece.type === 'p') {
      const forward = color === 'w' ? 1 : -1
      const startRank = color === 'w' ? 1 : 8
      const promoRank = color === 'w' ? 9 : 0

      // Step forward 1
      const nextR = r + forward
      if (nextR >= 0 && nextR < 10 && !this.board[nextR][f]) {
        if (nextR === promoRank) {
          for (const promo of ['q', 'f', 'rf', 'r', 'b', 'n']) {
            addMove(f, nextR, { promotion: promo })
          }
        } else {
          addMove(f, nextR)
        }

        // Initial 2-step advance
        if (r === startRank) {
          const twoStepR = r + forward * 2
          if (!this.board[twoStepR][f]) {
            addMove(f, twoStepR, { isDoublePawn: true })
          }
        }
      }

      // Diagonal captures
      for (const df of [-1, 1]) {
        const nf = f + df
        const nr = r + forward
        if (nf >= 0 && nf < 10 && nr >= 0 && nr < 10) {
          const dest = this.board[nr][nf]
          if (dest && dest.color === opponent) {
            if (nr === promoRank) {
              for (const promo of ['q', 'f', 'rf', 'r', 'b', 'n']) {
                addMove(nf, nr, { promotion: promo })
              }
            } else {
              addMove(nf, nr)
            }
          } else if (
            this.enPassantSquare &&
            this.enPassantSquare.f === nf &&
            this.enPassantSquare.r === nr
          ) {
            // En passant
            addMove(nf, nr, { enPassant: true })
          }
        }
      }
    }

    // 8. King (k)
    else if (piece.type === 'k') {
      const kingDirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ]
      for (const [df, dr] of kingDirs) {
        const nf = f + df
        const nr = r + dr
        if (nf >= 0 && nf < 10 && nr >= 0 && nr < 10) {
          const dest = this.board[nr][nf]
          if (!dest || dest.color === opponent) {
            addMove(nf, nr)
          }
        }
      }

      // Castling on 10x10 board:
      // White King on e1 (f=5, r=0). Black King on e10 (f=5, r=9).
      const kRank = color === 'w' ? 0 : 9
      if (r === kRank && f === 5 && !this.isSquareAttacked(5, kRank, opponent)) {
        const cRights = this.castling[color]

        // Kingside castling with Rook on h (f=9):
        // Columns between King(5) and Rook(9): 6(β), 7(f), 8(g) must be empty
        if (cRights.k && this.board[kRank][9]?.type === 'r' && this.board[kRank][9]?.color === color) {
          if (!this.board[kRank][6] && !this.board[kRank][7] && !this.board[kRank][8]) {
            if (
              !this.isSquareAttacked(6, kRank, opponent) &&
              !this.isSquareAttacked(7, kRank, opponent)
            ) {
              addMove(7, kRank, { isCastle: 'k' })
            }
          }
        }

        // Queenside castling with Rook on a (f=0):
        // Columns between King(5) and Rook(0): 1(b), 2(c), 3(α), 4(d) must be empty
        if (cRights.q && this.board[kRank][0]?.type === 'r' && this.board[kRank][0]?.color === color) {
          if (
            !this.board[kRank][1] &&
            !this.board[kRank][2] &&
            !this.board[kRank][3] &&
            !this.board[kRank][4]
          ) {
            if (
              !this.isSquareAttacked(4, kRank, opponent) &&
              !this.isSquareAttacked(3, kRank, opponent)
            ) {
              addMove(3, kRank, { isCastle: 'q' })
            }
          }
        }
      }
    }

    return moves
  }

  isSquareAttacked(targetF, targetR, byColor) {
    // 1. Attacked by Knight?
    const knightJumps = [
      [2, 1], [2, -1], [-2, 1], [-2, -1],
      [1, 2], [1, -2], [-1, 2], [-1, -2],
    ]
    for (const [df, dr] of knightJumps) {
      const nf = targetF + df
      const nr = targetR + dr
      if (nf >= 0 && nf < 10 && nr >= 0 && nr < 10) {
        const p = this.board[nr][nf]
        if (p && p.color === byColor && p.type === 'n') return true
      }
    }

    // 2. Attacked by Red-eared Fox (rf)?
    const foxLeaps = [
      [3, 1], [3, -1], [-3, 1], [-3, -1],
      [1, 3], [1, -3], [-1, 3], [-1, -3],
    ]
    for (const [df, dr] of foxLeaps) {
      const nf = targetF + df
      const nr = targetR + dr
      if (nf >= 0 && nf < 10 && nr >= 0 && nr < 10) {
        const p = this.board[nr][nf]
        if (p && p.color === byColor && p.type === 'rf') return true
      }
    }

    // 3. Attacked by Pawn?
    // If byColor is White, Pawn attacks from (targetR - 1, targetF ± 1)
    // If byColor is Black, Pawn attacks from (targetR + 1, targetF ± 1)
    const pawnDir = byColor === 'w' ? -1 : 1
    const pR = targetR + pawnDir
    if (pR >= 0 && pR < 10) {
      for (const df of [-1, 1]) {
        const pF = targetF + df
        if (pF >= 0 && pF < 10) {
          const p = this.board[pR][pF]
          if (p && p.color === byColor && p.type === 'p') return true
        }
      }
    }

    // 4. Attacked by King?
    const kingDirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ]
    for (const [df, dr] of kingDirs) {
      const nf = targetF + df
      const nr = targetR + dr
      if (nf >= 0 && nf < 10 && nr >= 0 && nr < 10) {
        const p = this.board[nr][nf]
        if (p && p.color === byColor && p.type === 'k') return true
      }
    }

    // 5. Orthogonal rays: Rook, Queen, Normal Fox (f <= 5 steps)
    const orthDirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ]
    for (const [df, dr] of orthDirs) {
      let step = 1
      while (true) {
        const nf = targetF + df * step
        const nr = targetR + dr * step
        if (nf < 0 || nf >= 10 || nr < 0 || nr >= 10) break
        const p = this.board[nr][nf]
        if (p) {
          if (p.color === byColor) {
            if (p.type === 'r' || p.type === 'q') return true
            if (p.type === 'f' && step <= 5) return true
          }
          break
        }
        step++
      }
    }

    // 6. Diagonal rays: Bishop, Queen, Normal Fox (f <= 5 steps)
    const diagDirs = [
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ]
    for (const [df, dr] of diagDirs) {
      let step = 1
      while (true) {
        const nf = targetF + df * step
        const nr = targetR + dr * step
        if (nf < 0 || nf >= 10 || nr < 0 || nr >= 10) break
        const p = this.board[nr][nf]
        if (p) {
          if (p.color === byColor) {
            if (p.type === 'b' || p.type === 'q') return true
            if (p.type === 'f' && step <= 5) return true
          }
          break
        }
        step++
      }
    }

    return false
  }

  findKing(color) {
    for (let r = 0; r < 10; r++) {
      for (let f = 0; f < 10; f++) {
        const p = this.board[r][f]
        if (p && p.type === 'k' && p.color === color) {
          return { f, r }
        }
      }
    }
    return null
  }

  inCheck(color = this.activeTurn) {
    const king = this.findKing(color)
    if (!king) return false
    const opponent = color === 'w' ? 'b' : 'w'
    return this.isSquareAttacked(king.f, king.r, opponent)
  }

  // Legal moves: pseudo-moves filtered to ensure own King is not left in check
  moves({ square = null, verbose = true } = {}) {
    let sourceCoords = null
    if (square) {
      sourceCoords = parseSquare(square)
      if (!sourceCoords) return []
    }

    const candidateMoves = []
    if (sourceCoords) {
      const piece = this.board[sourceCoords.r][sourceCoords.f]
      if (piece && piece.color === this.activeTurn) {
        candidateMoves.push(...this.getPseudoMoves(sourceCoords.f, sourceCoords.r))
      }
    } else {
      for (let r = 0; r < 10; r++) {
        for (let f = 0; f < 10; f++) {
          const piece = this.board[r][f]
          if (piece && piece.color === this.activeTurn) {
            candidateMoves.push(...this.getPseudoMoves(f, r))
          }
        }
      }
    }

    const legal = []
    for (const m of candidateMoves) {
      // Simulate move
      const sim = this.clone()
      sim.applyRawMove(m)
      if (!sim.inCheck(this.activeTurn)) {
        legal.push(m)
      }
    }

    if (!verbose) {
      return legal.map((m) => `${m.from}-${m.to}`)
    }
    return legal
  }

  // Applies a move without turn validation (used in simulations)
  applyRawMove(m) {
    const { fromCoords, toCoords, piece, color, promotion, isCastle, enPassant } = m
    const f1 = fromCoords.f
    const r1 = fromCoords.r
    const f2 = toCoords.f
    const r2 = toCoords.r

    // Handle En passant pawn capture
    if (enPassant) {
      const capturedPawnRank = color === 'w' ? r2 - 1 : r2 + 1
      this.board[capturedPawnRank][f2] = null
    }

    // Move piece
    const movedPiece = {
      type: promotion || piece,
      color,
    }
    this.board[r1][f1] = null
    this.board[r2][f2] = movedPiece

    // Handle Castling Rook movements
    if (isCastle === 'k') {
      // Kingside: Rook moves from h(9) to f(7)
      const rook = this.board[r1][9]
      this.board[r1][9] = null
      this.board[r1][7] = rook
    } else if (isCastle === 'q') {
      // Queenside: Rook moves from a(0) to alpha(3)
      const rook = this.board[r1][0]
      this.board[r1][0] = null
      this.board[r1][3] = rook
    }
  }

  // Execute a verified legal move and update game state
  move(moveParam) {
    let from, to, promotion

    if (typeof moveParam === 'string') {
      const parts = moveParam.split('-')
      from = parts[0]
      to = parts[1]
    } else if (moveParam && typeof moveParam === 'object') {
      from = moveParam.from
      to = moveParam.to
      promotion = moveParam.promotion
    }

    if (!from || !to) return null

    const legalMoves = this.moves({ square: from, verbose: true })
    const matched = legalMoves.find((m) => {
      if (m.to !== to) return false
      if (m.promotion) {
        const targetPromo = promotion ? String(promotion).toLowerCase() : 'q'
        return m.promotion === targetPromo
      }
      return true
    })

    if (!matched) return null

    // Valid move - execute!
    const targetPiece = this.board[matched.toCoords.r][matched.toCoords.f]
    const opponent = this.activeTurn === 'w' ? 'b' : 'w'

    if (targetPiece) {
      this.captured[this.activeTurn].push(targetPiece.type)
    } else if (matched.enPassant) {
      this.captured[this.activeTurn].push('p')
    }

    // Apply movement
    this.applyRawMove(matched)

    // Update castling rights
    if (matched.piece === 'k') {
      this.castling[this.activeTurn].k = false
      this.castling[this.activeTurn].q = false
    } else if (matched.piece === 'r') {
      if (matched.fromCoords.f === 0) this.castling[this.activeTurn].q = false
      if (matched.fromCoords.f === 9) this.castling[this.activeTurn].k = false
    }

    // Update En Passant square
    if (matched.isDoublePawn) {
      const forward = this.activeTurn === 'w' ? 1 : -1
      this.enPassantSquare = { f: matched.fromCoords.f, r: matched.fromCoords.r + forward }
    } else {
      this.enPassantSquare = null
    }

    // Formulate Standard Algebraic Notation (SAN)
    const san = this.generateSan(matched)
    const executedMove = {
      ...matched,
      san,
      color: this.activeTurn,
    }
    this.moveHistory.push(executedMove)

    // Switch turns
    this.activeTurn = opponent
    if (this.activeTurn === 'w') {
      this.fullmoveNumber++
    }

    return executedMove
  }

  generateSan(m) {
    if (m.isCastle === 'k') return 'O-O'
    if (m.isCastle === 'q') return 'O-O-O'

    let pieceChar = ''
    if (m.piece === 'rf') pieceChar = 'RF'
    else if (m.piece === 'f') pieceChar = 'F'
    else if (m.piece === 'n') pieceChar = 'N'
    else if (m.piece === 'b') pieceChar = 'B'
    else if (m.piece === 'r') pieceChar = 'R'
    else if (m.piece === 'q') pieceChar = 'Q'
    else if (m.piece === 'k') pieceChar = 'K'

    const isCapture = Boolean(m.captured || m.enPassant)
    let san = ''

    if (m.piece === 'p') {
      if (isCapture) {
        san = `${FOX_FILES[m.fromCoords.f]}x${m.to}`
      } else {
        san = m.to
      }
      if (m.promotion) {
        san += `=${m.promotion.toUpperCase()}`
      }
    } else {
      san = `${pieceChar}${isCapture ? 'x' : ''}${m.to}`
    }

    // Check / Checkmate signs
    const sim = this.clone()
    sim.activeTurn = this.activeTurn === 'w' ? 'b' : 'w'
    if (sim.isCheckmate()) {
      san += '#'
    } else if (sim.inCheck(sim.activeTurn)) {
      san += '+'
    }

    return san
  }

  isCheckmate() {
    return this.inCheck(this.activeTurn) && this.moves().length === 0
  }

  isStalemate() {
    return !this.inCheck(this.activeTurn) && this.moves().length === 0
  }

  isGameOver() {
    return this.isCheckmate() || this.isStalemate()
  }

  getStatus() {
    if (this.isCheckmate()) {
      const winner = this.activeTurn === 'w' ? 'Black' : 'White'
      return { kind: 'checkmate', label: `Checkmate — ${winner} wins!` }
    }
    if (this.isStalemate()) {
      return { kind: 'draw', label: 'Draw by stalemate' }
    }
    if (this.inCheck(this.activeTurn)) {
      return { kind: 'check', label: 'Check' }
    }
    return { kind: 'playing', label: 'Playing' }
  }

  history({ verbose = true } = {}) {
    if (verbose) return this.moveHistory
    return this.moveHistory.map((m) => m.san)
  }

  undo() {
    if (this.moveHistory.length === 0) return null
    // Replay from initial state up to length - 1
    const previousHistory = [...this.moveHistory]
    previousHistory.pop()

    // Reset this instance
    this.board = createInitialBoard()
    this.activeTurn = 'w'
    this.moveHistory = []
    this.captured = { w: [], b: [] }
    this.enPassantSquare = null
    this.castling = {
      w: { k: true, q: true },
      b: { k: true, q: true },
    }
    this.halfmoveClock = 0
    this.fullmoveNumber = 1

    for (const m of previousHistory) {
      this.move({ from: m.from, to: m.to, promotion: m.promotion })
    }

    return true
  }
}

// Bot move selection with tactical priority (Checkmates > High-value Captures > Central control)
export function pickFoxBotMove(game) {
  const legalMoves = game.moves({ verbose: true })
  if (legalMoves.length === 0) return null

  // 1. Can we deliver checkmate immediately?
  for (const m of legalMoves) {
    const sim = game.clone()
    sim.applyRawMove(m)
    sim.activeTurn = game.activeTurn === 'w' ? 'b' : 'w'
    if (sim.isCheckmate()) {
      return m
    }
  }

  // 2. Score moves: prioritize captures with material difference
  const scored = legalMoves.map((m) => {
    let score = Math.random() * 0.5 // small randomness to avoid predictability

    if (m.captured) {
      const victimValue = FOX_PIECE_VALUES[m.captured] || 1
      const attackerValue = FOX_PIECE_VALUES[m.piece] || 1
      score += victimValue * 10 - attackerValue
    }

    // Bonus for developing foxes and minor pieces towards center
    const toCoords = m.toCoords
    const distCenter = Math.abs(toCoords.f - 4.5) + Math.abs(toCoords.r - 4.5)
    score += (9 - distCenter) * 0.2

    // Bonus for promotion
    if (m.promotion) {
      score += 8
    }

    return { move: m, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].move
}
