import { Chessboard } from 'react-chessboard'
import styles from './ChessBoard.module.css'

// The board keeps traditional light/dark squares — the app palette never
// touches the playing surface, only the chrome around it.
// const LIGHT_SQUARE = '#f0d9b5'
// const DARK_SQUARE = '#b58863'
// const LIGHT_SQUARE = '#30dca6'
// const DARK_SQUARE = '#63615f'

const LIGHT_SQUARE = '#f0d9b5'
const DARK_SQUARE = '#63615f'

export function ChessBoard({ fen, orientation, onPieceDrop, canDragPiece }) {
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
          canDragPiece: ({ piece }) => canDragPiece(piece.pieceType),
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) return false
            return onPieceDrop(sourceSquare, targetSquare)
          },
        }}
      />
    </div>
  )
}
