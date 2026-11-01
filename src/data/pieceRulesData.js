export const FILES_10 = ['a', 'b', 'c', 'α', 'd', 'e', 'β', 'f', 'g', 'h']
export const FILES_8 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

export const STARTING_LINEUP_10 = [
  { file: 'a', code: 'wR', pieceId: 'r', name: 'Rook', role: 'Corner fortress & open-file slider' },
  { file: 'b', code: 'wN', pieceId: 'n', name: 'Knight', role: '(2,1) L-leaper over crowded ranks' },
  { file: 'c', code: 'wB', pieceId: 'b', name: 'Bishop', role: 'Long-range diagonal sniper' },
  {
    file: 'α',
    code: 'wRF',
    pieceId: 'rf',
    name: 'Red-eared Fox',
    role: 'Signature α-file (3,1) long leaper',
    isSpecial: true,
  },
  { file: 'd', code: 'wQ', pieceId: 'q', name: 'Queen', role: 'Unlimited 8-direction royal commander' },
  { file: 'e', code: 'wK', pieceId: 'k', name: 'King', role: 'Royal monarch — protect at all costs' },
  {
    file: 'β',
    code: 'wF',
    pieceId: 'f',
    name: 'Normal Fox',
    role: 'Signature β-file 5-square 8-direction slider',
    isSpecial: true,
  },
  { file: 'f', code: 'wB', pieceId: 'b', name: 'Bishop', role: 'Kingside diagonal controller' },
  { file: 'g', code: 'wN', pieceId: 'n', name: 'Knight', role: 'Kingside (2,1) tactical jumper' },
  { file: 'h', code: 'wR', pieceId: 'r', name: 'Rook', role: 'Kingside castling partner' },
]

export const STARTING_LINEUP_8 = [
  { file: 'a', code: 'wR', pieceId: 'r', name: 'Rook', role: 'Queenside corner rook' },
  { file: 'b', code: 'wN', pieceId: 'n', name: 'Knight', role: 'Queenside (2,1) jumper' },
  { file: 'c', code: 'wB', pieceId: 'b', name: 'Bishop', role: 'Queenside diagonal slider' },
  { file: 'd', code: 'wQ', pieceId: 'q', name: 'Queen', role: 'Unlimited 8-direction slider' },
  { file: 'e', code: 'wK', pieceId: 'k', name: 'King', role: 'Royal monarch' },
  { file: 'f', code: 'wB', pieceId: 'b', name: 'Bishop', role: 'Kingside diagonal slider' },
  { file: 'g', code: 'wN', pieceId: 'n', name: 'Knight', role: 'Kingside (2,1) jumper' },
  { file: 'h', code: 'wR', pieceId: 'r', name: 'Rook', role: 'Kingside corner rook' },
]

/**
 * Helper to format (row, col) on the 10x10 board into algebraic notation
 * row 0 is Rank 10, row 9 is Rank 1
 */
export function toSquare10(row, col) {
  const file = FILES_10[col] || '?'
  const rank = 10 - row
  return `${file}${rank}`
}

/**
 * Compute all legal target squares and intermediate paths for a piece at (row, col)
 * on a 10x10 board given an array of other pieces: [{ row, col, code, side: 'ally'|'enemy' }]
 */
export function computePieceMoves10(pieceId, row, col, others = []) {
  const pieceMap = new Map()
  for (const item of others) {
    pieceMap.set(`${item.row},${item.col}`, item)
  }

  const inBounds = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 10
  const moves = []

  if (pieceId === 'rf') {
    // (3,1) leaper: 3 orthogonal + 1 perpendicular
    const offsets = [
      { dr: -3, dc: -1, elbow: { dr: -3, dc: 0 } },
      { dr: -3, dc: 1, elbow: { dr: -3, dc: 0 } },
      { dr: 3, dc: -1, elbow: { dr: 3, dc: 0 } },
      { dr: 3, dc: 1, elbow: { dr: 3, dc: 0 } },
      { dr: -1, dc: -3, elbow: { dr: 0, dc: -3 } },
      { dr: 1, dc: -3, elbow: { dr: 0, dc: -3 } },
      { dr: -1, dc: 3, elbow: { dr: 0, dc: 3 } },
      { dr: 1, dc: 3, elbow: { dr: 0, dc: 3 } },
    ]
    for (const off of offsets) {
      const tr = row + off.dr
      const tc = col + off.dc
      if (!inBounds(tr, tc)) continue
      const occupant = pieceMap.get(`${tr},${tc}`)
      if (occupant?.side === 'ally') continue
      // Build L-path steps for visual trail
      const steps = []
      if (Math.abs(off.dr) === 3) {
        const stepR = off.dr > 0 ? 1 : -1
        steps.push({ row: row + stepR, col })
        steps.push({ row: row + stepR * 2, col })
        steps.push({ row: row + stepR * 3, col })
      } else {
        const stepC = off.dc > 0 ? 1 : -1
        steps.push({ row, col: col + stepC })
        steps.push({ row, col: col + stepC * 2 })
        steps.push({ row, col: col + stepC * 3 })
      }
      moves.push({
        row: tr,
        col: tc,
        capture: occupant?.side === 'enemy',
        isJump: true,
        steps,
      })
    }
    return moves
  }

  if (pieceId === 'n') {
    // (2,1) leaper: 2 orthogonal + 1 perpendicular
    const offsets = [
      { dr: -2, dc: -1 },
      { dr: -2, dc: 1 },
      { dr: 2, dc: -1 },
      { dr: 2, dc: 1 },
      { dr: -1, dc: -2 },
      { dr: 1, dc: -2 },
      { dr: -1, dc: 2 },
      { dr: 1, dc: 2 },
    ]
    for (const off of offsets) {
      const tr = row + off.dr
      const tc = col + off.dc
      if (!inBounds(tr, tc)) continue
      const occupant = pieceMap.get(`${tr},${tc}`)
      if (occupant?.side === 'ally') continue
      const steps = []
      if (Math.abs(off.dr) === 2) {
        const stepR = off.dr > 0 ? 1 : -1
        steps.push({ row: row + stepR, col })
        steps.push({ row: row + stepR * 2, col })
      } else {
        const stepC = off.dc > 0 ? 1 : -1
        steps.push({ row, col: col + stepC })
        steps.push({ row, col: col + stepC * 2 })
      }
      moves.push({
        row: tr,
        col: tc,
        capture: occupant?.side === 'enemy',
        isJump: true,
        steps,
      })
    }
    return moves
  }

  if (pieceId === 'f' || pieceId === 'q' || pieceId === 'r' || pieceId === 'b' || pieceId === 'k') {
    const maxDist = pieceId === 'k' ? 1 : pieceId === 'f' ? 5 : 9
    const dirs = []
    if (pieceId !== 'b') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1])
    }
    if (pieceId !== 'r') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1])
    }
    for (const [dr, dc] of dirs) {
      const raySteps = []
      for (let d = 1; d <= maxDist; d++) {
        const tr = row + dr * d
        const tc = col + dc * d
        if (!inBounds(tr, tc)) break
        const occupant = pieceMap.get(`${tr},${tc}`)
        if (occupant?.side === 'ally') break
        moves.push({
          row: tr,
          col: tc,
          capture: occupant?.side === 'enemy',
          isJump: false,
          distance: d,
          steps: [...raySteps],
        })
        raySteps.push({ row: tr, col: tc })
        if (occupant?.side === 'enemy') break
      }
    }
    return moves
  }

  if (pieceId === 'p') {
    // White pawn moves up (row - 1)
    const oneUp = row - 1
    if (inBounds(oneUp, col) && !pieceMap.has(`${oneUp},${col}`)) {
      moves.push({
        row: oneUp,
        col,
        capture: false,
        isJump: false,
        steps: [],
      })
      // Initial 2-square advance from Rank 2 (row 8)
      const twoUp = row - 2
      if (row === 8 && inBounds(twoUp, col) && !pieceMap.has(`${twoUp},${col}`)) {
        moves.push({
          row: twoUp,
          col,
          capture: false,
          isJump: false,
          steps: [{ row: oneUp, col }],
        })
      }
    }
    // Diagonal captures
    for (const dc of [-1, 1]) {
      const tr = row - 1
      const tc = col + dc
      if (!inBounds(tr, tc)) continue
      const occ = pieceMap.get(`${tr},${tc}`)
      if (occ?.side === 'enemy') {
        moves.push({
          row: tr,
          col: tc,
          capture: true,
          isJump: false,
          steps: [],
        })
      }
    }
    return moves
  }

  return moves
}

export const PIECE_RULES_DATA = [
  {
    id: 'rf',
    code: 'wRF',
    blackCode: 'bRF',
    name: 'Red-eared Fox',
    subtitle: 'Fox 1 · α-File Long Leaper',
    badge: '10×10 Exclusive · α File',
    category: 'fox',
    value: 4,
    startSquares10: 'α1 (White) · α10 (Black)',
    startSquares8: 'Not in 8×8 Standard Chess',
    formula: '(3, 1) L-Leaper',
    rangeLabel: '3 squares orthogonal + 1 square perpendicular',
    canJump: true,
    summary:
      'Stationed on the α (Alpha) file between the Queenside Bishop and the Queen, the Red-eared Fox is an agile long-distance leaper. It travels 3 squares in a straight line (up, down, left, or right) and turns 1 square at a 90° angle — jumping effortlessly over any friendly or enemy pieces in its path.',
    rules: [
      'Moves in an extended "L" shape: 3 squares along a rank or file, then 1 square perpendicular.',
      'Jumps cleanly over all intervening pieces — blockers on the 3 intermediate squares never stop it.',
      'Always lands on a square of the SAME color as the square it started on (because 3 + 1 = 4, an even parity jump).',
      'Captures only on its destination square by landing directly on an enemy piece.',
      'Pawns reaching the 10th/1st rank in Fox Chess can promote into a Red-eared Fox!',
    ],
    tacticalTip:
      'Because its (3,1) jump preserves square color, use your Red-eared Fox to infiltrate deep behind enemy pawn chains from the very first move (e.g., α1 → c4 or α1 → d4)!',
    scenarios: [
      {
        title: '1. Opening Leap Over the Pawn Wall',
        caption:
          'From α1, the Red-eared Fox leaps 3 ranks up (α2, α3, α4) and 1 file over to d4 — jumping right over White’s unmoved pawns!',
        from: { row: 9, col: 3 }, // α1
        to: { row: 6, col: 4 }, // d4
        others: [
          { row: 9, col: 2, code: 'wB', side: 'ally' },
          { row: 9, col: 4, code: 'wQ', side: 'ally' },
          { row: 9, col: 5, code: 'wK', side: 'ally' },
          { row: 8, col: 2, code: 'wP', side: 'ally' },
          { row: 8, col: 3, code: 'wP', side: 'ally' },
          { row: 8, col: 4, code: 'wP', side: 'ally' },
          { row: 8, col: 5, code: 'wP', side: 'ally' },
          { row: 3, col: 3, code: 'bN', side: 'enemy' },
          { row: 2, col: 4, code: 'bP', side: 'enemy' },
        ],
      },
      {
        title: '2. Deep (3,1) Tactical Fork & Capture',
        caption:
          'From d4, it leaps 3 ranks north and 1 file west to capture the Black Knight on α7, ignoring pieces along the way.',
        from: { row: 6, col: 4 }, // d4
        to: { row: 3, col: 3 }, // α7
        others: [
          { row: 8, col: 2, code: 'wP', side: 'ally' },
          { row: 8, col: 3, code: 'wP', side: 'ally' },
          { row: 8, col: 4, code: 'wP', side: 'ally' },
          { row: 5, col: 4, code: 'bP', side: 'enemy' },
          { row: 3, col: 3, code: 'bN', side: 'enemy' },
          { row: 2, col: 6, code: 'bR', side: 'enemy' },
        ],
      },
      {
        title: '3. Horizontal 3+1 Strike Across Files',
        caption:
          'From α7, the Red-eared Fox leaps 3 files east (d7, e7, β7) and 1 rank north to capture the Black Rook on β8!',
        from: { row: 3, col: 3 }, // α7
        to: { row: 2, col: 6 }, // β8
        others: [
          { row: 3, col: 4, code: 'bP', side: 'enemy' },
          { row: 3, col: 5, code: 'wB', side: 'ally' },
          { row: 2, col: 6, code: 'bR', side: 'enemy' },
          { row: 0, col: 5, code: 'bK', side: 'enemy' },
          { row: 8, col: 4, code: 'wP', side: 'ally' },
        ],
      },
    ],
    miniBoard: {
      center: { row: 3, col: 3 },
      blockers: [
        { row: 2, col: 3, code: 'wP' },
        { row: 3, col: 4, code: 'bP' },
        { row: 0, col: 4, code: 'bN' },
      ],
      keyframes: [
        { row: 3, col: 3 },
        { row: 0, col: 4 },
        { row: 3, col: 3 },
        { row: 2, col: 6 },
        { row: 3, col: 3 },
        { row: 6, col: 2 },
      ],
      targets: [
        { row: 0, col: 2 },
        { row: 0, col: 4 },
        { row: 6, col: 2 },
        { row: 6, col: 4 },
        { row: 2, col: 0 },
        { row: 4, col: 0 },
        { row: 2, col: 6 },
        { row: 4, col: 6 },
      ],
    },
  },
  {
    id: 'f',
    code: 'wF',
    blackCode: 'bF',
    name: 'Normal Fox',
    subtitle: 'Fox 2 · β-File Half-Range Queen',
    badge: '10×10 Exclusive · β File',
    category: 'fox',
    value: 7,
    startSquares10: 'β1 (White) · β10 (Black)',
    startSquares8: 'Not in 8×8 Standard Chess',
    formula: '8 Directions · Max 5 Squares',
    rangeLabel: '1 to 5 squares horizontally, vertically, or diagonally',
    canJump: false,
    summary:
      'Stationed on the β (Beta) file beside the King, the Normal Fox moves like a Queen in all 8 directions (ranks, files, and diagonals), but with half the board’s maximum range: up to 5 squares per move. It cannot jump over intervening pieces.',
    rules: [
      'Slides 1, 2, 3, 4, or at most 5 squares in any of the 8 orthogonal or diagonal directions.',
      'Cannot move 6 or more squares in a single turn (half-length Queen on the 10×10 board).',
      'Blocked by friendly pieces and stops upon capturing the first enemy piece in its line of sight.',
      'Dominates midfield combat: from the center (e5/e6), its 5-square radius reaches almost the entire board!',
    ],
    tacticalTip:
      'Centralize your Normal Fox around rank 4–6! From the center of a 10×10 board, a 5-square radius covers up to 35 squares in all 8 directions — nearly matching a full Queen.',
    scenarios: [
      {
        title: '1. 5-Square Diagonal Deployment',
        caption:
          'The Normal Fox slides up to 5 squares along any open diagonal, file, or rank — here advancing 4 squares diagonally from β3 to c7.',
        from: { row: 7, col: 6 }, // β3
        to: { row: 3, col: 2 }, // c7
        others: [
          { row: 3, col: 7, code: 'bB', side: 'enemy' },
          { row: 7, col: 8, code: 'wP', side: 'ally' },
          { row: 8, col: 5, code: 'wP', side: 'ally' },
          { row: 9, col: 5, code: 'wK', side: 'ally' },
          { row: 2, col: 4, code: 'bP', side: 'enemy' },
        ],
      },
      {
        title: '2. 5-Square Maximum Range Limit & Capture',
        caption:
          'From c7, it slides exactly 5 squares horizontally across the 7th rank (α7, d7, e7, β7, f7) to capture the Black Bishop on f7! Notice g7 (6 squares away) is outside its 5-square range.',
        from: { row: 3, col: 2 }, // c7
        to: { row: 3, col: 7 }, // f7
        others: [
          { row: 3, col: 7, code: 'bB', side: 'enemy' },
          { row: 8, col: 7, code: 'bN', side: 'enemy' },
          { row: 8, col: 5, code: 'wP', side: 'ally' },
          { row: 1, col: 5, code: 'bK', side: 'enemy' },
        ],
      },
      {
        title: '3. Vertical 5-Square Sweep',
        caption:
          'From f7, it drops 5 squares straight down the f-file to capture the Black Knight on f2 — demonstrating its full 5-square vertical reach.',
        from: { row: 3, col: 7 }, // f7
        to: { row: 8, col: 7 }, // f2
        others: [
          { row: 8, col: 7, code: 'bN', side: 'enemy' },
          { row: 8, col: 5, code: 'wP', side: 'ally' },
          { row: 9, col: 5, code: 'wK', side: 'ally' },
          { row: 2, col: 4, code: 'bP', side: 'enemy' },
        ],
      },
    ],
    miniBoard: {
      center: { row: 3, col: 3 },
      blockers: [
        { row: 3, col: 1, code: 'wP' },
        { row: 0, col: 6, code: 'bB' },
      ],
      keyframes: [
        { row: 3, col: 3 },
        { row: 0, col: 3 },
        { row: 3, col: 3 },
        { row: 0, col: 6 },
        { row: 3, col: 3 },
        { row: 6, col: 0 },
      ],
      targets: [
        { row: 2, col: 3 },
        { row: 1, col: 3 },
        { row: 0, col: 3 },
        { row: 4, col: 3 },
        { row: 5, col: 3 },
        { row: 6, col: 3 },
        { row: 3, col: 2 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
        { row: 3, col: 6 },
        { row: 2, col: 2 },
        { row: 1, col: 1 },
        { row: 0, col: 0 },
        { row: 2, col: 4 },
        { row: 1, col: 5 },
        { row: 0, col: 6 },
        { row: 4, col: 2 },
        { row: 5, col: 1 },
        { row: 6, col: 0 },
        { row: 4, col: 4 },
        { row: 5, col: 5 },
        { row: 6, col: 6 },
      ],
    },
  },
  {
    id: 'q',
    code: 'wQ',
    blackCode: 'bQ',
    name: 'Queen',
    subtitle: 'Unlimited 8-Direction Commander',
    badge: '10×10 & 8×8 · d File',
    category: 'standard',
    value: 9,
    startSquares10: 'd1 (White) · d10 (Black)',
    startSquares8: 'd1 (White) · d8 (Black)',
    formula: '8 Directions · Unlimited Range',
    rangeLabel: 'Any number of unobstructed squares along ranks, files, or diagonals',
    canJump: false,
    summary:
      'The most powerful piece on both the 10×10 and 8×8 boards. Combining the powers of the Rook and Bishop, the Queen slides any number of open squares horizontally, vertically, or diagonally — up to 9 squares end-to-end on the 10×10 battlefield.',
    rules: [
      'Moves any number of vacant squares in all 8 directions (up, down, left, right, and all 4 diagonals).',
      'Unlike the Normal Fox (capped at 5 squares), the Queen can cross all 10 ranks or files in a single move.',
      'Cannot leap over friendly or enemy pieces.',
      'Captures by landing on the square of the first enemy piece along its chosen line.',
    ],
    tacticalTip:
      'Avoid bringing the Queen out too early where minor pieces and Red-eared Foxes can harass her with tempo; coordinate her with your Normal Fox for devastating double batteries!',
    scenarios: [
      {
        title: '1. Full-Board 8-Square Diagonal Sweep',
        caption:
          'Unlike the Normal Fox (limited to 5 squares), the Queen can sweep 8 squares across the entire long diagonal from b1 to h9!',
        from: { row: 9, col: 1 }, // b1
        to: { row: 1, col: 9 }, // h9
        others: [
          { row: 1, col: 9, code: 'bR', side: 'enemy' },
          { row: 8, col: 4, code: 'wP', side: 'ally' },
          { row: 9, col: 5, code: 'wK', side: 'ally' },
          { row: 2, col: 5, code: 'bP', side: 'enemy' },
        ],
      },
      {
        title: '2. Cross-Board Rank Transfer',
        caption:
          'From h9, the Queen glides 8 files across the 9th rank to b9 in a single move.',
        from: { row: 1, col: 9 }, // h9
        to: { row: 1, col: 1 }, // b9
        others: [
          { row: 8, col: 1, code: 'bN', side: 'enemy' },
          { row: 8, col: 4, code: 'wP', side: 'ally' },
          { row: 0, col: 5, code: 'bK', side: 'enemy' },
        ],
      },
      {
        title: '3. Full-File Vertical Strike',
        caption:
          'From b9, she drops 7 ranks down the b-file to capture the enemy Knight on b2.',
        from: { row: 1, col: 1 }, // b9
        to: { row: 8, col: 1 }, // b2
        others: [
          { row: 8, col: 1, code: 'bN', side: 'enemy' },
          { row: 8, col: 4, code: 'wP', side: 'ally' },
          { row: 9, col: 5, code: 'wK', side: 'ally' },
        ],
      },
    ],
    miniBoard: {
      center: { row: 3, col: 3 },
      blockers: [
        { row: 3, col: 6, code: 'bR' },
        { row: 5, col: 2, code: 'wP' },
      ],
      keyframes: [
        { row: 3, col: 3 },
        { row: 0, col: 0 },
        { row: 3, col: 3 },
        { row: 3, col: 6 },
        { row: 3, col: 3 },
        { row: 6, col: 3 },
      ],
      targets: [
        { row: 2, col: 3 },
        { row: 1, col: 3 },
        { row: 0, col: 3 },
        { row: 4, col: 3 },
        { row: 5, col: 3 },
        { row: 6, col: 3 },
        { row: 3, col: 2 },
        { row: 3, col: 1 },
        { row: 3, col: 0 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
        { row: 3, col: 6 },
        { row: 2, col: 2 },
        { row: 1, col: 1 },
        { row: 0, col: 0 },
        { row: 2, col: 4 },
        { row: 1, col: 5 },
        { row: 0, col: 6 },
        { row: 4, col: 2 },
        { row: 5, col: 1 },
        { row: 6, col: 0 },
        { row: 4, col: 4 },
        { row: 5, col: 5 },
        { row: 6, col: 6 },
      ],
    },
  },
  {
    id: 'k',
    code: 'wK',
    blackCode: 'bK',
    name: 'King',
    subtitle: 'The Royal Monarch · 1-Step & Castling',
    badge: '10×10 & 8×8 · e File',
    category: 'standard',
    value: '∞',
    startSquares10: 'e1 (White) · e10 (Black)',
    startSquares8: 'e1 (White) · e8 (Black)',
    formula: '8 Directions · 1 Square (+ Castling)',
    rangeLabel: '1 square in any direction; 2 squares horizontally when Castling',
    canJump: false,
    summary:
      'The heart of your army. The King steps 1 square in any of the 8 directions, provided the destination square is not attacked by an enemy piece. Once per game, the King can also perform a special Castling move with a Rook.',
    rules: [
      'Steps 1 square horizontally, vertically, or diagonally to any safe square.',
      'May NEVER move onto a square that is attacked by an enemy piece (cannot move into Check).',
      'If placed in Check, you must immediately get out of check by moving the King, blocking the attack, or capturing the attacker.',
      '10×10 Castling: Kingside moves King e1 → f1 (Rook h1 → β1); Queenside moves King e1 → α1 (Rook a1 → d1).',
    ],
    tacticalTip:
      'Castle early in the opening to tuck your King behind a pawn shield while activating your corner Rook toward the center files!',
    scenarios: [
      {
        title: '1. Royal Step in Any Direction',
        caption:
          'The King steps 1 square in any of the 8 directions — here advancing diagonally from e4 to d5.',
        from: { row: 6, col: 5 }, // e4
        to: { row: 5, col: 4 }, // d5
        others: [
          { row: 4, col: 4, code: 'bP', side: 'enemy' },
          { row: 6, col: 6, code: 'wP', side: 'ally' },
          { row: 7, col: 4, code: 'wP', side: 'ally' },
        ],
      },
      {
        title: '2. Close-Combat Royal Capture',
        caption:
          'When an enemy piece is adjacent and undefended, the King can step 1 square to capture it (d5 × d6).',
        from: { row: 5, col: 4 }, // d5
        to: { row: 4, col: 4 }, // d6
        others: [
          { row: 4, col: 4, code: 'bP', side: 'enemy' },
          { row: 6, col: 6, code: 'wP', side: 'ally' },
          { row: 7, col: 4, code: 'wP', side: 'ally' },
        ],
      },
      {
        title: '3. 10×10 Kingside Castling (e1 → f1)',
        caption:
          'When the path between King (e1) and Rook (h1) is clear and unattacked, the King slides 2 squares to f1 and the Rook leaps over to β1!',
        from: { row: 9, col: 5 }, // e1
        to: { row: 9, col: 7 }, // f1
        specialNote: 'Castling: Rook simultaneously jumps from h1 to β1!',
        others: [
          { row: 9, col: 9, code: 'wR', side: 'ally' },
          { row: 8, col: 6, code: 'wP', side: 'ally' },
          { row: 8, col: 7, code: 'wP', side: 'ally' },
          { row: 8, col: 8, code: 'wP', side: 'ally' },
          { row: 8, col: 9, code: 'wP', side: 'ally' },
        ],
      },
    ],
    miniBoard: {
      center: { row: 3, col: 3 },
      blockers: [
        { row: 2, col: 4, code: 'bP' },
        { row: 4, col: 3, code: 'wP' },
      ],
      keyframes: [
        { row: 3, col: 3 },
        { row: 2, col: 3 },
        { row: 3, col: 3 },
        { row: 2, col: 4 },
        { row: 3, col: 3 },
        { row: 4, col: 2 },
      ],
      targets: [
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 3, col: 2 },
        { row: 3, col: 4 },
        { row: 4, col: 2 },
        { row: 4, col: 3 },
        { row: 4, col: 4 },
      ],
    },
  },
  {
    id: 'r',
    code: 'wR',
    blackCode: 'bR',
    name: 'Rook',
    subtitle: 'Orthogonal File & Rank Fortress',
    badge: '10×10 & 8×8 · a & h Files',
    category: 'standard',
    value: 5,
    startSquares10: 'a1, h1 (White) · a10, h10 (Black)',
    startSquares8: 'a1, h1 (White) · a8, h8 (Black)',
    formula: '4 Orthogonal Directions · Unlimited Range',
    rangeLabel: 'Any number of open squares horizontally or vertically',
    canJump: false,
    summary:
      'A heavy long-range piece that commands entire ranks (rows) and files (columns). On the 10×10 board, an unblocked Rook controls 18 squares from any position and pairs with the King for Castling.',
    rules: [
      'Slides any number of vacant squares straight up, down, left, or right.',
      'Cannot move diagonally and cannot jump over pieces (except when jumping over the King during Castling).',
      'Captures the first enemy piece along its rank or file.',
      'Doubled Rooks on an open file or the 9th/7th rank create overwhelming pressure.',
    ],
    tacticalTip:
      'Connect your two Rooks on the back rank by developing your minor pieces and Foxes, then place them on open central files (α, d, e, β).',
    scenarios: [
      {
        title: '1. Full-File Vertical Invasion',
        caption:
          'The Rook powers straight up the open d-file from d2 to d9 in a single vertical sweep.',
        from: { row: 8, col: 4 }, // d2
        to: { row: 1, col: 4 }, // d9
        others: [
          { row: 1, col: 8, code: 'bN', side: 'enemy' },
          { row: 1, col: 2, code: 'bP', side: 'enemy' },
          { row: 8, col: 3, code: 'wP', side: 'ally' },
          { row: 8, col: 5, code: 'wP', side: 'ally' },
          { row: 9, col: 5, code: 'wK', side: 'ally' },
        ],
      },
      {
        title: '2. 9th-Rank Horizontal Capture',
        caption:
          'From d9, the Rook slides horizontally across the 9th rank to capture the Black Knight on g9.',
        from: { row: 1, col: 4 }, // d9
        to: { row: 1, col: 8 }, // g9
        others: [
          { row: 1, col: 8, code: 'bN', side: 'enemy' },
          { row: 1, col: 2, code: 'bP', side: 'enemy' },
          { row: 0, col: 5, code: 'bK', side: 'enemy' },
          { row: 8, col: 5, code: 'wP', side: 'ally' },
        ],
      },
    ],
    miniBoard: {
      center: { row: 3, col: 3 },
      blockers: [
        { row: 3, col: 6, code: 'bN' },
        { row: 1, col: 1, code: 'wP' },
      ],
      keyframes: [
        { row: 3, col: 3 },
        { row: 0, col: 3 },
        { row: 3, col: 3 },
        { row: 3, col: 6 },
        { row: 3, col: 3 },
        { row: 3, col: 0 },
      ],
      targets: [
        { row: 2, col: 3 },
        { row: 1, col: 3 },
        { row: 0, col: 3 },
        { row: 4, col: 3 },
        { row: 5, col: 3 },
        { row: 6, col: 3 },
        { row: 3, col: 2 },
        { row: 3, col: 1 },
        { row: 3, col: 0 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
        { row: 3, col: 6 },
      ],
    },
  },
  {
    id: 'b',
    code: 'wB',
    blackCode: 'bB',
    name: 'Bishop',
    subtitle: 'Long-Range Diagonal Sniper',
    badge: '10×10 & 8×8 · c & f Files',
    category: 'standard',
    value: 3,
    startSquares10: 'c1, f1 (White) · c10, f10 (Black)',
    startSquares8: 'c1, f1 (White) · c8, f8 (Black)',
    formula: '4 Diagonal Directions · Unlimited Range',
    rangeLabel: 'Any number of open squares along diagonals of its square color',
    canJump: false,
    summary:
      'Master of the long diagonals. Each player starts with one light-squared Bishop and one dark-squared Bishop. A Bishop remains on squares of its starting color for the entire game.',
    rules: [
      'Slides any number of vacant squares along the 4 diagonal directions.',
      'Never changes square color — a light-squared Bishop only ever reaches light squares.',
      'Blocked by friendly pieces; captures by landing on the first enemy piece along its diagonal.',
      'On the 10×10 board, a fianchettoed Bishop can slice across up to 10 squares along the main diagonal!',
    ],
    tacticalTip:
      'Keep both Bishops ("the Bishop Pair") in open positions — together they cover both light and dark diagonals across the 100-square board.',
    scenarios: [
      {
        title: '1. Long Diagonal Slice',
        caption:
          'The Bishop glides diagonally from c2 across the center to f7, controlling every square along the diagonal.',
        from: { row: 8, col: 2 }, // c2
        to: { row: 3, col: 7 }, // f7
        others: [
          { row: 1, col: 5, code: 'bR', side: 'enemy' },
          { row: 8, col: 4, code: 'wP', side: 'ally' },
          { row: 7, col: 3, code: 'wP', side: 'ally' },
          { row: 2, col: 3, code: 'bP', side: 'enemy' },
        ],
      },
      {
        title: '2. Diagonal Pin & Capture',
        caption:
          'From f7, the Bishop pivots along the perpendicular diagonal to capture the enemy Rook on e9!',
        from: { row: 3, col: 7 }, // f7
        to: { row: 1, col: 5 }, // e9
        others: [
          { row: 1, col: 5, code: 'bR', side: 'enemy' },
          { row: 0, col: 4, code: 'bK', side: 'enemy' },
          { row: 8, col: 4, code: 'wP', side: 'ally' },
        ],
      },
    ],
    miniBoard: {
      center: { row: 3, col: 3 },
      blockers: [
        { row: 0, col: 6, code: 'bR' },
        { row: 3, col: 1, code: 'wP' },
      ],
      keyframes: [
        { row: 3, col: 3 },
        { row: 0, col: 0 },
        { row: 3, col: 3 },
        { row: 0, col: 6 },
        { row: 3, col: 3 },
        { row: 6, col: 0 },
      ],
      targets: [
        { row: 2, col: 2 },
        { row: 1, col: 1 },
        { row: 0, col: 0 },
        { row: 2, col: 4 },
        { row: 1, col: 5 },
        { row: 0, col: 6 },
        { row: 4, col: 2 },
        { row: 5, col: 1 },
        { row: 6, col: 0 },
        { row: 4, col: 4 },
        { row: 5, col: 5 },
        { row: 6, col: 6 },
      ],
    },
  },
  {
    id: 'n',
    code: 'wN',
    blackCode: 'bN',
    name: 'Knight',
    subtitle: 'Classic (2,1) L-Shape Leaper',
    badge: '10×10 & 8×8 · b & g Files',
    category: 'standard',
    value: 3,
    startSquares10: 'b1, g1 (White) · b10, g10 (Black)',
    startSquares8: 'b1, g1 (White) · b8, g8 (Black)',
    formula: '(2, 1) L-Leaper',
    rangeLabel: '2 squares orthogonal + 1 square perpendicular',
    canJump: true,
    summary:
      'The classic tactical jumper. The Knight moves 2 squares in one orthogonal direction and 1 square perpendicular, forming an "L". Unlike the Red-eared Fox’s (3,1) leap, the Knight’s (2,1) leap alternates square color on every move.',
    rules: [
      'Moves 2 squares horizontally or vertically, then 1 square at a 90° angle.',
      'Jumps over any friendly or enemy pieces in between.',
      'Always changes square color on every jump (light square → dark square → light square).',
      'Compare with Red-eared Fox: Knight is a (2,1) leaper; Red-eared Fox is a (3,1) leaper!',
    ],
    tacticalTip:
      'Pair your Knight with your Red-eared Fox! While the Red-eared Fox attacks same-color squares at (3,1) range, the Knight covers opposite-color squares at (2,1) range.',
    scenarios: [
      {
        title: '1. Opening Jump Over Pawns',
        caption:
          'From b1, the Knight leaps 2 ranks up and 1 file right to c3, jumping cleanly over the pawn line.',
        from: { row: 9, col: 1 }, // b1
        to: { row: 7, col: 2 }, // c3
        others: [
          { row: 8, col: 1, code: 'wP', side: 'ally' },
          { row: 8, col: 2, code: 'wP', side: 'ally' },
          { row: 5, col: 3, code: 'bB', side: 'enemy' },
        ],
      },
      {
        title: '2. Central Outpost & Capture',
        caption:
          'From c3, the Knight leaps 2 ranks up and 1 file right to capture the Black Bishop on α5!',
        from: { row: 7, col: 2 }, // c3
        to: { row: 5, col: 3 }, // α5
        others: [
          { row: 8, col: 1, code: 'wP', side: 'ally' },
          { row: 8, col: 2, code: 'wP', side: 'ally' },
          { row: 5, col: 3, code: 'bB', side: 'enemy' },
        ],
      },
    ],
    miniBoard: {
      center: { row: 3, col: 3 },
      blockers: [
        { row: 2, col: 3, code: 'wP' },
        { row: 1, col: 4, code: 'bB' },
      ],
      keyframes: [
        { row: 3, col: 3 },
        { row: 1, col: 4 },
        { row: 3, col: 3 },
        { row: 2, col: 5 },
        { row: 3, col: 3 },
        { row: 5, col: 2 },
      ],
      targets: [
        { row: 1, col: 2 },
        { row: 1, col: 4 },
        { row: 5, col: 2 },
        { row: 5, col: 4 },
        { row: 2, col: 1 },
        { row: 4, col: 1 },
        { row: 2, col: 5 },
        { row: 4, col: 5 },
      ],
    },
  },
  {
    id: 'p',
    code: 'wP',
    blackCode: 'bP',
    name: 'Pawn',
    subtitle: 'Frontline Infantry & Fox Promoter',
    badge: '10×10 (10 Pawns) · 8×8 (8 Pawns)',
    category: 'standard',
    value: 1,
    startSquares10: 'Rank 2 (White) · Rank 9 (Black)',
    startSquares8: 'Rank 2 (White) · Rank 7 (Black)',
    formula: '1 Forward (2 on Start) · Captures Diagonally',
    rangeLabel: 'Advances 1 square straight ahead; captures 1 square diagonally forward',
    canJump: false,
    summary:
      'The soul of chess strategy. Pawns march exclusively forward one square at a time (with an optional 2-square sprint on their very first move) and capture one square diagonally forward. Reaching the far rank promotes the Pawn into any officer — including a Red-eared Fox or Normal Fox!',
    rules: [
      'Moves 1 square straight forward to an empty square; never moves backward.',
      'Initial Double Step: An unmoved Pawn on Rank 2 (White) or Rank 9 (Black in 10×10 / Rank 7 in 8×8) may advance 2 squares forward if both squares are empty.',
      'Diagonal Capture: Captures an enemy piece located 1 square diagonally forward.',
      'En Passant: If an enemy Pawn double-steps beside your Pawn, you may capture it "in passing" on the very next turn.',
      'Promotion: Upon reaching Rank 10 (or Rank 1 for Black), the Pawn immediately transforms into a Queen, Normal Fox, Red-eared Fox, Rook, Bishop, or Knight!',
    ],
    tacticalTip:
      'In 10×10 Fox Chess, promoting a Pawn to a Red-eared Fox can deliver surprise (3,1) checkmates that even a Queen cannot execute!',
    scenarios: [
      {
        title: '1. Initial 2-Square Sprint from Rank 2',
        caption:
          'On its very first move from Rank 2 (d2), the Pawn can sprint 2 squares forward to d4.',
        from: { row: 8, col: 4 }, // d2
        to: { row: 6, col: 4 }, // d4
        others: [
          { row: 5, col: 5, code: 'bP', side: 'enemy' },
          { row: 8, col: 3, code: 'wP', side: 'ally' },
          { row: 8, col: 5, code: 'wP', side: 'ally' },
          { row: 9, col: 4, code: 'wQ', side: 'ally' },
        ],
      },
      {
        title: '2. Diagonal Forward Capture',
        caption:
          'Pawns capture 1 square diagonally forward — here White’s Pawn on d4 captures the Black Pawn on e5.',
        from: { row: 6, col: 4 }, // d4
        to: { row: 5, col: 5 }, // e5
        others: [
          { row: 5, col: 5, code: 'bP', side: 'enemy' },
          { row: 5, col: 4, code: 'bP', side: 'enemy' },
          { row: 8, col: 3, code: 'wP', side: 'ally' },
          { row: 8, col: 5, code: 'wP', side: 'ally' },
        ],
      },
      {
        title: '3. Rank 10 Promotion to Red-eared Fox or Queen!',
        caption:
          'When a Pawn steps onto the final rank (e9 → e10), it immediately promotes into your choice of Queen, Normal Fox, Red-eared Fox, Rook, Bishop, or Knight!',
        from: { row: 1, col: 5 }, // e9
        to: { row: 0, col: 5 }, // e10
        promotedCode: 'wRF',
        specialNote: 'Promoted to Red-eared Fox (or Queen/Normal Fox) on e10!',
        others: [
          { row: 0, col: 8, code: 'bK', side: 'enemy' },
          { row: 1, col: 8, code: 'bP', side: 'enemy' },
          { row: 8, col: 5, code: 'wK', side: 'ally' },
        ],
      },
    ],
    miniBoard: {
      center: { row: 4, col: 3 },
      blockers: [
        { row: 3, col: 4, code: 'bP' },
        { row: 4, col: 2, code: 'wP' },
      ],
      keyframes: [
        { row: 4, col: 3 },
        { row: 2, col: 3 },
        { row: 4, col: 3 },
        { row: 3, col: 4 },
        { row: 4, col: 3 },
        { row: 3, col: 3 },
      ],
      targets: [
        { row: 3, col: 3 },
        { row: 2, col: 3 },
        { row: 3, col: 4 },
      ],
    },
  },
]

export const SPECIAL_RULES_DATA = [
  {
    id: 'castling',
    title: 'Castling (10×10 & 8×8)',
    subtitle: 'Simultaneous King safety & Rook activation',
    badge: 'King + Rook Special Move',
    description:
      'Once per game, if neither the King nor the chosen Rook has moved, all squares between them are empty, the King is not in check, and the King does not pass through or land on an attacked square, the King slides 2 squares toward the Rook and the Rook leaps over to the square the King crossed.',
    details10x10: [
      'Kingside (O-O): King moves e1 → f1 (2 squares right), Rook leaps h1 → β1.',
      'Queenside (O-O-O): King moves e1 → α1 (2 squares left), Rook leaps a1 → d1.',
    ],
    details8x8: [
      'Kingside (O-O): King moves e1 → g1, Rook leaps h1 → f1.',
      'Queenside (O-O-O): King moves e1 → c1, Rook leaps a1 → d1.',
    ],
  },
  {
    id: 'promotion',
    title: 'Pawn Promotion (6 Choices in Fox Chess)',
    subtitle: 'Transform a frontline Pawn into an elite piece',
    badge: 'Rank 10 / Rank 1 Transformation',
    description:
      'When a Pawn reaches the farthest rank (Rank 10 for White or Rank 1 for Black in Fox Chess; Rank 8 / Rank 1 in Standard Chess), it immediately transforms into a piece of the same color.',
    details10x10: [
      'Promote to Queen (♛) for unlimited 8-direction power.',
      'Promote to Normal Fox (🦊) for 5-square 8-direction agility.',
      'Promote to Red-eared Fox (🦊🔴) for unblockable (3,1) L-leaps!',
      'Or promote to Rook (♜), Bishop (♝), or Knight (♞).',
    ],
    details8x8: ['Promote to Queen (♛), Rook (♜), Bishop (♝), or Knight (♞).'],
  },
  {
    id: 'en-passant',
    title: 'En Passant ("In Passing")',
    subtitle: 'Special Pawn-on-Pawn capture after a 2-square advance',
    badge: 'Immediate Next Turn Only',
    description:
      'If an enemy Pawn uses its initial 2-square advance and lands directly beside your Pawn, you may capture it diagonally as if it had only moved 1 square forward. This capture must be played on the very next turn or the right is lost.',
    details10x10: [
      'White Pawn on e6 + Black Pawn sprints d9 → d7? Not adjacent yet; on 10×10, White Pawn on e7 can capture Black Pawn sprinting d9 → d7 via e7×d8 en passant!',
      'Keeps fast 2-square pawn advances from bypassing enemy pawn tension.',
    ],
    details8x8: [
      'White Pawn on e5 can capture Black Pawn sprinting d7 → d5 by playing e5×d6 en passant.',
    ],
  },
  {
    id: 'checkmate',
    title: 'Check, Checkmate & Stalemate',
    subtitle: 'How games are won or drawn on the board',
    badge: 'Victory & Draw Conditions',
    description:
      'The objective of both 10×10 Fox Chess and 8×8 Chess is to Checkmate the opponent’s King so it is under attack and has no legal move to escape.',
    details10x10: [
      'Check: The King is under direct attack. You MUST respond by moving the King, blocking the ray, or capturing the attacking piece (remember: leapers like the Red-eared Fox and Knight cannot be blocked!).',
      'Checkmate: The King is in Check and has zero legal responses — immediate victory!',
      'Stalemate: The player to move is NOT in Check, but has no legal moves available — the game ends in an immediate Draw.',
    ],
    details8x8: [
      'Games can also end by Resignation, Timeout, Mutual Draw Agreement, Threefold Repetition, or Insufficient Material.',
    ],
  },
]
