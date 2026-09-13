import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import styles from './ChessBoard.module.css'

const LIGHT_SQUARE = '#f0d9b5'
const DARK_SQUARE = '#63615f'

function getChessInstance(fen) {
  try {
    return new Chess(fen || undefined)
  } catch {
    return new Chess()
  }
}

function getKingSquare(chess, color) {
  const board = chess.board()
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square
      }
    }
  }
  return null
}

export function ChessBoard({ fen, orientation, onPieceDrop, canDragPiece, lastMove }) {
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [moveSquares, setMoveSquares] = useState({})

  // Clear selections when fen changes
  useEffect(() => {
    setSelectedSquare(null)
    setMoveSquares({})
  }, [fen])

  // Compute legal moves & visual indicators for a square
  const getLegalMoveStyles = useCallback(
    (square) => {
      try {
        const chess = getChessInstance(fen)
        const moves = chess.moves({ square, verbose: true })
        if (!moves || moves.length === 0) return null

        const stylesMap = {}
        // Highlight the source square with a distinct tint
        stylesMap[square] = {
          backgroundColor: 'rgba(255, 235, 59, 0.45)',
        }

        moves.forEach((m) => {
          const isCapture =
            Boolean(m.captured) ||
            (m.flags && (m.flags.includes('c') || m.flags.includes('e'))) ||
            Boolean(chess.get(m.to))

          stylesMap[m.to] = isCapture
            ? {
                background:
                  'radial-gradient(circle, transparent 52%, rgba(0, 0, 0, 0.3) 53%, rgba(0, 0, 0, 0.3) 68%, transparent 69%)',
                boxShadow: 'inset 0 0 0 3px rgba(220, 50, 50, 0.65)',
                cursor: 'pointer',
              }
            : {
                background:
                  'radial-gradient(circle, rgba(0, 0, 0, 0.26) 24%, transparent 25%)',
                cursor: 'pointer',
              }
        })

        return stylesMap
      } catch {
        return null
      }
    },
    [fen],
  )

  // Last move highlights
  const lastMoveStyles = useMemo(() => {
    if (!lastMove || !lastMove.from || !lastMove.to) return {}
    return {
      [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.2)' },
      [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.28)' },
    }
  }, [lastMove])

  // King in check red warning glow
  const checkStyle = useMemo(() => {
    try {
      const chess = getChessInstance(fen)
      if (chess.inCheck()) {
        const kingSq = getKingSquare(chess, chess.turn())
        if (kingSq) {
          return {
            [kingSq]: {
              background:
                'radial-gradient(circle, rgba(255, 0, 0, 0.75) 0%, rgba(220, 20, 20, 0.4) 45%, transparent 75%)',
            },
          }
        }
      }
    } catch {
      // ignore
    }
    return {}
  }, [fen])

  // Merge square styles (last move < check warning < active piece & available paths)
  const customSquareStyles = useMemo(() => {
    return {
      ...lastMoveStyles,
      ...checkStyle,
      ...moveSquares,
    }
  }, [lastMoveStyles, checkStyle, moveSquares])

  // When dragging / picking up a piece
  const handlePieceDrag = useCallback(
    ({ piece, square }) => {
      if (!square || !piece) return
      if (!canDragPiece || !canDragPiece(piece.pieceType)) return

      const legalStyles = getLegalMoveStyles(square)
      if (legalStyles) {
        setSelectedSquare(square)
        setMoveSquares(legalStyles)
      }
    },
    [canDragPiece, getLegalMoveStyles],
  )

  // When piece is dropped
  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      setSelectedSquare(null)
      setMoveSquares({})

      if (!targetSquare || sourceSquare === targetSquare) return false
      return onPieceDrop(sourceSquare, targetSquare)
    },
    [onPieceDrop],
  )

  // When drag is cancelled
  const handlePieceDragCancel = useCallback(() => {
    setSelectedSquare(null)
    setMoveSquares({})
  }, [])

  // Click-to-move handling
  const handleSquareClick = useCallback(
    ({ piece, square }) => {
      if (!square) return

      if (selectedSquare) {
        // Clicking same square deselects
        if (selectedSquare === square) {
          setSelectedSquare(null)
          setMoveSquares({})
          return
        }

        // Check if destination is legal
        try {
          const chess = getChessInstance(fen)
          const moves = chess.moves({ square: selectedSquare, verbose: true })
          const isLegal = moves.some((m) => m.to === square)
          if (isLegal) {
            setSelectedSquare(null)
            setMoveSquares({})
            onPieceDrop(selectedSquare, square)
            return
          }
        } catch {
          // ignore
        }

        // If clicked another movable friendly piece, switch selection
        if (piece && canDragPiece && canDragPiece(piece.pieceType)) {
          const legalStyles = getLegalMoveStyles(square)
          if (legalStyles) {
            setSelectedSquare(square)
            setMoveSquares(legalStyles)
            return
          }
        }

        // Otherwise deselect
        setSelectedSquare(null)
        setMoveSquares({})
        return
      }

      // No piece currently selected: select if it's a movable friendly piece
      if (piece && canDragPiece && canDragPiece(piece.pieceType)) {
        const legalStyles = getLegalMoveStyles(square)
        if (legalStyles) {
          setSelectedSquare(square)
          setMoveSquares(legalStyles)
        }
      }
    },
    [selectedSquare, fen, canDragPiece, getLegalMoveStyles, onPieceDrop],
  )

  return (
    <div className={styles.wrap}>
      <Chessboard
        options={{
          id: 'access-chess-board',
          position: fen,
          boardOrientation: orientation,
          lightSquareStyle: { backgroundColor: LIGHT_SQUARE },
          darkSquareStyle: { backgroundColor: DARK_SQUARE },
          lightSquareNotationStyle: { color: DARK_SQUARE },
          darkSquareNotationStyle: { color: LIGHT_SQUARE },
          dropSquareStyle: {
            boxShadow: 'inset 0 0 0 3px rgba(184, 134, 59, 0.95)',
          },
          animationDurationInMs: 180,
          canDragPiece: ({ piece }) => (canDragPiece ? canDragPiece(piece.pieceType) : true),
          onPieceDrag: handlePieceDrag,
          onPieceDragCancel: handlePieceDragCancel,
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          squareStyles: customSquareStyles,
        }}
      />
    </div>
  )
}
