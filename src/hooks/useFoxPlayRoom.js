import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as playApi from '../api/playApi'
import { describeResult, isDrawResult } from '../services/chessService'
import { FoxChess } from '../services/foxChessEngine'
import {
  getStoredAccessToken,
  getWebSocketBaseUrl,
  loadTokenScopedState,
  saveTokenScopedState,
} from '../services/request'
import { STORAGE_KEYS } from '../utils/constants'

const WAITING_POLL_MS = 1500
const CLOCK_TICK_MS = 500
const INITIAL_FOX_FEN = new FoxChess().fen()

function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function getMemberUserId(member) {
  return member?.userId || member?.user?.id || member?.id || null
}

function extractUserId(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue
    if (typeof candidate === 'object') {
      if (candidate.id) return candidate.id
      if (candidate.userId) return candidate.userId
      continue
    }
    return candidate
  }
  return null
}

function isValidFoxFen(fen) {
  if (!fen || typeof fen !== 'string') return false
  const ranks = fen.trim().split(/\s+/)[0]?.split('/')
  return Array.isArray(ranks) && ranks.length === 10
}

function parseClientState(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof raw === 'object') return raw
  return null
}

function unwrapFoxState(raw, depth = 0) {
  if (!raw || depth > 4) return null
  const parsed = parseClientState(raw)
  if (!parsed || typeof parsed !== 'object') return null

  const nestedCandidates = [
    parsed.clientState,
    parsed.client_state,
    parsed.state,
  ]
  for (const nested of nestedCandidates) {
    if (nested && nested !== raw) {
      const inner = unwrapFoxState(nested, depth + 1)
      if (inner) return inner
    }
  }

  if (isValidFoxFen(parsed.fen) || Array.isArray(parsed.history)) {
    return parsed
  }
  return null
}

function extractClientState(obj) {
  if (!obj || typeof obj !== 'object') return null
  const candidates = [
    obj.clientState,
    obj.client_state,
    obj.state?.clientState,
    obj.state?.client_state,
    obj.state,
    obj.move?.clientState,
    obj.move?.client_state,
    obj.move?.state,
    obj.room?.clientState,
    obj.room?.client_state,
    obj.room?.state,
    obj.room?.game?.state?.clientState,
    obj.room?.game?.clientState,
    obj.room?.game?.state,
    obj.snapshot?.clientState,
    obj.snapshot?.client_state,
    obj.snapshot?.state,
    obj.data?.clientState,
    obj.data?.client_state,
    obj.data?.state,
    obj.game?.state?.clientState,
    obj.game?.state?.client_state,
    obj.game?.clientState,
    obj.game?.client_state,
    obj.game?.state,
  ]
  for (const candidate of candidates) {
    const resolved = unwrapFoxState(candidate)
    if (resolved) return resolved
  }
  return unwrapFoxState(obj)
}

function buildFoxClientState(engine, executedMove = null, custom = {}) {
  const isCheckmate = typeof engine.isCheckmate === 'function' ? engine.isCheckmate() : false
  const isStalemate = typeof engine.isStalemate === 'function' ? engine.isStalemate() : false
  const isGameOver = typeof engine.isGameOver === 'function' ? engine.isGameOver() : false
  const turn = typeof engine.turn === 'function' ? engine.turn() : 'w'
  let result = null
  let gameOverReason = null
  if (isCheckmate) {
    result = turn === 'w' ? 'black_checkmate' : 'white_checkmate'
    gameOverReason = result
  } else if (isStalemate) {
    result = 'stalemate'
    gameOverReason = 'stalemate'
  }
  return {
    boardType: 'achess',
    variant: 'fox',
    fen: typeof engine.fen === 'function' ? engine.fen() : null,
    turn,
    history: typeof engine.history === 'function' ? [...engine.history()] : [],
    captured: {
      white: engine.captured?.w || [],
      black: engine.captured?.b || [],
    },
    lastMove: executedMove || null,
    isGameOver,
    isCheckmate,
    isStalemate,
    inCheck: typeof engine.inCheck === 'function' ? engine.inCheck() : false,
    result,
    gameOverReason,
    ...custom,
  }
}

function applyClientStateToEngine(engine, rawClientState) {
  const state = unwrapFoxState(rawClientState) || parseClientState(rawClientState)
  if (!state) return false
  const prevHistory = Array.isArray(engine.moveHistory) ? [...engine.moveHistory] : []
  const prevCaptured = engine.captured
    ? { w: [...(engine.captured.w || [])], b: [...(engine.captured.b || [])] }
    : { w: [], b: [] }
  let loaded = false
  if (isValidFoxFen(state.fen) && typeof engine.load === 'function') {
    loaded = Boolean(engine.load(state.fen))
  }
  if (state.captured) {
    engine.captured = {
      w: [...(state.captured.white || state.captured.w || [])],
      b: [...(state.captured.black || state.captured.b || [])],
    }
  } else if (loaded && prevCaptured) {
    engine.captured = prevCaptured
  }
  if (Array.isArray(state.history) && state.history.length > 0) {
    engine.moveHistory = [...state.history]
  } else if (Array.isArray(state.history) && state.history.length === 0 && state.fen === INITIAL_FOX_FEN) {
    engine.moveHistory = []
  } else if (loaded && prevHistory.length > 0) {
    engine.moveHistory = prevHistory
  }
  return loaded
}

function reconstructFoxEngine(rawMoves = [], candidateStates = []) {
  const engine = new FoxChess()
  if (Array.isArray(rawMoves) && rawMoves.length > 0) {
    for (const m of rawMoves) {
      const mv = m?.move?.move ?? m?.move ?? m
      const mState = extractClientState(m) || extractClientState(mv)
      let moved = false
      try {
        if (mv?.from && mv?.to) {
          moved = Boolean(
            engine.move({
              from: mv.from,
              to: mv.to,
              promotion: mv.promotion || 'q',
            }),
          )
        } else if (mv?.san) {
          moved = Boolean(engine.move(mv.san))
        } else if (typeof mv === 'string') {
          moved = Boolean(engine.move(mv))
        }
      } catch {
        moved = false
      }
      if (!moved && mState && isValidFoxFen(mState.fen)) {
        applyClientStateToEngine(engine, mState)
      } else if (!moved && isValidFoxFen(m?.fen || mv?.fen)) {
        engine.load(m?.fen || mv?.fen)
      }
    }
  }

  const replayedMoveCount = engine.history().length
  const validStates = candidateStates.filter((s) => s && isValidFoxFen(s.fen))

  let bestState = null
  for (const s of validStates) {
    const sCount = Array.isArray(s.history) ? s.history.length : 0
    const bestCount = bestState && Array.isArray(bestState.history) ? bestState.history.length : -1
    if (sCount > bestCount || (!bestState && s.fen !== INITIAL_FOX_FEN)) {
      bestState = s
    }
  }

  if (bestState) {
    const bestCount = Array.isArray(bestState.history) ? bestState.history.length : 0
    const isBestNonInitial = bestState.fen !== INITIAL_FOX_FEN || bestCount > 0
    if (
      (replayedMoveCount === 0 && isBestNonInitial) ||
      bestCount > replayedMoveCount
    ) {
      applyClientStateToEngine(engine, bestState)
    }
  }

  return engine
}

export function useFoxPlayRoom({
  roomId,
  currentUserId,
  currentUsername,
  currentUserRole,
  enabled = true,
}) {
  const roomStorageKey = roomId ? `${STORAGE_KEYS.roomStatePrefix}fox:${roomId}` : null

  const engineRef = useRef(null)
  if (!engineRef.current) {
    const initialEngine = new FoxChess()
    const cached = roomStorageKey ? loadTokenScopedState(roomStorageKey) : null
    if (cached && isValidFoxFen(cached.fen)) {
      applyClientStateToEngine(initialEngine, cached)
    }
    engineRef.current = initialEngine
  }

  const [room, setRoom] = useState(null)
  const [fen, setFen] = useState(() => engineRef.current.fen())
  const [history, setHistory] = useState(() => [...engineRef.current.history()])
  const [captured, setCaptured] = useState(() => ({
    white: engineRef.current.captured?.w || [],
    black: engineRef.current.captured?.b || [],
  }))
  const [comments, setComments] = useState([])
  const [clockBase, setClockBase] = useState(null)
  const [drawOfferBy, setDrawOfferBy] = useState(null)
  const [takeback, setTakeback] = useState(null)
  const [connection, setConnection] = useState('idle')
  const [loading, setLoading] = useState(Boolean(roomId))
  const [joined, setJoined] = useState(false)
  const [joinedSeat, setJoinedSeat] = useState(null)
  const [roomDeleted, setRoomDeleted] = useState(false)
  const [wrongBoardType, setWrongBoardType] = useState(null)
  const [error, setError] = useState(null)
  const [chatError, setChatError] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const socketRef = useRef(null)
  const roomDeletedRef = useRef(false)
  const handleMessageRef = useRef(() => {})
  const refreshMovesRef = useRef(() => {})

  const syncFromEngine = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    const nextFen = typeof engine.fen === 'function' ? engine.fen() : null
    const nextHistory = typeof engine.history === 'function' ? [...engine.history()] : []
    const nextCaptured = {
      white: engine.captured?.w || [],
      black: engine.captured?.b || [],
    }
    setFen(nextFen)
    setHistory(nextHistory)
    setCaptured(nextCaptured)

    if (roomStorageKey && isValidFoxFen(nextFen)) {
      saveTokenScopedState(roomStorageKey, buildFoxClientState(engine))
    }
  }, [roomStorageKey])

  const applySnapshot = useCallback((snap) => {
    if (!snap || typeof snap !== 'object') return
    const source = snap.room || snap.snapshot || snap.data || snap
    if (!source || typeof source !== 'object') return

    if (snap.seat) setJoinedSeat(snap.seat)
    if (source.seat) setJoinedSeat(source.seat)

    const mergedStatus = source.status || source.game?.status
    const mergedResult = source.result || source.game?.result
    setRoom((prev) => ({
      ...(prev || {}),
      ...source,
      ...(mergedStatus ? { status: mergedStatus } : {}),
      ...(mergedResult ? { result: mergedResult } : {}),
    }))
    if ('drawOfferBy' in source || 'draw_offer_by' in source) {
      setDrawOfferBy(source.drawOfferBy || source.draw_offer_by || null)
    }
    if ('takebackRequestBy' in source || 'takeback_request_by' in source) {
      const tbBy = source.takebackRequestBy || source.takeback_request_by
      setTakeback(
        tbBy
          ? {
              by: tbBy,
              expiresAt: source.takebackRequestedAt || source.takeback_requested_at || null,
            }
          : null,
      )
    }

    const rawMoves = Array.isArray(source.moves)
      ? source.moves
      : Array.isArray(source.game?.moves)
        ? source.game.moves
        : null
    const state = extractClientState(source) || extractClientState(snap)
    const currentMoveCount = engineRef.current?.history?.()?.length ?? 0

    if (rawMoves && rawMoves.length > 0) {
      const latestMoveState = extractClientState(rawMoves[rawMoves.length - 1])
      const reconstructed = reconstructFoxEngine(rawMoves, [latestMoveState, state])
      if (
        reconstructed.history().length >= currentMoveCount ||
        (reconstructed.fen() !== INITIAL_FOX_FEN && engineRef.current.fen() === INITIAL_FOX_FEN)
      ) {
        engineRef.current = reconstructed
        syncFromEngine()
      }
    } else if (state && isValidFoxFen(state.fen)) {
      const incomingMoveCount = Array.isArray(state.history) ? state.history.length : 0
      const isIncomingInitial = state.fen === INITIAL_FOX_FEN && incomingMoveCount === 0
      if (
        currentMoveCount === 0 ||
        (!isIncomingInitial &&
          (incomingMoveCount >= currentMoveCount || state.fen !== engineRef.current.fen()))
      ) {
        applyClientStateToEngine(engineRef.current, state)
        syncFromEngine()
      }
    } else if (isValidFoxFen(source.fen)) {
      if (currentMoveCount === 0 && source.fen !== INITIAL_FOX_FEN) {
        engineRef.current.load(source.fen)
        syncFromEngine()
      }
    }

    if (state && (state.result || state.gameOverReason || state.isGameOver)) {
      setRoom((prev) => ({
        ...(prev || {}),
        status: 'finished',
        result: state.result || state.gameOverReason || prev?.result,
      }))
    }

    const whiteClock = source.clocks?.white ?? source.whiteTimeMs ?? source.white_time_ms
    const blackClock = source.clocks?.black ?? source.blackTimeMs ?? source.black_time_ms
    if (whiteClock != null && blackClock != null) {
      setClockBase({
        white: Number(whiteClock),
        black: Number(blackClock),
        turn: engineRef.current.turn(),
        at: Date.now(),
      })
    }
  }, [syncFromEngine])

  const addComment = useCallback((comment) => {
    if (!comment || !comment.id) return
    setComments((prev) =>
      prev.some((item) => sameId(item.id, comment.id)) ? prev : [...prev, comment],
    )
  }, [])

  const applyMove = useCallback(
    (msg) => {
      const incomingState = extractClientState(msg) || extractClientState(msg?.state)
      const moveData = msg.move?.move ?? msg.move ?? (msg.from || msg.san ? msg : null)
      const engine = engineRef.current

      if (incomingState && isValidFoxFen(incomingState.fen)) {
        const currentFen = typeof engine.fen === 'function' ? engine.fen() : null
        const currentCount = engine.history().length
        const incomingCount = Array.isArray(incomingState.history)
          ? incomingState.history.length
          : 0
        if (!currentFen || (currentFen !== incomingState.fen && incomingCount >= currentCount)) {
          applyClientStateToEngine(engine, incomingState)
          syncFromEngine()
        }
      } else if (moveData) {
        const from = moveData.from
        const to = moveData.to
        const promotion = moveData.promotion || 'q'

        const lastHist = engine.history()[engine.history().length - 1]
        const isDuplicate =
          lastHist &&
          ((lastHist.from === from && lastHist.to === to) ||
            (moveData.san && lastHist.san === moveData.san))

        if (!isDuplicate) {
          try {
            if (from && to) {
              engine.move({ from, to, promotion })
            } else if (moveData.san) {
              engine.move(moveData.san)
            }
          } catch {
            if (isValidFoxFen(msg.fen || moveData.fen)) {
              engine.load(msg.fen || moveData.fen)
            }
          }
          syncFromEngine()
        }
      }

      const nextResult =
        incomingState?.result ||
        incomingState?.gameOverReason ||
        msg.result ||
        msg.gameOverReason ||
        (engine.isCheckmate()
          ? (engine.turn() === 'w' ? 'black_checkmate' : 'white_checkmate')
          : engine.isStalemate()
            ? 'stalemate'
            : null)

      if (incomingState?.isGameOver || engine.isGameOver() || nextResult) {
        setRoom((prev) =>
          prev ? { ...prev, status: 'finished', result: nextResult || prev.result } : prev,
        )
      }

      const nextClocks = msg.clocks || incomingState?.clocks
      if (nextClocks) {
        setClockBase({
          white: nextClocks.white ?? 0,
          black: nextClocks.black ?? 0,
          turn: engine.turn(),
          at: Date.now(),
        })
      }

      setDrawOfferBy(null)
      setTakeback(null)
    },
    [syncFromEngine],
  )

  const refreshMoves = useCallback(
    async (trustServerCount = false) => {
      if (!roomId) return
      try {
        const snap = await playApi.getRoom(roomId)
        applySnapshot(snap)
        const snapState = extractClientState(snap)
        const cachedState =
          !trustServerCount && roomStorageKey ? loadTokenScopedState(roomStorageKey) : null
        const targetGameId = snap?.gameId || snap?.room?.gameId || snap?.room?.game?.id
        if (targetGameId) {
          const data = await playApi.getGameMoves(targetGameId)
          const gameState = extractClientState(data)
          const rawMoves = data?.game?.moves || data?.moves || []
          const latestMoveState =
            rawMoves.length > 0 ? extractClientState(rawMoves[rawMoves.length - 1]) : null

          const candidateStates = trustServerCount
            ? [latestMoveState, gameState, snapState]
            : [latestMoveState, gameState, snapState, cachedState]

          engineRef.current = reconstructFoxEngine(rawMoves, candidateStates)
          syncFromEngine()

          if (data?.game?.status || data?.game?.result) {
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    status: data.game.status || prev.status,
                    result: data.game.result || prev.result,
                  }
                : prev,
            )
          }
        } else {
          const fallbackState = snapState || cachedState
          if (fallbackState && isValidFoxFen(fallbackState.fen)) {
            applyClientStateToEngine(engineRef.current, fallbackState)
            syncFromEngine()
          }
        }
      } catch {
        // Non-fatal
      }
    },
    [roomId, roomStorageKey, applySnapshot, syncFromEngine],
  )

  const handleMessage = useCallback(
    (raw) => {
      let msg
      try {
        msg = JSON.parse(raw)
      } catch {
        return
      }
      if (!msg || typeof msg !== 'object') return

      const type = String(msg.type || msg.event || '').toLowerCase()

      if (!type) {
        if (msg.members) applySnapshot(msg)
        return
      }

      if (type.includes('snapshot') || type === 'state' || type === 'room') {
        applySnapshot(msg.room || msg.snapshot || msg.data || msg)
        return
      }

      if (type.includes('comment')) {
        addComment(msg.comment || msg)
        return
      }

      if (type.includes('takeback')) {
        if (type.includes('request')) {
          setTakeback({
            by: extractUserId(msg.by, msg.userId, msg.playerId, msg.user),
            expiresAt: msg.expiresAt || null,
          })
        } else if (type.includes('accept')) {
          setTakeback(null)
          const state = extractClientState(msg)
          if (state && isValidFoxFen(state.fen)) {
            applyClientStateToEngine(engineRef.current, state)
            syncFromEngine()
          } else if (isValidFoxFen(msg.fen)) {
            engineRef.current.load(msg.fen)
            syncFromEngine()
          } else {
            engineRef.current.undo()
            syncFromEngine()
          }
          refreshMoves(true)
        } else {
          setTakeback(null)
        }
        return
      }

      if (type.includes('draw')) {
        if (type.includes('offer')) {
          setDrawOfferBy(
            extractUserId(msg.by, msg.userId, msg.drawOfferBy, msg.playerId, msg.user) || true,
          )
        } else {
          setDrawOfferBy(null)
        }
        return
      }

      if (type === 'error') {
        if (msg.error) setError(msg.error)
        refreshMoves(true)
        return
      }

      if (type.includes('move')) {
        applyMove(msg)
        return
      }

      if (type === 'room.deleted' || type.includes('room.deleted') || type.includes('deleted')) {
        roomDeletedRef.current = true
        setRoomDeleted(true)
        if (roomStorageKey) saveTokenScopedState(roomStorageKey, null)
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                status: 'finished',
                result: prev.result || 'aborted',
              }
            : prev,
        )
        setDrawOfferBy(null)
        setTakeback(null)
        return
      }

      if (type.includes('finish') || type.includes('end') || type === 'result') {
        const res = msg.result || msg.game?.result || msg.reason
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                status: 'finished',
                result: res || prev.result,
              }
            : prev,
        )
        const incomingState = extractClientState(msg)
        if (incomingState && isValidFoxFen(incomingState.fen)) {
          applyClientStateToEngine(engineRef.current, incomingState)
          syncFromEngine()
        }
        setDrawOfferBy(null)
        setTakeback(null)
        return
      }

      if (msg.members) applySnapshot(msg)
    },
    [roomStorageKey, applyMove, applySnapshot, addComment, refreshMoves, syncFromEngine],
  )

  useEffect(() => {
    handleMessageRef.current = handleMessage
  }, [handleMessage])

  useEffect(() => {
    refreshMovesRef.current = refreshMoves
  }, [refreshMoves])

  // Join the room and load initial snapshot, moves, and chat
  useEffect(() => {
    if (!enabled || !roomId) {
      setLoading(false)
      return undefined
    }

    let active = true
    setLoading(true)
    setError(null)
    setWrongBoardType(null)
    setJoined(false)

    // Restore cached room state immediately if token is present
    const cached = roomStorageKey ? loadTokenScopedState(roomStorageKey) : null
    if (cached && isValidFoxFen(cached.fen)) {
      applyClientStateToEngine(engineRef.current, cached)
      syncFromEngine()
    }

    ;(async () => {
      try {
        const preSnap = await playApi.getRoom(roomId)
        if (!active) return
        const detectedType = playApi.getRoomBoardType(preSnap)
        if (detectedType !== 'achess') {
          setWrongBoardType(detectedType)
          setError(
            'This room is a Normal 8×8 Chess game. You can only open 10×10 Chess games from the 10×10 Chess room.',
          )
          return
        }

        const joinRes = await playApi.joinRoom(roomId)
        if (!active) return
        if (joinRes?.seat) setJoinedSeat(joinRes.seat)
        setJoined(true)

        const snap = await playApi.getRoom(roomId)
        if (!active) return
        applySnapshot(snap)

        const snapState = extractClientState(snap)
        const cachedState = roomStorageKey ? loadTokenScopedState(roomStorageKey) : null
        const targetGameId = snap?.gameId || snap?.room?.gameId || snap?.room?.game?.id
        if (targetGameId) {
          const data = await playApi.getGameMoves(targetGameId)
          if (!active) return
          const gameState = extractClientState(data)
          const rawMoves = data?.game?.moves || data?.moves || []
          const latestMoveState =
            rawMoves.length > 0 ? extractClientState(rawMoves[rawMoves.length - 1]) : null

          engineRef.current = reconstructFoxEngine(rawMoves, [
            latestMoveState,
            gameState,
            snapState,
            cachedState,
          ])
          syncFromEngine()

          if (data?.game?.status || data?.game?.result) {
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    status: data.game.status || prev.status,
                    result: data.game.result || prev.result,
                  }
                : prev,
            )
          }
        } else {
          const fallbackState = snapState || cachedState
          if (fallbackState && isValidFoxFen(fallbackState.fen)) {
            applyClientStateToEngine(engineRef.current, fallbackState)
            syncFromEngine()
          }
        }

        const page = await playApi.listComments(roomId, { limit: 50 })
        if (active) setComments(page?.comments || [])
      } catch (err) {
        if (active) setError(err?.message || 'Unable to join this Fox Chess room.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [enabled, roomId, roomStorageKey, applySnapshot, syncFromEngine])

  // Live WebSocket connection matching standard chess
  useEffect(() => {
    if (!enabled || !roomId || !joined) return undefined

    const token = getStoredAccessToken()
    let disposed = false
    let socket = null
    let retryTimer = null
    let attempts = 0
    let usedFallback = false

    const open = () => {
      if (disposed) return
      const baseUrl = `${getWebSocketBaseUrl()}/play/rooms/${roomId}`
      const wsUrl =
        token && usedFallback ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl
      setConnection(attempts === 0 ? 'connecting' : 'reconnecting')

      try {
        socket = token && !usedFallback ? new WebSocket(baseUrl, [token]) : new WebSocket(wsUrl)
      } catch (err) {
        if (!usedFallback && token) {
          usedFallback = true
          open()
          return
        }
        setConnection('error')
        setError(err?.message || 'Could not open live connection.')
        return
      }

      socketRef.current = socket
      let opened = false

      socket.onopen = () => {
        opened = true
        if (attempts > 0) {
          refreshMovesRef.current()
        }
        attempts = 0
        setConnection('connected')
        setError(null)
      }

      socket.onmessage = (event) => handleMessageRef.current(event.data)
      socket.onerror = () => {}

      socket.onclose = (event) => {
        socketRef.current = null
        if (disposed || roomDeletedRef.current) return

        if (event.code === 1013) {
          setConnection('busy')
          setError('Server at capacity. Please try again shortly.')
          return
        }

        if (!opened && token && !usedFallback) {
          usedFallback = true
          open()
          return
        }

        if (!opened && (event.code === 1008 || event.code === 4401 || event.code === 4403)) {
          setConnection('error')
          setError('Live connection authentication failed.')
          return
        }

        attempts += 1
        setConnection('reconnecting')
        const delay = Math.min(1000 * 2 ** Math.min(attempts, 4), 15000)
        retryTimer = setTimeout(open, delay)
      }
    }

    open()

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      if (socket) {
        socket.onclose = null
        try {
          socket.close()
        } catch {
          // ignore
        }
      }
      socketRef.current = null
    }
  }, [enabled, roomId, joined])

  // Poll waiting rooms until second player arrives
  useEffect(() => {
    if (!enabled || !roomId || roomDeleted || wrongBoardType || !joined) return undefined
    const isWaiting =
      !room || room.status === 'waiting' || (room.members && room.members.length < 2)
    if (!isWaiting) return undefined

    const poll = async () => {
      if (roomDeletedRef.current) return
      try {
        const snap = await playApi.getRoom(roomId)
        applySnapshot(snap)
      } catch (err) {
        if (err?.status === 404) {
          roomDeletedRef.current = true
          setRoomDeleted(true)
          if (roomStorageKey) saveTokenScopedState(roomStorageKey, null)
        }
      }
    }

    const id = setInterval(poll, WAITING_POLL_MS)
    window.addEventListener('focus', poll)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', poll)
    }
  }, [enabled, roomId, room, roomDeleted, wrongBoardType, joined, roomStorageKey, applySnapshot])

  const members = useMemo(() => room?.members || [], [room?.members])
  const gameStatus = room?.status || (roomId ? 'waiting' : 'idle')
  const result = room?.result || null

  const engine = engineRef.current
  const turn = engine.turn()
  const myMember = members.find(
    (member) =>
      sameId(getMemberUserId(member), currentUserId) ||
      (currentUsername && sameId(member?.username || member?.user?.username, currentUsername)),
  )
  const mySeat = myMember?.seat || room?.seat || joinedSeat || null

  const whitePlayer = useMemo(() => {
    const m = members.find((member) => member.seat === 'white')
    if (!m) return null
    return {
      id: getMemberUserId(m),
      username: m.username || m.user?.username || 'White',
      seat: 'white',
    }
  }, [members])

  const blackPlayer = useMemo(() => {
    const m = members.find((member) => member.seat === 'black')
    if (!m) return null
    return {
      id: getMemberUserId(m),
      username: m.username || m.user?.username || 'Black',
      seat: 'black',
    }
  }, [members])

  const isPlayer = mySeat === 'white' || mySeat === 'black'
  const canDeleteRoom = Boolean(
    mySeat === 'white' ||
      sameId(whitePlayer?.id, currentUserId) ||
      (currentUsername && sameId(whitePlayer?.username, currentUsername)) ||
      sameId(currentUserRole, 'admin') ||
      sameId(currentUsername, 'admin'),
  )
  const isMyTurn =
    isPlayer &&
    gameStatus === 'active' &&
    !engine.isGameOver() &&
    ((mySeat === 'white' && turn === 'w') || (mySeat === 'black' && turn === 'b'))
  const canMove = isMyTurn

  const status = useMemo(() => {
    void fen
    void history.length
    if (gameStatus === 'waiting') {
      return { kind: 'waiting', label: 'Waiting for an opponent to join' }
    }
    if (gameStatus === 'finished') {
      return { kind: isDrawResult(result) ? 'draw' : 'finished', label: describeResult(result) }
    }
    if (engine.isCheckmate()) {
      return {
        kind: 'finished',
        label: `Checkmate — ${turn === 'w' ? 'Black' : 'White'} wins!`,
      }
    }
    if (engine.isStalemate()) {
      return { kind: 'draw', label: 'Draw by stalemate' }
    }
    if (engine.inCheck()) {
      return { kind: 'check', label: `${turn === 'w' ? 'White' : 'Black'} is in check!` }
    }
    return {
      kind: 'active',
      label: `${turn === 'w' ? 'White' : 'Black'} to move`,
    }
  }, [gameStatus, result, engine, turn, fen, history.length])

  const displayClocks = useMemo(() => {
    if (!clockBase) return null
    if (gameStatus !== 'active') {
      return { white: clockBase.white, black: clockBase.black }
    }
    const elapsed = Math.max(0, now - clockBase.at)
    const next = { white: clockBase.white, black: clockBase.black }
    if (clockBase.turn === 'w') {
      next.white = Math.max(0, next.white - elapsed)
    } else {
      next.black = Math.max(0, next.black - elapsed)
    }
    return next
  }, [clockBase, gameStatus, now])

  useEffect(() => {
    if (!clockBase || gameStatus !== 'active') return undefined
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [clockBase, gameStatus])

  const sendMove = useCallback(
    (from, to, promotion = 'q') => {
      if (!isPlayer || gameStatus !== 'active') return false

      const eng = engineRef.current
      let executed = null
      try {
        executed = eng.move({ from, to, promotion })
      } catch {
        return false
      }
      if (!executed) return false

      syncFromEngine()

      const clientState = buildFoxClientState(eng, executed)
      const payload = {
        type: 'move',
        boardType: 'achess',
        variant: 'fox',
        from,
        to,
        promotion,
        san: executed.san,
        fen: clientState.fen,
        state: clientState,
        clientState,
      }

      if (clientState.isGameOver) {
        payload.result = clientState.result
        payload.gameOverReason = clientState.gameOverReason
        setRoom((prev) =>
          prev ? { ...prev, status: 'finished', result: clientState.result || prev.result } : prev,
        )
      }

      const socket = socketRef.current
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
        return true
      }

      playApi
        .makeRoomMove(roomId, { from, to, promotion, state: clientState, clientState })
        .then((res) => {
          if (res && !res.error) {
            applyMove(res)
          }
        })
        .catch((err) => {
          setError(err?.message || 'Move could not be completed.')
        })

      return true
    },
    [isPlayer, gameStatus, roomId, syncFromEngine, applyMove],
  )

  const runAction = useCallback(async (fn) => {
    setError(null)
    try {
      return await fn()
    } catch (err) {
      setError(err?.message || 'That action could not be completed.')
      return null
    }
  }, [])

  const offerDraw = useCallback(
    () => runAction(() => playApi.drawRoom(roomId, 'offer')),
    [roomId, runAction],
  )
  const acceptDraw = useCallback(
    () => runAction(() => playApi.drawRoom(roomId, 'accept')),
    [roomId, runAction],
  )
  const declineDraw = useCallback(
    () => runAction(() => playApi.drawRoom(roomId, 'decline')),
    [roomId, runAction],
  )
  const resign = useCallback(() => runAction(() => playApi.resignRoom(roomId)), [roomId, runAction])
  const abort = useCallback(() => runAction(() => playApi.abortRoom(roomId)), [roomId, runAction])
  const deleteRoom = useCallback(async () => {
    if (!roomId) return false
    setError(null)
    try {
      await playApi.deleteRoom(roomId)
      roomDeletedRef.current = true
      setRoomDeleted(true)
      if (roomStorageKey) saveTokenScopedState(roomStorageKey, null)
      return true
    } catch (err) {
      if (err?.status === 404) {
        roomDeletedRef.current = true
        setRoomDeleted(true)
        if (roomStorageKey) saveTokenScopedState(roomStorageKey, null)
        return true
      }
      setError(err?.message || 'Could not remove room.')
      return false
    }
  }, [roomId, roomStorageKey])
  const requestTakeback = useCallback(
    () => runAction(() => playApi.takebackRoom(roomId, 'request')),
    [roomId, runAction],
  )
  const acceptTakeback = useCallback(
    () => runAction(() => playApi.takebackRoom(roomId, 'accept')),
    [roomId, runAction],
  )
  const declineTakeback = useCallback(
    () => runAction(() => playApi.takebackRoom(roomId, 'decline')),
    [roomId, runAction],
  )

  const sendComment = useCallback(
    async (body) => {
      const text = (body || '').trim()
      if (!text) return false
      setChatError(null)
      try {
        const res = await playApi.postComment(roomId, text)
        if (res?.comment) addComment(res.comment)
        return true
      } catch (err) {
        setChatError(err?.message || 'Could not send your message.')
        return false
      }
    },
    [roomId, addComment],
  )

  return {
    engine: engineRef.current,
    room,
    gameId: room?.gameId || null,
    fen,
    history,
    captured,
    comments,
    members,
    whitePlayer,
    blackPlayer,
    mySeat,
    isPlayer,
    canDeleteRoom,
    roomDeleted,
    wrongBoardType,
    isMyTurn,
    canMove,
    orientation: mySeat === 'black' ? 'black' : 'white',
    gameStatus,
    result,
    status,
    turn,
    displayClocks,
    drawOfferBy,
    takeback,
    connection,
    loading,
    error,
    chatError,
    sendMove,
    offerDraw,
    acceptDraw,
    declineDraw,
    resign,
    abort,
    deleteRoom,
    requestTakeback,
    acceptTakeback,
    declineTakeback,
    sendComment,
    refresh: refreshMoves,
  }
}
