import { useCallback, useMemo, useState } from 'react'
import { FOX_FILES, FOX_RANKS, parseSquare, toSquare } from '../../services/foxChessEngine'
import { PieceIcon } from './pieces/FoxPieceIcons'
import styles from './FoxChessBoard.module.css'

export function FoxChessBoard({
  game,
  orientation = 'white',
  onPieceDrop,
  canDragPiece,
  lastMove,
  disabled = false,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [draggingSquare, setDraggingSquare] = useState(null)
  const [promotionPending, setPromotionPending] = useState(null)

  // Compute displayed rows and columns based on board orientation
  const isWhite = orientation === 'white'

  // rankIndices: from top of screen to bottom
  // For white orientation: ranks 10 -> 1 (index 9 -> 0)
  // For black orientation: ranks 1 -> 10 (index 0 -> 9)
  const rankIndices = useMemo(() => {
    const indices = Array.from({ length: 10 }, (_, i) => i)
    return isWhite ? indices.reverse() : indices
  }, [isWhite])

  // fileIndices: from left of screen to right
  // For white orientation: files 0 -> 9 (a -> h)
  // For black orientation: files 9 -> 0 (h -> a)
  const fileIndices = useMemo(() => {
    const indices = Array.from({ length: 10 }, (_, i) => i)
    return isWhite ? indices : indices.reverse()
  }, [isWhite])

  // Map of legal destination squares for the currently selected square
  const legalMovesMap = useMemo(() => {
    if (!selectedSquare || !game) return {}
    void lastMove
    const moves = game.moves({ square: selectedSquare, verbose: true })
    const map = {}
    for (const m of moves) {
      map[m.to] = m
    }
    return map
  }, [selectedSquare, game, lastMove])

  // King currently in check square
  const checkKingSquare = useMemo(() => {
    void lastMove
    if (!game || !game.inCheck()) return null
    const king = game.findKing(game.turn())
    return king ? toSquare(king.f, king.r) : null
  }, [game, lastMove])

  // Attempt move or open promotion dialog if applicable
  const tryMakeMove = useCallback(
    (sourceSquare, targetSquare) => {
      if (disabled) return false
      const legal = legalMovesMap[targetSquare]
      if (!legal) return false

      // Check if move requires promotion
      if (legal.promotion) {
        setPromotionPending({ from: sourceSquare, to: targetSquare })
        return true
      }

      const success = onPieceDrop?.(sourceSquare, targetSquare)
      setSelectedSquare(null)
      return success
    },
    [disabled, legalMovesMap, onPieceDrop],
  )

  const handleSelectSquare = useCallback(
    (sq) => {
      if (disabled) return

      // If a square is already selected
      if (selectedSquare) {
        if (selectedSquare === sq) {
          // Deselect
          setSelectedSquare(null)
          return
        }

        // Is sq a valid move destination?
        if (legalMovesMap[sq]) {
          tryMakeMove(selectedSquare, sq)
          return
        }

        // Otherwise, check if sq has friendly movable piece to switch selection
        const parsed = parseSquare(sq)
        if (parsed) {
          const piece = game.getPiece(parsed.f, parsed.r)
          if (piece && piece.color === game.turn()) {
            if (!canDragPiece || canDragPiece(piece)) {
              setSelectedSquare(sq)
              return
            }
          }
        }

        setSelectedSquare(null)
        return
      }

      // No square selected yet: select if it contains active player's piece
      const parsed = parseSquare(sq)
      if (parsed) {
        const piece = game.getPiece(parsed.f, parsed.r)
        if (piece && piece.color === game.turn()) {
          if (!canDragPiece || canDragPiece(piece)) {
            setSelectedSquare(sq)
          }
        }
      }
    },
    [disabled, selectedSquare, legalMovesMap, game, canDragPiece, tryMakeMove],
  )

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e, sq, piece) => {
      if (disabled || (canDragPiece && !canDragPiece(piece))) {
        e.preventDefault()
        return
      }
      setDraggingSquare(sq)
      setSelectedSquare(sq)
      e.dataTransfer.setData('text/plain', sq)
      e.dataTransfer.effectAllowed = 'move'
    },
    [disabled, canDragPiece],
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e, targetSq) => {
      e.preventDefault()
      const sourceSq = e.dataTransfer.getData('text/plain') || draggingSquare
      setDraggingSquare(null)
      if (sourceSq && sourceSq !== targetSq) {
        tryMakeMove(sourceSq, targetSq)
      }
    },
    [draggingSquare, tryMakeMove],
  )

  // Promotion choice
  const handleChoosePromotion = (promoType) => {
    if (promotionPending) {
      onPieceDrop?.(promotionPending.from, promotionPending.to, promoType)
      setPromotionPending(null)
      setSelectedSquare(null)
    }
  }

  return (
    <div className={styles.boardContainer}>
      <div className={styles.grid}>
        {rankIndices.map((r, rowIdx) =>
          fileIndices.map((f, colIdx) => {
            const sq = toSquare(f, r)
            const piece = game ? game.getPiece(f, r) : null
            const isLight = (f + r) % 2 !== 0
            const isSelected = selectedSquare === sq
            const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq)
            const isCheck = checkKingSquare === sq
            const isLegalDest = Boolean(legalMovesMap[sq])
            const isCapture = isLegalDest && Boolean(legalMovesMap[sq].captured)

            // Piece identifier for renderPiece (e.g. 'wP', 'wRF', 'bF', etc.)
            let pieceCode = null
            if (piece) {
              const typeCode = piece.type === 'rf' ? 'RF' : piece.type.toUpperCase()
              pieceCode = `${piece.color}${typeCode}`
            }

            // Show coordinates on the outer edges
            const showRank = colIdx === 0
            const showFile = rowIdx === 9

            return (
              <div
                key={sq}
                className={`
                  ${styles.square}
                  ${isLight ? styles.light : styles.dark}
                  ${isLastMove ? styles.lastMove : ''}
                  ${isSelected ? styles.selected : ''}
                  ${isCheck ? styles.inCheck : ''}
                `}
                onClick={() => handleSelectSquare(sq)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, sq)}
              >
                {/* Coordinate notations */}
                {showRank && (
                  <span
                    className={`${styles.coordRank} ${isLight ? styles.darkText : styles.lightText}`}
                  >
                    {FOX_RANKS[r]}
                  </span>
                )}
                {showFile && (
                  <span
                    className={`${styles.coordFile} ${isLight ? styles.darkText : styles.lightText}`}
                  >
                    {FOX_FILES[f]}
                  </span>
                )}

                {/* Legal move destination hints */}
                {isLegalDest && !isCapture && <div className={styles.hintDot} />}
                {isCapture && <div className={styles.hintCapture} />}

                {/* Chess piece */}
                {pieceCode && (
                  <div
                    className={`${styles.piece} ${draggingSquare === sq ? styles.dragging : ''}`}
                    draggable={!disabled && (!canDragPiece || canDragPiece(piece))}
                    onDragStart={(e) => handleDragStart(e, sq, piece)}
                  >
                    <PieceIcon pieceCode={pieceCode} />
                  </div>
                )}
              </div>
            )
          }),
        )}
      </div>

      {/* Pawn Promotion Modal */}
      {promotionPending && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e1c1a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '18px 24px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
            }}
          >
            <p
              style={{
                color: '#f0d9b5',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              Promote Pawn to:
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { type: 'q', name: 'Queen', code: `${game.turn()}Q` },
                { type: 'f', name: 'Normal Fox', code: `${game.turn()}F` },
                { type: 'rf', name: 'Red-eared Fox', code: `${game.turn()}RF` },
                { type: 'r', name: 'Rook', code: `${game.turn()}R` },
                { type: 'b', name: 'Bishop', code: `${game.turn()}B` },
                { type: 'n', name: 'Knight', code: `${game.turn()}N` },
              ].map(({ type, name, code }) => (
                <button
                  key={type}
                  onClick={() => handleChoosePromotion(type)}
                  title={name}
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#2b2927',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                >
                  <PieceIcon pieceCode={code} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
