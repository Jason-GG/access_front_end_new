import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import * as playApi from '../api/playApi'
import {
  buildHistoryFromMoves,
  describeResult,
  getCapturedFromFen,
  getGameStatus,
  isDrawResult,
} from '../services/chessService'
import {
  getStoredAccessToken,
  getWebSocketBaseUrl,
  loadTokenScopedState,
  saveTokenScopedState,
} from '../services/request'
import { STORAGE_KEYS } from '../utils/constants'

const WAITING_POLL_MS = 1500
const CLOCK_TICK_MS = 500
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function getMemberUserId(member) {
  return member?.userId || member?.user?.id || member?.id || null
}

function turnFromFen(fen) {
  const parts = (fen || '').split(' ')
  return parts[1] === 'b' ? 'b' : 'w'
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

export function usePlayRoom({
  roomId,
  currentUserId,
  currentUsername,
  currentUserRole,
  enabled = true,
}) {
  const roomStorageKey = roomId ? `${STORAGE_KEYS.roomStatePrefix}chess:${roomId}` : null
  const initialCached = useMemo(
    () => (roomStorageKey ? loadTokenScopedState(roomStorageKey) : null),
    [roomStorageKey],
  )

  const [room, setRoom] = useState(null)
  const [fen, setFenState] = useState(() => initialCached?.fen || null)
  const [history, setHistoryState] = useState(() =>
    Array.isArray(initialCached?.history) ? initialCached.history : [],
  )
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

  const fenRef = useRef(fen)
  const historyRef = useRef(history)
  const socketRef = useRef(null)
  const roomDeletedRef = useRef(false)
  const pendingMoveRef = useRef(false)
  const handleMessageRef = useRef(() => {})
  const refreshMovesRef = useRef(() => {})

  const updateBoardState = useCallback(
    (nextFen, nextHistory) => {
      let changed = false
      if (nextFen !== undefined && nextFen !== fenRef.current) {
        fenRef.current = nextFen
        setFenState(nextFen)
        changed = true
      }
      if (nextHistory !== undefined) {
        const curLen = historyRef.current ? historyRef.current.length : -1
        const nextLen = Array.isArray(nextHistory) ? nextHistory.length : -1
        const curLast = curLen > 0 ? historyRef.current[curLen - 1] : null
        const nextLast = nextLen > 0 ? nextHistory[nextLen - 1] : null
        const histChanged =
          curLen !== nextLen ||
          curLast?.san !== nextLast?.san ||
          curLast?.from !== nextLast?.from ||
          curLast?.to !== nextLast?.to
        if (histChanged) {
          historyRef.current = nextHistory
          setHistoryState(nextHistory)
          changed = true
        }
      }
      if (
        changed &&
        roomStorageKey &&
        (fenRef.current || (historyRef.current && historyRef.current.length > 0))
      ) {
        saveTokenScopedState(roomStorageKey, {
          fen: fenRef.current,
          history: historyRef.current,
        })
      }
    },
    [roomStorageKey],
  )

  const applySnapshot = useCallback(
    (snap) => {
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

      const rawMoves = Array.isArray(source.moves)
        ? source.moves
        : Array.isArray(source.game?.moves)
          ? source.game.moves
          : null

      const incomingFen =
        (source.fen && source.fen !== START_FEN ? source.fen : null) ||
        (source.state?.fen && source.state.fen !== START_FEN ? source.state.fen : null) ||
        (source.game?.state?.fen && source.game.state.fen !== START_FEN ? source.game.state.fen : null) ||
        (source.clientState?.fen && source.clientState.fen !== START_FEN ? source.clientState.fen : null) ||
        (source.state?.clientState?.fen && source.state.clientState.fen !== START_FEN
          ? source.state.clientState.fen
          : null) ||
        source.fen ||
        source.state?.fen ||
        source.game?.state?.fen ||
        source.clientState?.fen ||
        source.state?.clientState?.fen

      if (rawMoves && rawMoves.length > 0) {
        const built = buildHistoryFromMoves(
          rawMoves,
          source.initialFen || source.game?.state?.initialFen,
        )
        const currentCount = historyRef.current ? historyRef.current.length : 0
        if (built.history.length >= currentCount || !pendingMoveRef.current) {
          const resolvedFen =
            (incomingFen && incomingFen !== START_FEN ? incomingFen : null) ||
            built.fen ||
            incomingFen ||
            START_FEN
          updateBoardState(resolvedFen, built.history)
        }
      } else if (Array.isArray(rawMoves) && rawMoves.length === 0 && !pendingMoveRef.current) {
        const clientHistory = Array.isArray(source.clientState?.history)
          ? source.clientState.history
          : Array.isArray(source.state?.clientState?.history)
            ? source.state.clientState.history
            : []
        if (incomingFen) {
          updateBoardState(incomingFen, clientHistory)
        }
      } else {
        const clientHistory = Array.isArray(source.clientState?.history)
          ? source.clientState.history
          : Array.isArray(source.state?.clientState?.history)
            ? source.state.clientState.history
            : null
        const hasExistingMoves =
          (historyRef.current && historyRef.current.length > 0) ||
          (fenRef.current && fenRef.current !== START_FEN)
        if (
          incomingFen &&
          (!hasExistingMoves || incomingFen !== START_FEN || !pendingMoveRef.current)
        ) {
          updateBoardState(
            incomingFen,
            clientHistory &&
              (clientHistory.length >= (historyRef.current?.length || 0) || !pendingMoveRef.current)
              ? clientHistory
              : undefined,
          )
        }
      }

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

      const whiteClock = source.clocks?.white ?? source.whiteTimeMs ?? source.white_time_ms
      const blackClock = source.clocks?.black ?? source.blackTimeMs ?? source.black_time_ms
      if (whiteClock != null && blackClock != null) {
        setClockBase({
          white: Number(whiteClock),
          black: Number(blackClock),
          turn: turnFromFen(fenRef.current || incomingFen),
          at: Date.now(),
        })
      }
    },
    [updateBoardState],
  )

  const addComment = useCallback((comment) => {
    if (!comment || !comment.id) return
    setComments((prev) =>
      prev.some((item) => sameId(item.id, comment.id)) ? prev : [...prev, comment],
    )
  }, [])

  const applyMove = useCallback(
    (msg) => {
      const state = msg.state || msg.clientState || {}
      const moveData = msg.move?.move ?? msg.move ?? (msg.from || msg.san ? msg : null)
      const serverFen = state.fen || msg.fen || msg.move?.fen || moveData?.fen

      let computedFen = null
      let nextHist = historyRef.current || []

      if (moveData) {
        const from = moveData.from
        const to = moveData.to
        const promotion = moveData.promotion || 'q'
        const san = typeof moveData === 'string' ? moveData : moveData.san
        const lastHist = nextHist[nextHist.length - 1]
        const isDuplicate =
          lastHist &&
          ((from && to && lastHist.from === from && lastHist.to === to) ||
            (san && lastHist.san === san))

        if (!isDuplicate) {
          let moveObj = typeof moveData === 'string' ? { san: moveData } : moveData
          try {
            const c = new Chess(fenRef.current || undefined)
            const m =
              from && to
                ? c.move({ from, to, promotion })
                : san
                  ? c.move(san)
                  : null
            if (m) {
              moveObj = m
              computedFen = c.fen()
            }
          } catch {
            // keep moveObj
          }
          nextHist = [...nextHist, moveObj]
        }
      }

      const resolvedFen =
        computedFen ||
        (serverFen && (serverFen !== START_FEN || nextHist.length === 0) ? serverFen : null) ||
        fenRef.current
      updateBoardState(resolvedFen, nextHist)

      const nextResult = state.result || msg.result
      if (state.gameOver || nextResult) {
        setRoom((prev) =>
          prev ? { ...prev, status: 'finished', result: nextResult || prev.result } : prev,
        )
      }

      const nextClocks = msg.clocks || state.clocks
      if (nextClocks) {
        setClockBase({
          white: nextClocks.white ?? 0,
          black: nextClocks.black ?? 0,
          turn: turnFromFen(resolvedFen),
          at: Date.now(),
        })
      }

      setDrawOfferBy(null)
      setTakeback(null)
    },
    [updateBoardState],
  )

  const refreshMoves = useCallback(
    async (trustServerCount = false) => {
      if (!roomId) return
      try {
        const snap = await playApi.getRoom(roomId)
        applySnapshot(snap)
        const cached =
          !trustServerCount && roomStorageKey ? loadTokenScopedState(roomStorageKey) : null
        const targetGameId = snap?.gameId || snap?.room?.gameId || snap?.room?.game?.id
        if (targetGameId) {
          const data = await playApi.getGameMoves(targetGameId)
          const rawMoves = data?.game?.moves || data?.moves || []
          const built = buildHistoryFromMoves(rawMoves)
          const cachedCount = Array.isArray(cached?.history) ? cached.history.length : 0
          if (!trustServerCount && cachedCount > built.history.length && cached?.fen) {
            updateBoardState(cached.fen, cached.history)
          } else if (built.history.length > 0 || trustServerCount || !fenRef.current) {
            updateBoardState(built.fen || START_FEN, built.history)
          }
        }
      } catch {
        // A transient refresh failure should not break the live board.
      }
    },
    [roomId, roomStorageKey, applySnapshot, updateBoardState],
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
        if (msg.fen && Array.isArray(msg.members)) applySnapshot(msg)
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
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                status: 'finished',
                result: msg.result || msg.game?.result || prev.result,
              }
            : prev,
        )
        const endFen = msg.fen || msg.state?.fen
        if (endFen && (endFen !== START_FEN || (historyRef.current?.length ?? 0) === 0)) {
          updateBoardState(endFen, undefined)
        }
        setDrawOfferBy(null)
        setTakeback(null)
        return
      }

      if (msg.fen && Array.isArray(msg.members)) applySnapshot(msg)
    },
    [roomStorageKey, applyMove, applySnapshot, addComment, refreshMoves, updateBoardState],
  )

  useEffect(() => {
    handleMessageRef.current = handleMessage
  }, [handleMessage])

  useEffect(() => {
    refreshMovesRef.current = refreshMoves
  }, [refreshMoves])

  // Join the room and load the initial snapshot, move list, and chat.
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

    const cached = roomStorageKey ? loadTokenScopedState(roomStorageKey) : null
    if (cached?.fen) {
      updateBoardState(cached.fen, Array.isArray(cached.history) ? cached.history : [])
    }

    ;(async () => {
      try {
        const preSnap = await playApi.getRoom(roomId)
        if (!active) return
        const detectedType = playApi.getRoomBoardType(preSnap)
        if (detectedType !== 'chess') {
          setWrongBoardType(detectedType)
          setError(
            'This room is a 10×10 Chess game. You can only open Normal 8×8 Chess games from the Normal Chess room.',
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

        const cachedState = roomStorageKey ? loadTokenScopedState(roomStorageKey) : null
        const targetGameId = snap?.gameId || snap?.room?.gameId || snap?.room?.game?.id
        if (targetGameId) {
          const data = await playApi.getGameMoves(targetGameId)
          if (!active) return
          const rawMoves = data?.game?.moves || data?.moves || []
          const built = buildHistoryFromMoves(rawMoves)
          const cachedCount = Array.isArray(cachedState?.history) ? cachedState.history.length : 0

          if (cachedCount > built.history.length && cachedState?.fen) {
            updateBoardState(cachedState.fen, cachedState.history)
          } else if (built.history.length > 0 || !fenRef.current) {
            updateBoardState(built.fen || START_FEN, built.history)
          }

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
        }

        const page = await playApi.listComments(roomId, { limit: 50 })
        if (active) setComments(page?.comments || [])
      } catch (err) {
        if (active) setError(err?.message || 'Unable to join this room.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [enabled, roomId, roomStorageKey, applySnapshot, updateBoardState])

  // Live connection. The JWT rides in the Sec-WebSocket-Protocol header, with
  // a ?token= fallback for servers that do not echo the subprotocol.
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
        setError(err?.message || 'Could not open the live connection.')
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
          setError('The server is at capacity. Please try again shortly.')
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

  // Poll room state during both waiting and active play so players behind
  // proxies that block WebSockets still receive opponent moves in real time.
  useEffect(() => {
    if (!enabled || !roomId || roomDeleted || wrongBoardType || !joined) return undefined
    if (room?.status === 'finished') return undefined

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
  }, [
    enabled,
    roomId,
    room?.status,
    roomDeleted,
    wrongBoardType,
    joined,
    roomStorageKey,
    applySnapshot,
  ])

  const members = useMemo(() => room?.members || [], [room?.members])
  const gameStatus = room?.status || (roomId ? 'waiting' : 'idle')
  const result = room?.result || null

  const chess = useMemo(() => {
    try {
      return fen ? new Chess(fen) : new Chess()
    } catch {
      return new Chess()
    }
  }, [fen])

  const turn = chess.turn()
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
  const ownerMember = useMemo(() => {
    const explicitOwnerId = room?.ownerId || room?.owner_id
    if (explicitOwnerId) {
      const found = members.find((m) => sameId(getMemberUserId(m), explicitOwnerId))
      if (found) return found
      return { userId: explicitOwnerId }
    }
    const players = members.filter((m) => m.seat === 'white' || m.seat === 'black')
    const candidates = players.length > 0 ? players : members
    if (candidates.length === 0) return null
    const sorted = [...candidates].sort((a, b) => {
      const rawA = a.joinedAt || a.joined_at
      const rawB = b.joinedAt || b.joined_at
      const tA = rawA ? new Date(rawA).getTime() : 0
      const tB = rawB ? new Date(rawB).getTime() : 0
      if (tA !== tB) return tA - tB
      if (a.seat === 'white' && b.seat !== 'white') return -1
      if (b.seat === 'white' && a.seat !== 'white') return 1
      return 0
    })
    return sorted[0] || null
  }, [room?.ownerId, room?.owner_id, members])

  const ownerId = getMemberUserId(ownerMember) || room?.ownerId || room?.owner_id || null
  const ownerUsername = ownerMember?.username || ownerMember?.user?.username || null
  const canDeleteRoom = Boolean(
    (ownerId && sameId(ownerId, currentUserId)) ||
      (ownerUsername && currentUsername && sameId(ownerUsername, currentUsername)) ||
      (!ownerId && !ownerUsername && mySeat === 'white' && !blackPlayer) ||
      sameId(currentUserRole, 'admin') ||
      sameId(currentUsername, 'admin'),
  )
  const isMyTurn =
    isPlayer &&
    gameStatus === 'active' &&
    !chess.isGameOver() &&
    ((mySeat === 'white' && turn === 'w') || (mySeat === 'black' && turn === 'b'))
  const canMove = isMyTurn

  const status = useMemo(() => {
    if (gameStatus === 'waiting') {
      return { kind: 'waiting', label: 'Waiting for an opponent to join' }
    }
    if (gameStatus === 'finished') {
      return { kind: isDrawResult(result) ? 'draw' : 'finished', label: describeResult(result) }
    }
    return getGameStatus(chess)
  }, [gameStatus, result, chess])

  const captured = useMemo(() => getCapturedFromFen(fen), [fen])

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

      let executed = null
      let nextFen = null
      let probe = null
      try {
        probe = new Chess(fen || undefined)
        const piece = probe.get(from)
        const isPromo =
          piece?.type === 'p' && (String(to).endsWith('8') || String(to).endsWith('1'))
        executed = probe.move(isPromo ? { from, to, promotion: promotion || 'q' } : { from, to })
        if (!executed) return false
        nextFen = probe.fen()
      } catch {
        return false
      }

      const nextHistory = [
        ...history,
        {
          san: executed.san,
          from: executed.from,
          to: executed.to,
          color: executed.color,
          piece: executed.piece,
          captured: executed.captured,
          promotion: executed.promotion,
          ply: history.length + 1,
        },
      ]
      updateBoardState(nextFen, nextHistory)

      const isCheckmate = probe.isCheckmate()
      const isStalemate = probe.isStalemate()
      const isDraw = probe.isDraw()
      const isGameOver = probe.isGameOver()
      const computedResult = isCheckmate
        ? executed.color === 'w'
          ? 'white_checkmate'
          : 'black_checkmate'
        : isStalemate
          ? 'stalemate'
          : probe.isInsufficientMaterial()
            ? 'insufficient_material'
            : probe.isThreefoldRepetition()
              ? 'threefold_repetition'
              : isDraw
                ? 'fifty_move_rule'
                : null

      const nextStatePayload = {
        fen: nextFen,
        turn: executed.color === 'w' ? 'b' : 'w',
        history: nextHistory,
        check: probe.isCheck(),
        checkmate: isCheckmate,
        stalemate: isStalemate,
        draw: isDraw,
        gameOver: isGameOver,
        result: computedResult,
      }

      if (isGameOver) {
        setRoom((prev) =>
          prev ? { ...prev, status: 'finished', result: computedResult || prev.result } : prev,
        )
      }

      const movePayload = {
        type: 'move',
        boardType: 'chess',
        from,
        to,
        ...(executed.promotion ? { promotion: executed.promotion } : {}),
        san: executed.san,
        fen: nextFen,
        gameOver: isGameOver,
        ...(computedResult ? { result: computedResult } : {}),
        state: nextStatePayload,
        clientState: nextStatePayload,
      }

      pendingMoveRef.current = true
      playApi
        .makeRoomMove(roomId, movePayload)
        .then((res) => {
          pendingMoveRef.current = false
          if (res && !res.error) {
            applyMove(res)
          }
        })
        .catch((err) => {
          pendingMoveRef.current = false
          const socket = socketRef.current
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(movePayload))
            return
          }
          setError(err?.message || 'Move could not be completed.')
          refreshMovesRef.current(true)
        })

      return true
    },
    [isPlayer, gameStatus, fen, history, updateBoardState, roomId, applyMove],
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
  const leaveRoom = useCallback(async () => {
    if (!roomId) return false
    setError(null)
    roomDeletedRef.current = true
    if (socketRef.current) {
      socketRef.current.onclose = null
      try {
        socketRef.current.close()
      } catch {
        // ignore
      }
      socketRef.current = null
    }
    try {
      await playApi.leaveRoom(roomId)
      return true
    } catch {
      return false
    }
  }, [roomId])
  const deleteRoom = useCallback(async () => {
    if (!roomId) return false
    setError(null)
    const markSessionDeleted = () => {
      try {
        const raw = sessionStorage.getItem('achess_deleted_rooms')
        const list = raw ? JSON.parse(raw) : []
        const set = new Set(Array.isArray(list) ? list : [])
        set.add(String(roomId))
        sessionStorage.setItem('achess_deleted_rooms', JSON.stringify(Array.from(set).slice(-200)))
      } catch {
        // ignore storage errors
      }
    }
    try {
      await playApi.deleteRoom(roomId)
      markSessionDeleted()
      roomDeletedRef.current = true
      setRoomDeleted(true)
      if (roomStorageKey) saveTokenScopedState(roomStorageKey, null)
      return true
    } catch (err) {
      if (err?.status === 404) {
        markSessionDeleted()
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
    ownerId,
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
    leaveRoom,
    deleteRoom,
    requestTakeback,
    acceptTakeback,
    declineTakeback,
    sendComment,
    refresh: refreshMoves,
  }
}
