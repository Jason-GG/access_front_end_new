import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieceIcon } from '../../components/chess/pieces/FoxPieceIcons'
import { Button } from '../../components/common/Button'
import { lessons } from '../../data/lessons'
import {
  computePieceMoves10,
  FILES_10,
  FILES_8,
  PIECE_RULES_DATA,
  SPECIAL_RULES_DATA,
  STARTING_LINEUP_10,
  STARTING_LINEUP_8,
  toSquare10,
} from '../../data/pieceRulesData'
import { ROUTES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import styles from './LearnPage.module.css'

const GLYPHS = ['♟', '♞', '♜', '♝', '♛', '♘']

// ---------------------------------------------------------------------------
// Self-Animating 7x7 Mini-Board for each Piece Card in the Overview Grid
// ---------------------------------------------------------------------------
function MiniPieceAnimator({ piece, onInspect }) {
  const { miniBoard } = piece
  const [frameIdx, setFrameIdx] = useState(0)

  useEffect(() => {
    const frames = miniBoard?.keyframes || []
    if (frames.length <= 1) return undefined
    const timer = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % frames.length)
    }, 1500)
    return () => clearInterval(timer)
  }, [miniBoard])

  const currentPos = miniBoard?.keyframes?.[frameIdx] || miniBoard?.center || { row: 3, col: 3 }
  const centerPos = miniBoard?.center || { row: 3, col: 3 }
  const isMovingFromCenter =
    currentPos.row !== centerPos.row || currentPos.col !== centerPos.col

  const targetSet = useMemo(() => {
    const set = new Set()
    for (const t of miniBoard?.targets || []) {
      set.add(`${t.row},${t.col}`)
    }
    return set
  }, [miniBoard])

  const blockerMap = useMemo(() => {
    const map = new Map()
    for (const b of miniBoard?.blockers || []) {
      map.set(`${b.row},${b.col}`, b.code)
    }
    return map
  }, [miniBoard])

  return (
    <div className={styles.miniCard}>
      <div className={styles.miniCardHeader}>
        <div className={styles.miniTitleRow}>
          <span className={styles.miniIconBadge}>
            <PieceIcon piece={piece.code} className={styles.miniHeaderSvg} />
          </span>
          <div>
            <div className={styles.miniNameRow}>
              <h3 className={styles.miniPieceName}>{piece.name}</h3>
              <span
                className={cx(
                  styles.miniCategoryPill,
                  piece.category === 'fox' ? styles.pillFox : styles.pillStandard,
                )}
              >
                {piece.badge}
              </span>
            </div>
            <p className={styles.miniSubtitle}>{piece.subtitle}</p>
          </div>
        </div>
        <span className={cx(styles.miniValueBadge, 'notation')} title="Piece point value">
          {piece.value === '∞' ? 'Royal' : `${piece.value} pts`}
        </span>
      </div>

      <div className={styles.miniBoardWrap}>
        <div className={styles.miniBoardGrid} aria-label={`Animated ${piece.name} movement preview`}>
          {Array.from({ length: 49 }, (_, idx) => {
            const r = Math.floor(idx / 7)
            const c = idx % 7
            const isLight = (r + c) % 2 === 0
            const key = `${r},${c}`
            const isTarget = targetSet.has(key)
            const isOrigin = r === centerPos.row && c === centerPos.col
            const isDestination = r === currentPos.row && c === currentPos.col
            const blockerCode = blockerMap.get(key)
            const hideCapturedBlocker = isDestination && blockerCode?.startsWith('b')

            return (
              <div
                key={key}
                className={cx(
                  styles.miniCell,
                  isLight ? styles.miniCellLight : styles.miniCellDark,
                  isOrigin && styles.miniCellOrigin,
                  isDestination && isMovingFromCenter && styles.miniCellActiveDest,
                )}
              >
                {isTarget && !blockerCode && (
                  <span className={styles.miniDot} aria-hidden="true" />
                )}
                {isTarget && blockerCode?.startsWith('b') && (
                  <span className={styles.miniCaptureRing} aria-hidden="true" />
                )}
                {blockerCode && !hideCapturedBlocker && (
                  <span className={styles.miniBlockerPiece}>
                    <PieceIcon piece={blockerCode} className={styles.miniPieceSvg} />
                  </span>
                )}
                {isOrigin && isMovingFromCenter && (
                  <span className={styles.originGhostWrap} aria-hidden="true">
                    <PieceIcon piece={piece.code} className={styles.miniPieceSvg} />
                  </span>
                )}
              </div>
            )
          })}

          {/* SVG trajectory line from centerPos to currentPos */}
          <svg className={styles.miniBoardSvg} viewBox="0 0 700 700" aria-hidden="true">
            {isMovingFromCenter && (
              <line
                x1={centerPos.col * 100 + 50}
                y1={centerPos.row * 100 + 50}
                x2={currentPos.col * 100 + 50}
                y2={currentPos.row * 100 + 50}
                className={
                  piece.canJump ? styles.miniTrajectoryJump : styles.miniTrajectorySlide
                }
              />
            )}
          </svg>

          {/* Animated floating piece */}
          <div
            className={cx(
              styles.miniFloatingPiece,
              piece.canJump && isMovingFromCenter && styles.miniFloatingJump,
            )}
            style={{
              top: `${(currentPos.row / 7) * 100}%`,
              left: `${(currentPos.col / 7) * 100}%`,
            }}
          >
            <PieceIcon piece={piece.code} className={styles.miniPieceSvg} />
          </div>
        </div>
      </div>

      <div className={styles.miniSpecs}>
        <div className={styles.miniSpecRow}>
          <span className={styles.miniSpecLabel}>Pattern</span>
          <strong className={styles.miniSpecValue}>{piece.formula}</strong>
        </div>
        <div className={styles.miniSpecRow}>
          <span className={styles.miniSpecLabel}>Obstacles</span>
          <span
            className={cx(
              styles.miniJumpTag,
              piece.canJump ? styles.jumpTagYes : styles.jumpTagNo,
            )}
          >
            {piece.canJump ? 'Jumps over pieces' : 'Blocked by pieces'}
          </span>
        </div>
      </div>

      <p className={styles.miniSummary}>{piece.summary}</p>

      <div className={styles.miniFooter}>
        <span className={cx(styles.miniStartFiles, 'notation')}>
          Start: {piece.startSquares10}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onInspect(piece.id)}>
          Interactive Demo →
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Interactive 10x10 Animated Piece Lab
// ---------------------------------------------------------------------------
function InteractivePieceLab({ selectedPieceId, onSelectPiece, labRef }) {
  const piece = useMemo(
    () => PIECE_RULES_DATA.find((p) => p.id === selectedPieceId) || PIECE_RULES_DATA[0],
    [selectedPieceId],
  )

  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [phase, setPhase] = useState('start') // 'start' | 'moved'
  const [autoPlay, setAutoPlay] = useState(true)
  const [customPos, setCustomPos] = useState(null) // { from, to, current, others } when user clicks board

  // Reset scenario when piece changes
  useEffect(() => {
    setScenarioIdx(0)
    setPhase('start')
    setCustomPos(null)
  }, [selectedPieceId])

  const activeScenario = piece.scenarios[scenarioIdx] || piece.scenarios[0]

  // Auto-play loop: alternates 'start' -> 'moved' -> advances to next scenario
  useEffect(() => {
    if (!autoPlay || customPos) return undefined
    const duration = phase === 'start' ? 1400 : 2200
    const timer = setTimeout(() => {
      if (phase === 'start') {
        setPhase('moved')
      } else {
        setPhase('start')
        setScenarioIdx((prev) => (prev + 1) % piece.scenarios.length)
      }
    }, duration)
    return () => clearTimeout(timer)
  }, [autoPlay, customPos, phase, piece.scenarios.length])

  // Determine current piece position and board pieces
  const originPos = customPos ? customPos.from : activeScenario.from
  const targetPos = customPos ? customPos.to : activeScenario.to
  const currentPos = customPos
    ? customPos.current
    : phase === 'moved'
      ? activeScenario.to
      : activeScenario.from
  const activeOthers = useMemo(
    () => (customPos ? customPos.others : activeScenario.others || []),
    [customPos, activeScenario],
  )

  // Compute legal moves from the piece's current origin so user sees all valid squares
  const legalMovesFromOrigin = useMemo(
    () => computePieceMoves10(piece.id, originPos.row, originPos.col, activeOthers),
    [piece.id, originPos.row, originPos.col, activeOthers],
  )

  // Also compute legal moves from currentPos when in interactive mode
  const interactiveMoves = useMemo(
    () => computePieceMoves10(piece.id, currentPos.row, currentPos.col, activeOthers),
    [piece.id, currentPos.row, currentPos.col, activeOthers],
  )

  const displayedMoves = customPos ? interactiveMoves : legalMovesFromOrigin

  const moveMap = useMemo(() => {
    const map = new Map()
    for (const m of displayedMoves) {
      map.set(`${m.row},${m.col}`, m)
    }
    return map
  }, [displayedMoves])

  // Find the active trajectory path for the currently animated move
  const activeMoveDetail = useMemo(() => {
    const fromMoves = computePieceMoves10(piece.id, originPos.row, originPos.col, activeOthers)
    return (
      fromMoves.find((m) => m.row === targetPos.row && m.col === targetPos.col) || {
        row: targetPos.row,
        col: targetPos.col,
        steps: [],
        isJump: piece.canJump,
      }
    )
  }, [piece.id, piece.canJump, originPos, targetPos, activeOthers])

  const stepIndexMap = useMemo(() => {
    const map = new Map()
    const steps = activeMoveDetail?.steps || []
    steps.forEach((s, i) => {
      map.set(`${s.row},${s.col}`, i + 1)
    })
    return map
  }, [activeMoveDetail])

  // Handle user clicking a square on the 10x10 board to test moves interactively
  const handleSquareClick = useCallback(
    (r, c) => {
      const key = `${r},${c}`
      const candidate = moveMap.get(key)
      if (!candidate) return

      setAutoPlay(false)
      const prevSquare = customPos ? customPos.current : currentPos
      const remainingOthers = activeOthers.filter((o) => !(o.row === r && o.col === c))
      setCustomPos({
        from: prevSquare,
        to: { row: r, col: c },
        current: { row: r, col: c },
        others: remainingOthers,
      })
    },
    [moveMap, customPos, currentPos, activeOthers],
  )

  const handleSelectScenario = (idx) => {
    setCustomPos(null)
    setScenarioIdx(idx)
    setPhase('start')
    setTimeout(() => setPhase('moved'), 450)
  }

  const handleReplayStep = () => {
    setCustomPos(null)
    setPhase('start')
    setTimeout(() => setPhase('moved'), 350)
  }

  const handleResetSandbox = () => {
    setCustomPos(null)
    setPhase('start')
    setAutoPlay(true)
  }

  const isAtTarget =
    currentPos.row === targetPos.row && currentPos.col === targetPos.col

  // Display piece icon (supports Pawn promotion in Scenario 3!)
  const displayedPieceCode =
    !customPos && isAtTarget && activeScenario.promotedCode
      ? activeScenario.promotedCode
      : piece.code

  // Special Castling Rook animation when King is in Scenario 3 (e1 -> f1, Rook h1 -> β1)
  const isCastlingScenario =
    !customPos &&
    piece.id === 'k' &&
    originPos.row === 9 &&
    originPos.col === 5 &&
    targetPos.row === 9 &&
    targetPos.col === 7

  return (
    <div className={styles.labContainer} ref={labRef}>
      {/* Piece Selector Tabs */}
      <div className={styles.pieceTabs} role="tablist" aria-label="Select chess piece">
        {PIECE_RULES_DATA.map((item) => {
          const active = item.id === piece.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cx(
                styles.pieceTab,
                active && styles.pieceTabActive,
                item.category === 'fox' && styles.pieceTabFox,
              )}
              onClick={() => onSelectPiece(item.id)}
            >
              <span className={styles.pieceTabIcon}>
                <PieceIcon piece={item.code} className={styles.tabSvg} />
              </span>
              <span className={styles.pieceTabText}>
                <span className={styles.pieceTabName}>{item.name}</span>
                <span className={cx(styles.pieceTabMeta, 'notation')}>
                  {item.category === 'fox' ? '10×10 Fox' : 'Classic'} ·{' '}
                  {item.value === '∞' ? 'Royal' : `${item.value}pt`}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Main Split View: Animated 10x10 Board (Left) + Rule Breakdown (Right) */}
      <div className={styles.labGrid}>
        <div className={styles.boardPanel}>
          <div className={styles.boardTopBar}>
            <div className={styles.liveIndicator}>
              <span
                className={cx(
                  styles.pulseDot,
                  autoPlay && !customPos ? styles.pulseDotLive : styles.pulseDotInteractive,
                )}
              />
              <span className="notation">
                {customPos
                  ? `Interactive Sandbox · At ${toSquare10(currentPos.row, currentPos.col)} (Click any green dot to move!)`
                  : `${activeScenario.title} · ${toSquare10(originPos.row, originPos.col)} → ${toSquare10(targetPos.row, targetPos.col)}`}
              </span>
            </div>

            <div className={styles.playbackControls}>
              <button
                type="button"
                className={cx(styles.controlBtn, autoPlay && !customPos && styles.controlBtnActive)}
                onClick={() => {
                  if (customPos) {
                    handleResetSandbox()
                  } else {
                    setAutoPlay((prev) => !prev)
                  }
                }}
              >
                {autoPlay && !customPos ? '⏸ Pause Auto' : '▶ Auto-Play'}
              </button>
              <button type="button" className={styles.controlBtn} onClick={handleReplayStep}>
                ↻ Replay Move
              </button>
              {customPos && (
                <button type="button" className={styles.controlBtn} onClick={handleResetSandbox}>
                  Reset Demo
                </button>
              )}
            </div>
          </div>

          {/* 10x10 Demonstration Board */}
          <div className={styles.demoBoardFrame}>
            <div className={styles.demoBoardGrid}>
              {Array.from({ length: 100 }, (_, idx) => {
                const r = Math.floor(idx / 10)
                const c = idx % 10
                const isLight = (r + c) % 2 === 0
                const key = `${r},${c}`
                const moveInfo = moveMap.get(key)
                const isOrigin = r === originPos.row && c === originPos.col
                const isTarget = r === targetPos.row && c === targetPos.col
                const isCurrent = r === currentPos.row && c === currentPos.col
                const stepNum = stepIndexMap.get(key)

                // Check if Normal Fox 5-square boundary applies around origin
                const chebyshevDist = Math.max(
                  Math.abs(r - (customPos ? currentPos.row : originPos.row)),
                  Math.abs(c - (customPos ? currentPos.col : originPos.col)),
                )
                const isFoxRangeEdge = piece.id === 'f' && chebyshevDist === 5

                // Find if an ally/enemy blocker sits on this square
                const otherPiece = activeOthers.find((o) => {
                  if (isCastlingScenario && o.code === 'wR') return false
                  return o.row === r && o.col === c
                })
                const isCapturedNow =
                  otherPiece?.side === 'enemy' && isAtTarget && r === targetPos.row && c === targetPos.col

                return (
                  <button
                    key={key}
                    type="button"
                    className={cx(
                      styles.demoSquare,
                      isLight ? styles.demoSquareLight : styles.demoSquareDark,
                      isOrigin && styles.demoSquareOrigin,
                      isTarget && styles.demoSquareTarget,
                      isFoxRangeEdge && styles.demoSquareFoxLimit,
                      moveInfo && styles.demoSquareClickable,
                    )}
                    onClick={() => handleSquareClick(r, c)}
                    title={`${toSquare10(r, c)}${moveInfo ? ' — Click to animate move here' : ''}`}
                  >
                    {/* Coordinate labels on left file and bottom rank */}
                    {c === 0 && (
                      <span className={cx(styles.rankCoord, 'notation')}>{10 - r}</span>
                    )}
                    {r === 9 && (
                      <span
                        className={cx(
                          styles.fileCoord,
                          'notation',
                          (FILES_10[c] === 'α' || FILES_10[c] === 'β') && styles.fileCoordFox,
                        )}
                      >
                        {FILES_10[c]}
                      </span>
                    )}

                    {/* Intermediate step number badge (e.g., 1, 2, 3 for L-leap or sliding path) */}
                    {!customPos && stepNum && (
                      <span className={cx(styles.stepBadge, 'notation')}>{stepNum}</span>
                    )}

                    {/* Legal move indicator dot or capture ring */}
                    {moveInfo && !moveInfo.capture && !isCurrent && (
                      <span className={styles.legalMoveDot} aria-hidden="true" />
                    )}
                    {moveInfo && moveInfo.capture && !isCurrent && (
                      <span className={styles.legalCaptureRing} aria-hidden="true" />
                    )}

                    {/* Stationary blocker or enemy target piece */}
                    {otherPiece && !isCapturedNow && (
                      <span
                        className={cx(
                          styles.otherPieceWrap,
                          otherPiece.side === 'enemy' && styles.enemyPieceWrap,
                        )}
                      >
                        <PieceIcon piece={otherPiece.code} className={styles.boardPieceSvg} />
                      </span>
                    )}

                    {/* Origin ghost silhouette when the active piece has moved to target */}
                    {isOrigin && !isCurrent && (
                      <span className={styles.originGhostWrap} aria-hidden="true">
                        <PieceIcon piece={piece.code} className={styles.boardPieceSvg} />
                      </span>
                    )}
                  </button>
                )
              })}

              {/* SVG Trajectory Overlay for Arrows, L-Paths, and Leap Arcs */}
              <svg
                className={styles.trajectorySvg}
                viewBox="0 0 1000 1000"
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="moveArrowHead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 Z" fill="#0a7281" />
                  </marker>
                  <marker
                    id="jumpArrowHead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 Z" fill="#9384dd" />
                  </marker>
                </defs>

                {/* L-Shape orthogonal step path for leapers (Red-eared Fox & Knight) */}
                {piece.canJump && activeMoveDetail?.steps?.length > 0 && (
                  <polyline
                    points={[
                      `${originPos.col * 100 + 50},${originPos.row * 100 + 50}`,
                      ...activeMoveDetail.steps.map(
                        (s) => `${s.col * 100 + 50},${s.row * 100 + 50}`,
                      ),
                      `${targetPos.col * 100 + 50},${targetPos.row * 100 + 50}`,
                    ].join(' ')}
                    className={styles.svgLPath}
                  />
                )}

                {/* Direct trajectory line or curved leap arc */}
                {piece.canJump ? (
                  <path
                    d={`M ${originPos.col * 100 + 50} ${originPos.row * 100 + 50} Q ${
                      (originPos.col + targetPos.col) * 50 + 50
                    } ${(originPos.row + targetPos.row) * 50 - 30} ${
                      targetPos.col * 100 + 50
                    } ${targetPos.row * 100 + 50}`}
                    className={styles.svgJumpArc}
                    markerEnd="url(#jumpArrowHead)"
                  />
                ) : (
                  <line
                    x1={originPos.col * 100 + 50}
                    y1={originPos.row * 100 + 50}
                    x2={targetPos.col * 100 + 50}
                    y2={targetPos.row * 100 + 50}
                    className={styles.svgSlideLine}
                    markerEnd="url(#moveArrowHead)"
                  />
                )}
              </svg>

              {/* Castling Rook animated companion (h1 -> β1) */}
              {isCastlingScenario && (
                <div
                  className={cx(styles.animatedPieceActor, styles.jumpingActor)}
                  style={{
                    top: '90%',
                    left: isAtTarget ? '60%' : '90%',
                  }}
                >
                  <PieceIcon piece="wR" className={styles.actorPieceSvg} />
                </div>
              )}

              {/* Primary Animated Piece Actor */}
              <div
                className={cx(
                  styles.animatedPieceActor,
                  piece.canJump && isAtTarget && styles.jumpingActor,
                )}
                style={{
                  top: `${currentPos.row * 10}%`,
                  left: `${currentPos.col * 10}%`,
                }}
              >
                <PieceIcon piece={displayedPieceCode} className={styles.actorPieceSvg} />
                {!customPos && isAtTarget && activeScenario.promotedCode && (
                  <span className={styles.promotedStarBadge}>★ Promoted!</span>
                )}
              </div>
            </div>
          </div>

          {/* Scenario Selector Pills + Legend */}
          <div className={styles.scenarioBar}>
            <div className={styles.scenarioPills}>
              {piece.scenarios.map((scen, idx) => (
                <button
                  key={scen.title}
                  type="button"
                  className={cx(
                    styles.scenarioPill,
                    !customPos && scenarioIdx === idx && styles.scenarioPillActive,
                  )}
                  onClick={() => handleSelectScenario(idx)}
                >
                  {scen.title}
                </button>
              ))}
            </div>
            <div className={styles.boardLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDotMove} /> Legal move (click to test)
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDotCapture} /> Capture target
              </span>
              {piece.id === 'f' && (
                <span className={styles.legendItem}>
                  <span className={styles.legendFoxBoundary} /> 5-square max range limit
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Detailed Piece Rules & Move Explanation */}
        <div className={styles.infoPanel}>
          <div className={styles.infoHeader}>
            <div className={styles.dualPiecePreview}>
              <span className={styles.previewBoxLight} title={`White ${piece.name}`}>
                <PieceIcon piece={piece.code} className={styles.previewSvg} />
              </span>
              <span className={styles.previewBoxDark} title={`Black ${piece.name}`}>
                <PieceIcon piece={piece.blackCode} className={styles.previewSvg} />
              </span>
            </div>
            <div>
              <span className={cx(styles.infoBadge, 'notation')}>{piece.badge}</span>
              <h2 className={styles.infoTitle}>{piece.name}</h2>
              <p className={styles.infoSubtitle}>{piece.subtitle}</p>
            </div>
          </div>

          {/* Live Scenario Explanation Box */}
          <div className={styles.liveScenarioBox}>
            <div className={styles.liveScenarioHeader}>
              <span className={styles.liveScenarioTag}>
                {customPos ? 'Interactive Sandbox Move' : activeScenario.title}
              </span>
              <span className={cx(styles.liveCoords, 'notation')}>
                {toSquare10(originPos.row, originPos.col)} →{' '}
                {toSquare10(targetPos.row, targetPos.col)}
              </span>
            </div>
            <p className={styles.liveScenarioCaption}>
              {customPos
                ? `You moved the ${piece.name} to ${toSquare10(currentPos.row, currentPos.col)}! Click any highlighted green dot or red target ring on the 10×10 board to animate its next legal move.`
                : activeScenario.caption}
            </p>
            {!customPos && activeScenario.specialNote && (
              <p className={styles.specialMoveNote}>✨ {activeScenario.specialNote}</p>
            )}
          </div>

          {/* Quick Spec Grid */}
          <div className={styles.specGrid}>
            <div className={styles.specCard}>
              <span className={styles.specLabel}>Movement Formula</span>
              <strong className={styles.specVal}>{piece.formula}</strong>
            </div>
            <div className={styles.specCard}>
              <span className={styles.specLabel}>Jumping Ability</span>
              <strong
                className={cx(
                  styles.specVal,
                  piece.canJump ? styles.textFoxAccent : styles.textTealAccent,
                )}
              >
                {piece.canJump ? 'Jumps Over Pieces' : 'Blocked by Pieces'}
              </strong>
            </div>
            <div className={styles.specCard}>
              <span className={styles.specLabel}>10×10 Starting Squares</span>
              <strong className={cx(styles.specVal, 'notation')}>{piece.startSquares10}</strong>
            </div>
            <div className={styles.specCard}>
              <span className={styles.specLabel}>8×8 Starting Squares</span>
              <strong className={cx(styles.specVal, 'notation')}>{piece.startSquares8}</strong>
            </div>
          </div>

          {/* Complete Rules Checklist */}
          <div className={styles.rulesListSection}>
            <h3 className={styles.rulesHeading}>Movement & Capture Rules</h3>
            <ul className={styles.rulesChecklist}>
              {piece.rules.map((rule) => (
                <li key={rule} className={styles.rulesCheckItem}>
                  <span className={styles.checkBullet} aria-hidden="true">
                    ✓
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tactical Tip */}
          <div className={styles.tacticalTipBox}>
            <span className={styles.tipLabel}>Coach’s Tactical Tip</span>
            <p className={styles.tipText}>{piece.tacticalTip}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interactive 10x10 vs 8x8 Starting Lineup Explorer
// ---------------------------------------------------------------------------
function StartingLineupExplorer({ onSelectPiece }) {
  const [boardMode, setBoardMode] = useState('10x10') // '10x10' | '8x8'
  const lineup = boardMode === '10x10' ? STARTING_LINEUP_10 : STARTING_LINEUP_8
  const files = boardMode === '10x10' ? FILES_10 : FILES_8
  const [selectedCol, setSelectedCol] = useState(3) // default to α file in 10x10

  const safeCol = selectedCol < lineup.length ? selectedCol : 0
  const selectedSlot = lineup[safeCol]

  return (
    <div className={styles.lineupExplorer}>
      <div className={styles.lineupHeader}>
        <div>
          <p className="eyebrow">Board Architecture</p>
          <h2 className="section-heading">Starting Lineup & Coordinate Files</h2>
          <p className={styles.sectionLead}>
            10×10 Fox Chess inserts two special files — <strong>α (Alpha)</strong> for the
            Red-eared Fox and <strong>β (Beta)</strong> for the Normal Fox — expanding the classic
            64-square board into a 100-square tactical arena. Click any file below to inspect its
            piece.
          </p>
        </div>

        <div className={styles.modeToggle} role="tablist" aria-label="Board size">
          <button
            type="button"
            className={cx(styles.modeBtn, boardMode === '10x10' && styles.modeBtnActive)}
            onClick={() => {
              setBoardMode('10x10')
              setSelectedCol(3)
            }}
          >
            10×10 Fox Chess (100 Squares)
          </button>
          <button
            type="button"
            className={cx(styles.modeBtn, boardMode === '8x8' && styles.modeBtnActive)}
            onClick={() => {
              setBoardMode('8x8')
              setSelectedCol(3)
            }}
          >
            8×8 Standard Chess (64 Squares)
          </button>
        </div>
      </div>

      {/* Interactive 2-Rank Strip (Pawn Rank + Officer Back Rank) */}
      <div className={styles.lineupStripWrap}>
        <div
          className={cx(
            styles.lineupStrip,
            boardMode === '10x10' ? styles.lineupStrip10 : styles.lineupStrip8,
          )}
        >
          {/* Rank 2: Frontline Pawns */}
          {lineup.map((slot, idx) => {
            const isLight = (1 + idx) % 2 === 0
            const isSelected = idx === safeCol
            return (
              <button
                key={`pawn-${slot.file}`}
                type="button"
                className={cx(
                  styles.lineupCell,
                  isLight ? styles.demoSquareLight : styles.demoSquareDark,
                  isSelected && styles.lineupCellSelected,
                )}
                onClick={() => setSelectedCol(idx)}
              >
                <span className={cx(styles.cellCoordTop, 'notation')}>{slot.file}2</span>
                <PieceIcon piece="wP" className={styles.lineupPieceSvg} />
              </button>
            )
          })}

          {/* Rank 1: Back-Rank Officers & Foxes */}
          {lineup.map((slot, idx) => {
            const isLight = idx % 2 === 0
            const isSelected = idx === safeCol
            return (
              <button
                key={`officer-${slot.file}`}
                type="button"
                className={cx(
                  styles.lineupCell,
                  isLight ? styles.demoSquareLight : styles.demoSquareDark,
                  slot.isSpecial && styles.lineupCellFox,
                  isSelected && styles.lineupCellSelected,
                )}
                onClick={() => setSelectedCol(idx)}
              >
                <span className={cx(styles.cellCoordTop, 'notation')}>{slot.file}1</span>
                <PieceIcon piece={slot.code} className={styles.lineupPieceSvg} />
                <span
                  className={cx(
                    styles.fileBadgeBottom,
                    'notation',
                    slot.isSpecial && styles.fileBadgeFox,
                  )}
                >
                  { files[idx] }
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected File Callout Bar */}
      {selectedSlot && (
        <div className={styles.lineupDetailBar}>
          <div className={styles.lineupDetailLeft}>
            <span className={styles.lineupDetailIcon}>
              <PieceIcon piece={selectedSlot.code} className={styles.previewSvg} />
            </span>
            <div>
              <div className={styles.lineupDetailTitleRow}>
                <strong className={styles.lineupDetailName}>
                  File &ldquo;{selectedSlot.file}&rdquo; — {selectedSlot.name} ({selectedSlot.file}1)
                </strong>
                {selectedSlot.isSpecial && (
                  <span className={styles.pillFox}>10×10 Exclusive Fox File</span>
                )}
              </div>
              <p className={styles.lineupDetailRole}>
                {selectedSlot.role} · Protected in front by the <strong>{selectedSlot.file}2</strong>{' '}
                Pawn.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSelectPiece(selectedSlot.pieceId)}
          >
            Animate {selectedSlot.name} Moves ↑
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Animated Special Rules Section (Castling + Promotion + En Passant + Checkmate)
// ---------------------------------------------------------------------------
function AnimatedSpecialRules() {
  const [castleSide, setCastleSide] = useState('kingside') // 'kingside' | 'queenside'
  const [castleMoved, setCastleMoved] = useState(false)
  const [promoIndex, setPromoIndex] = useState(0)

  const promoChoices = useMemo(
    () => [
      { code: 'wRF', name: 'Red-eared Fox (α Leaper)' },
      { code: 'wF', name: 'Normal Fox (5-Sq Queen)' },
      { code: 'wQ', name: 'Queen (Unlimited)' },
      { code: 'wR', name: 'Rook' },
      { code: 'wB', name: 'Bishop' },
      { code: 'wN', name: 'Knight' },
    ],
    [],
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setCastleMoved((prev) => !prev)
      setPromoIndex((prev) => (prev + 1) % promoChoices.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [promoChoices.length])

  const kingCol = !castleMoved ? 5 : castleSide === 'kingside' ? 7 : 3
  const rookCol =
    castleSide === 'kingside' ? (!castleMoved ? 9 : 6) : !castleMoved ? 0 : 4

  return (
    <div className={styles.specialSection}>
      <div className={styles.specialHeader}>
        <p className="eyebrow">Special Mechanics</p>
        <h2 className="section-heading">Castling, Fox Promotion & Endgame Rules</h2>
      </div>

      {/* Live Animated Mini-Demos for Castling & Fox Pawn Promotion */}
      <div className={styles.specialAnimRow}>
        {/* Animated 10x10 Castling Strip */}
        <div className={styles.specialDemoCard}>
          <div className={styles.specialDemoTop}>
            <div>
              <span className={cx(styles.infoBadge, 'notation')}>Live Animation</span>
              <h3 className={styles.specialDemoTitle}>10×10 Castling Trajectory</h3>
            </div>
            <div className={styles.castleToggle}>
              <button
                type="button"
                className={cx(
                  styles.controlBtn,
                  castleSide === 'kingside' && styles.controlBtnActive,
                )}
                onClick={() => {
                  setCastleSide('kingside')
                  setCastleMoved(false)
                }}
              >
                Kingside (O-O)
              </button>
              <button
                type="button"
                className={cx(
                  styles.controlBtn,
                  castleSide === 'queenside' && styles.controlBtnActive,
                )}
                onClick={() => {
                  setCastleSide('queenside')
                  setCastleMoved(false)
                }}
              >
                Queenside (O-O-O)
              </button>
            </div>
          </div>

          <div className={styles.rankStrip10}>
            {FILES_10.map((file, idx) => {
              const passivePieceCode =
                castleSide === 'kingside'
                  ? idx === 0
                    ? 'wR'
                    : idx === 1
                      ? 'wN'
                      : idx === 2
                        ? 'wB'
                        : idx === 3
                          ? 'wRF'
                          : idx === 4
                            ? 'wQ'
                            : null
                  : idx === 6
                    ? 'wF'
                    : idx === 7
                      ? 'wB'
                      : idx === 8
                        ? 'wN'
                        : idx === 9
                          ? 'wR'
                          : null

              return (
                <div
                  key={file}
                  className={cx(
                    styles.stripSquare,
                    idx % 2 === 0 ? styles.demoSquareLight : styles.demoSquareDark,
                    idx === 5 && styles.demoSquareOrigin,
                    (idx === 7 || idx === 3) && styles.demoSquareTarget,
                  )}
                >
                  <span className={cx(styles.stripCoord, 'notation')}>{file}1</span>
                  {passivePieceCode && (
                    <span className={styles.stripPassivePiece}>
                      <PieceIcon piece={passivePieceCode} className={styles.stripSvg} />
                    </span>
                  )}
                </div>
              )
            })}
            <div
              className={styles.stripActor}
              style={{ left: `${kingCol * 10}%` }}
              title="White King"
            >
              <PieceIcon piece="wK" className={styles.stripSvg} />
            </div>
            <div
              className={styles.stripActor}
              style={{ left: `${rookCol * 10}%` }}
              title="White Rook"
            >
              <PieceIcon piece="wR" className={styles.stripSvg} />
            </div>
          </div>

          <p className={styles.specialDemoCaption}>
            {castleSide === 'kingside' ? (
              <>
                <strong>Kingside Castling (O-O):</strong> King slides 2 squares right{' '}
                <code>e1 → f1</code>, while the h1 Rook leaps over to <code>β1</code>!
              </>
            ) : (
              <>
                <strong>Queenside Castling (O-O-O):</strong> King slides 2 squares left{' '}
                <code>e1 → α1</code>, while the a1 Rook leaps over to <code>d1</code>!
              </>
            )}
          </p>
        </div>

        {/* Animated Pawn Promotion Showcase */}
        <div className={styles.specialDemoCard}>
          <div className={styles.specialDemoTop}>
            <div>
              <span className={cx(styles.infoBadge, 'notation')}>Live Animation</span>
              <h3 className={styles.specialDemoTitle}>Rank 10 Pawn Promotion (6 Choices)</h3>
            </div>
            <span className={cx(styles.promoActiveBadge, 'notation')}>
              Promoting to: {promoChoices[promoIndex].name}
            </span>
          </div>

          <div className={styles.promoChoicesStrip}>
            {promoChoices.map((choice, idx) => (
              <button
                key={choice.code}
                type="button"
                className={cx(
                  styles.promoChoiceBox,
                  idx === promoIndex && styles.promoChoiceBoxActive,
                )}
                onClick={() => setPromoIndex(idx)}
              >
                <PieceIcon piece={choice.code} className={styles.promoSvg} />
                <span className={styles.promoChoiceLabel}>{choice.name.split(' (')[0]}</span>
              </button>
            ))}
          </div>

          <p className={styles.specialDemoCaption}>
            When a Pawn reaches Rank 10 (White) or Rank 1 (Black) in Fox Chess, it can promote not
            only to a classic officer, but also to a <strong>Red-eared Fox</strong> or{' '}
            <strong>Normal Fox</strong>!
          </p>
        </div>
      </div>

      {/* Special Rules Cards Grid */}
      <div className={styles.specialGrid}>
        {SPECIAL_RULES_DATA.map((rule) => (
          <article key={rule.id} className={styles.specialCard}>
            <span className={cx(styles.infoBadge, 'notation')}>{rule.badge}</span>
            <h3 className={styles.specialCardTitle}>{rule.title}</h3>
            <p className={styles.specialCardSub}>{rule.subtitle}</p>
            <p className={styles.specialCardBody}>{rule.description}</p>
            <ul className={styles.specialBulletList}>
              {rule.details10x10.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {rule.details8x8.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}

function toSquare8(row, col) {
  return `${FILES_8[col] || '?'}${8 - row}`
}

// ---------------------------------------------------------------------------
// Interactive Study Module Workbench (Animated Walkthrough + Find-the-Move Quiz)
// ---------------------------------------------------------------------------
function StudyModuleWorkbench({
  lesson,
  completedIds,
  onMarkCompleted,
  onSelectLesson,
  studyRef,
}) {
  const [mode, setMode] = useState('walkthrough') // 'walkthrough' | 'puzzle'
  const [stepIdx, setStepIdx] = useState(0)
  const [phase, setPhase] = useState('start') // 'start' | 'moved'
  const [autoPlay, setAutoPlay] = useState(true)
  const [puzzleFeedback, setPuzzleFeedback] = useState(null) // { ok: boolean, message: string }
  const [puzzleSolved, setPuzzleSolved] = useState(false)

  useEffect(() => {
    setMode('walkthrough')
    setStepIdx(0)
    setPhase('start')
    setAutoPlay(true)
    setPuzzleFeedback(null)
    setPuzzleSolved(false)
  }, [lesson.id])

  const steps = lesson.steps || []
  const activeStep = steps[stepIdx] || steps[0]

  useEffect(() => {
    if (mode !== 'walkthrough' || !autoPlay || !activeStep) return undefined
    const delay = phase === 'start' ? 1300 : 2400
    const timer = setTimeout(() => {
      if (phase === 'start') {
        setPhase('moved')
      } else {
        setPhase('start')
        setStepIdx((prev) => (prev + 1) % steps.length)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [mode, autoPlay, phase, activeStep, steps.length])

  const puzzle = lesson.puzzle
  const actorInfo = mode === 'puzzle' ? puzzle?.actor : activeStep?.actor
  const originPos = actorInfo?.from || { row: 6, col: 4 }
  const targetPos =
    mode === 'puzzle'
      ? puzzle?.solution || originPos
      : activeStep?.actor?.to || originPos
  const currentPos =
    mode === 'puzzle'
      ? puzzleSolved
        ? targetPos
        : originPos
      : phase === 'moved'
        ? targetPos
        : originPos

  const boardPieces = useMemo(
    () => (mode === 'puzzle' ? puzzle?.pieces || [] : activeStep?.pieces || []),
    [mode, puzzle, activeStep],
  )

  const highlightMap = useMemo(() => {
    const map = new Map()
    if (mode === 'walkthrough') {
      for (const h of activeStep?.highlights || []) {
        map.set(`${h.row},${h.col}`, h.tone)
      }
    }
    return map
  }, [mode, activeStep])

  const puzzleOptionMap = useMemo(() => {
    const map = new Map()
    if (mode === 'puzzle' && puzzle?.options) {
      for (const opt of puzzle.options) {
        map.set(`${opt.row},${opt.col}`, opt)
      }
    }
    return map
  }, [mode, puzzle])

  const handleBoardSquareClick = (r, c) => {
    if (mode !== 'puzzle' || !puzzle) return
    const opt = puzzleOptionMap.get(`${r},${c}`)
    if (!opt) return

    if (r === puzzle.solution.row && c === puzzle.solution.col) {
      setPuzzleSolved(true)
      setPuzzleFeedback({
        ok: true,
        message: `${puzzle.solution.notation} — ${puzzle.solution.explanation}`,
      })
      onMarkCompleted(lesson.id)
    } else {
      setPuzzleSolved(false)
      setPuzzleFeedback({
        ok: false,
        message: `${opt.label} is not the strongest continuation here. Re-check the coaching principles and try another candidate square!`,
      })
    }
  }

  const nextLesson = lessons[lesson.id % lessons.length]

  return (
    <div className={styles.studyWorkbench} ref={studyRef}>
      {/* Module Switcher Header */}
      <div className={styles.studySwitchBar}>
        <div className={styles.studyModuleTabs}>
          {lessons.map((item) => {
            const isActive = item.id === lesson.id
            const isDone = completedIds.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                className={cx(
                  styles.studyModuleTab,
                  isActive && styles.studyModuleTabActive,
                )}
                onClick={() => onSelectLesson(item.id)}
              >
                <span className="notation">Module {item.id}</span>
                <span className={styles.studyTabTitle}>{item.title.split(':')[0]}</span>
                {isDone && <span className={styles.studyDoneMark}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Split Study Area */}
      <div className={styles.studyMainGrid}>
        {/* Left: Animated 8x8 Study Board */}
        <div className={styles.studyBoardCol}>
          <div className={styles.boardTopBar}>
            <div className={styles.liveIndicator}>
              <span
                className={cx(
                  styles.pulseDot,
                  mode === 'puzzle' ? styles.pulseDotInteractive : styles.pulseDotLive,
                )}
              />
              <span className="notation">
                {mode === 'puzzle'
                  ? 'Interactive Challenge · Click a candidate square on the board!'
                  : `${activeStep?.title} (${activeStep?.notation})`}
              </span>
            </div>

            <div className={styles.playbackControls}>
              <button
                type="button"
                className={cx(
                  styles.controlBtn,
                  mode === 'walkthrough' && styles.controlBtnActive,
                )}
                onClick={() => setMode('walkthrough')}
              >
                Coach Walkthrough
              </button>
              <button
                type="button"
                className={cx(styles.controlBtn, mode === 'puzzle' && styles.controlBtnActive)}
                onClick={() => {
                  setMode('puzzle')
                  setAutoPlay(false)
                }}
              >
                ★ Practice Challenge
              </button>
            </div>
          </div>

          <div className={styles.studyBoardFrame}>
            <div className={styles.studyBoardGrid}>
              {Array.from({ length: 64 }, (_, idx) => {
                const r = Math.floor(idx / 8)
                const c = idx % 8
                const isLight = (r + c) % 2 === 0
                const key = `${r},${c}`
                const isOrigin = r === originPos.row && c === originPos.col
                const isTarget =
                  mode === 'walkthrough' && r === targetPos.row && c === targetPos.col
                const highlightTone = highlightMap.get(key)
                const puzzleOpt = puzzleOptionMap.get(key)
                const stPiece = boardPieces.find((p) => p.row === r && p.col === c)

                return (
                  <button
                    key={key}
                    type="button"
                    className={cx(
                      styles.demoSquare,
                      isLight ? styles.demoSquareLight : styles.demoSquareDark,
                      isOrigin && styles.demoSquareOrigin,
                      isTarget && styles.demoSquareTarget,
                      highlightTone === 'attack' && styles.studySquareAttack,
                      highlightTone === 'center' && styles.studySquareCenter,
                      puzzleOpt && styles.demoSquareClickable,
                    )}
                    onClick={() => handleBoardSquareClick(r, c)}
                    title={
                      puzzleOpt
                        ? `Candidate move: ${puzzleOpt.label} (Click to test)`
                        : toSquare8(r, c)
                    }
                  >
                    {c === 0 && (
                      <span className={cx(styles.rankCoord, 'notation')}>{8 - r}</span>
                    )}
                    {r === 7 && (
                      <span className={cx(styles.fileCoord, 'notation')}>{FILES_8[c]}</span>
                    )}

                    {puzzleOpt && !puzzleSolved && (
                      <span className={styles.puzzleOptionBadge}>{puzzleOpt.label}</span>
                    )}

                    {stPiece &&
                      !(
                        (currentPos.row === targetPos.row &&
                          currentPos.col === targetPos.col &&
                          r === targetPos.row &&
                          c === targetPos.col)
                      ) && (
                        <span className={styles.otherPieceWrap}>
                          <PieceIcon piece={stPiece.code} className={styles.boardPieceSvg} />
                        </span>
                      )}

                    {isOrigin &&
                      (currentPos.row !== originPos.row || currentPos.col !== originPos.col) &&
                      actorInfo && (
                        <span className={styles.originGhostWrap} aria-hidden="true">
                          <PieceIcon piece={actorInfo.code} className={styles.boardPieceSvg} />
                        </span>
                      )}
                  </button>
                )
              })}

              {/* SVG Trajectory Arrow on 8x8 Study Board */}
              {(mode === 'walkthrough' || puzzleSolved) && (
                <svg
                  className={styles.trajectorySvg}
                  viewBox="0 0 800 800"
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="studyArrowHead"
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M0,0 L8,4 L0,8 Z" fill="#0a7281" />
                    </marker>
                  </defs>
                  <line
                    x1={originPos.col * 100 + 50}
                    y1={originPos.row * 100 + 50}
                    x2={targetPos.col * 100 + 50}
                    y2={targetPos.row * 100 + 50}
                    className={styles.svgSlideLine}
                    markerEnd="url(#studyArrowHead)"
                  />
                </svg>
              )}

              {/* Animated Active Piece on 8x8 Study Board */}
              {actorInfo && (
                <div
                  className={cx(
                    styles.studyAnimatedActor,
                    actorInfo.isJump &&
                      currentPos.row === targetPos.row &&
                      currentPos.col === targetPos.col &&
                      styles.jumpingActor,
                  )}
                  style={{
                    top: `${currentPos.row * 12.5}%`,
                    left: `${currentPos.col * 12.5}%`,
                  }}
                >
                  <PieceIcon piece={actorInfo.code} className={styles.actorPieceSvg} />
                </div>
              )}
            </div>
          </div>

          {/* Walkthrough Step Controls */}
          {mode === 'walkthrough' ? (
            <div className={styles.scenarioPills}>
              {steps.map((s, idx) => (
                <button
                  key={s.title}
                  type="button"
                  className={cx(
                    styles.scenarioPill,
                    stepIdx === idx && styles.scenarioPillActive,
                  )}
                  onClick={() => {
                    setStepIdx(idx)
                    setPhase('start')
                    setTimeout(() => setPhase('moved'), 350)
                  }}
                >
                  {s.title}
                </button>
              ))}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={() => setAutoPlay((prev) => !prev)}
              >
                {autoPlay ? '⏸ Pause' : '▶ Auto-Play'}
              </button>
            </div>
          ) : (
            <div className={styles.scenarioPills}>
              {puzzle?.options?.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  className={styles.scenarioPill}
                  onClick={() => handleBoardSquareClick(opt.row, opt.col)}
                >
                  Play {opt.label}
                </button>
              ))}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={() => {
                  setPuzzleSolved(false)
                  setPuzzleFeedback(null)
                }}
              >
                Reset Challenge
              </button>
            </div>
          )}
        </div>

        {/* Right: Coach Notes, Step Commentary & Key Takeaways */}
        <div className={styles.infoPanel}>
          <div>
            <div className={styles.studyBadgeRow}>
              <span className={cx(styles.infoBadge, 'notation')}>
                Study Module {lesson.id} · {lesson.difficulty} · {lesson.minutes} min
              </span>
              {completedIds.includes(lesson.id) && (
                <span className={styles.completedPill}>✓ Completed</span>
              )}
            </div>
            <h3 className={styles.infoTitle}>{lesson.title}</h3>
            <p className={styles.infoSubtitle}>{lesson.coachSummary}</p>
          </div>

          {mode === 'walkthrough' ? (
            <div className={styles.liveScenarioBox}>
              <div className={styles.liveScenarioHeader}>
                <span className={styles.liveScenarioTag}>{activeStep?.title}</span>
                <span className={cx(styles.liveCoords, 'notation')}>
                  {activeStep?.notation}
                </span>
              </div>
              <p className={styles.liveScenarioCaption}>{activeStep?.commentary}</p>
            </div>
          ) : (
            <div className={styles.liveScenarioBox}>
              <div className={styles.liveScenarioHeader}>
                <span className={styles.liveScenarioTag}>Interactive Board Challenge</span>
                <span className={cx(styles.liveCoords, 'notation')}>Your Turn</span>
              </div>
              <p className={styles.liveScenarioCaption}>{puzzle?.prompt}</p>
              {puzzleFeedback && (
                <div
                  className={cx(
                    styles.puzzleFeedbackBanner,
                    puzzleFeedback.ok ? styles.feedbackSuccess : styles.feedbackRetry,
                  )}
                >
                  {puzzleFeedback.message}
                </div>
              )}
            </div>
          )}

          <div className={styles.rulesListSection}>
            <h4 className={styles.rulesHeading}>Key Coaching Takeaways</h4>
            <ul className={styles.rulesChecklist}>
              {(lesson.keyTakeaways || []).map((point) => (
                <li key={point} className={styles.rulesCheckItem}>
                  <span className={styles.checkBullet} aria-hidden="true">
                    ✓
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.studyActionsFooter}>
            {mode === 'walkthrough' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setMode('puzzle')
                  setAutoPlay(false)
                }}
              >
                Try Interactive Practice Challenge →
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMode('walkthrough')
                  setAutoPlay(true)
                }}
              >
                ← Back to Animated Walkthrough
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectLesson(nextLesson.id)}
            >
              Next: Module {nextLesson.id} →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LessonCard({ lesson, active, completed, onOpen }) {
  const glyph = GLYPHS[(lesson.id - 1) % GLYPHS.length]
  const badgeTone =
    lesson.difficulty === 'Beginner'
      ? styles.badgeTeal
      : lesson.difficulty === 'Intermediate'
        ? styles.badgePink
        : styles.badgeInk

  return (
    <article
      className={cx(styles.card, styles.clickableCard, active && styles.cardActive)}
      onClick={() => onOpen(lesson.id)}
    >
      <div className={styles.image}>
        <span className={styles.glyph} aria-hidden="true">
          {glyph}
        </span>
        <span className={cx(styles.badge, badgeTone, 'notation')}>{lesson.difficulty}</span>
        {completed && <span className={styles.cardCompletedBadge}>✓ Completed</span>}
      </div>
      <h3 className={styles.cardTitle}>{lesson.title}</h3>
      <p className={styles.cardBody}>{lesson.description}</p>
      <footer className={cx(styles.meta, 'notation')}>
        <span>{lesson.minutes} min</span>
        <button
          type="button"
          className={styles.openLessonBtn}
          onClick={(e) => {
            e.stopPropagation()
            onOpen(lesson.id)
          }}
        >
          {active ? 'Viewing module ↑' : 'Open study module →'}
        </button>
      </footer>
    </article>
  )
}

export function LearnPage() {
  const navigate = useNavigate()
  const [selectedPieceId, setSelectedPieceId] = useState('rf')
  const [pieceFilter, setPieceFilter] = useState('all') // 'all' | 'fox' | 'standard'
  const [activeLessonId, setActiveLessonId] = useState(1)
  const [completedLessonIds, setCompletedLessonIds] = useState([])
  const labRef = useRef(null)
  const studyRef = useRef(null)

  const handleInspectPiece = useCallback((pieceId) => {
    setSelectedPieceId(pieceId)
    if (labRef.current) {
      labRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleOpenStudyModule = useCallback((lessonId) => {
    setActiveLessonId(lessonId)
    if (studyRef.current) {
      studyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleMarkLessonCompleted = useCallback((lessonId) => {
    setCompletedLessonIds((prev) => (prev.includes(lessonId) ? prev : [...prev, lessonId]))
  }, [])

  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId) || lessons[0],
    [activeLessonId],
  )

  const filteredPieces = useMemo(() => {
    if (pieceFilter === 'fox') {
      return PIECE_RULES_DATA.filter((p) => p.category === 'fox')
    }
    if (pieceFilter === 'standard') {
      return PIECE_RULES_DATA.filter((p) => p.category === 'standard')
    }
    return PIECE_RULES_DATA
  }, [pieceFilter])

  return (
    <>
      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroTopRow}>
            <div>
              <p className="eyebrow">Interactive Rules & Animated Moves Encyclopedia</p>
              <h1 className={styles.title}>Chess Pieces, Rules & Animated Moves</h1>
              <p className={styles.lead}>
                Master every piece in both <strong>10×10 Fox Chess (AChess)</strong> and{' '}
                <strong>Standard 8×8 Chess</strong>. Watch live step-by-step movement animations,
                compare the agile <strong>Red-eared Fox (α)</strong> and{' '}
                <strong>Normal Fox (β)</strong> with classic officers, and click directly on the
                board to test legal moves yourself.
              </p>
            </div>
            <div className={styles.heroActions}>
              <Button variant="primary" onClick={() => navigate(ROUTES.foxPlay)}>
                Play 10×10 Fox Chess
              </Button>
              <Button variant="secondary" onClick={() => navigate(ROUTES.play)}>
                Play 8×8 Standard Chess
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Interactive Animated 10x10 Piece Lab */}
      <section className="band band--dim">
        <div className="container">
          <InteractivePieceLab
            selectedPieceId={selectedPieceId}
            onSelectPiece={setSelectedPieceId}
            labRef={labRef}
          />
        </div>
      </section>

      {/* Section 2: All 8 Pieces Animated Reference Grid */}
      <section className="band band--canvas">
        <div className="container">
          <div className={styles.encyclopediaHeader}>
            <div>
              <p className="eyebrow">At-a-Glance Reference</p>
              <h2 className="section-heading">All 8 Pieces & Live Movement Previews</h2>
              <p className={styles.sectionLead}>
                Every card below runs a continuous live movement animation showing how the piece
                slides or leaps across the board.
              </p>
            </div>

            <div className={styles.filterPills}>
              <button
                type="button"
                className={cx(styles.modeBtn, pieceFilter === 'all' && styles.modeBtnActive)}
                onClick={() => setPieceFilter('all')}
              >
                All Pieces (8)
              </button>
              <button
                type="button"
                className={cx(styles.modeBtn, pieceFilter === 'fox' && styles.modeBtnActive)}
                onClick={() => setPieceFilter('fox')}
              >
                10×10 Fox Pieces (2)
              </button>
              <button
                type="button"
                className={cx(styles.modeBtn, pieceFilter === 'standard' && styles.modeBtnActive)}
                onClick={() => setPieceFilter('standard')}
              >
                Classic Chess Pieces (6)
              </button>
            </div>
          </div>

          <div className={styles.miniCardsGrid}>
            {filteredPieces.map((piece) => (
              <MiniPieceAnimator
                key={piece.id}
                piece={piece}
                onInspect={handleInspectPiece}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Interactive 10x10 vs 8x8 Starting Lineup */}
      <section className="band band--dim">
        <div className="container">
          <StartingLineupExplorer onSelectPiece={handleInspectPiece} />
        </div>
      </section>

      {/* Section 4: Animated Special Rules (Castling, Promotion, En Passant, Checkmate) */}
      <section className="band band--canvas">
        <div className="container">
          <AnimatedSpecialRules />
        </div>
      </section>

      {/* Section 5: Interactive Strategy & Tactical Study Modules */}
      <section className={`band band--dim ${styles.listBand}`}>
        <div className="container">
          <div className={styles.lessonsHeader}>
            <p className="eyebrow">The Study Room</p>
            <h2 className="section-heading">Interactive Strategy & Tactical Study Modules</h2>
            <p className={styles.sectionLead}>
              Select any study module below to watch the animated coaching walkthrough and solve
              its interactive find-the-move board challenge.
            </p>
          </div>

          <StudyModuleWorkbench
            lesson={activeLesson}
            completedIds={completedLessonIds}
            onMarkCompleted={handleMarkLessonCompleted}
            onSelectLesson={handleOpenStudyModule}
            studyRef={studyRef}
          />

          <div className={styles.grid}>
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                active={lesson.id === activeLessonId}
                completed={completedLessonIds.includes(lesson.id)}
                onOpen={handleOpenStudyModule}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
