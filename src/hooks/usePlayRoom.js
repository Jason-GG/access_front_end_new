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
import { getStoredAccessToken, getWebSocketBaseUrl } from '../services/request'

const WAITING_POLL_MS = 1500
const CLOCK_TICK_MS = 500

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

export function usePlayRoom({ roomId, currentUserId, enabled = true }) {
  const [room, setRoom] = useState(null)
  const [fen, setFen] = useState(null)
  const [history, setHistory] = useState([])
  const [comments, setComments] = useState([])
  const [clockBase, setClockBase] = useState(null)
  const [drawOfferBy, setDrawOfferBy] = useState(null)
  const [takeback, setTakeback] = useState(null)
  const [connection, setConnection] = useState('idle')
  const [loading, setLoading] = useState(Boolean(roomId))
  const [joined, setJoined] = useState(false)
  const [joinedSeat, setJoinedSeat] = useState(null)
  const [error, setError] = useState(null)
  const [chatError, setChatError] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const socketRef = useRef(null)
  const handleMessageRef = useRef(() => {})

  const applySnapshot = useCallback((snap) => {
    if (!snap || typeof snap !== 'object') return
    const source = snap.room || snap.snapshot || snap.data || snap
    if (!source || typeof source !== 'object') return

    if (snap.seat) setJoinedSeat(snap.seat)
    if (source.seat) setJoinedSeat(source.seat)

    setRoom((prev) => ({ ...(prev || {}), ...source }))
    if (source.fen) setFen(source.fen)
    if ('drawOfferBy' in source) setDrawOfferBy(source.drawOfferBy || null)

    const whiteClock = source.clocks?.white ?? source.whiteTimeMs ?? source.white_time_ms
    const blackClock = source.clocks?.black ?? source.blackTimeMs ?? source.black_time_ms
    if (whiteClock != null && blackClock != null) {
      setClockBase({
        white: Number(whiteClock),
        black: Number(blackClock),
        turn: turnFromFen(source.fen),
        at: Date.now(),
      })
    }
  }, [])

  const addComment = useCallback((comment) => {
    if (!comment || !comment.id) return
    setComments((prev) =>
      prev.some((item) => sameId(item.id, comment.id)) ? prev : [...prev, comment],
    )
  }, [])

  const applyMove = useCallback((msg) => {
    const state = msg.state || {}
    const moveData = msg.move?.move ?? msg.move ?? (msg.from || msg.san ? msg : null)
    const nextFen = state.fen || msg.fen || msg.move?.fen || moveData?.fen
    if (nextFen) setFen(nextFen)

    if (moveData) {
      let moveObj = moveData
      if (typeof moveData === 'string') {
        moveObj = { san: moveData }
      } else if (!moveData.san && moveData.from && moveData.to) {
        try {
          const c = new Chess(fen || undefined)
          const m = c.move({
            from: moveData.from,
            to: moveData.to,
            promotion: moveData.promotion || 'q',
          })
          if (m) moveObj = m
        } catch {
          // keep moveData
        }
      }
      setHistory((prev) => [...prev, moveObj])
    }

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
        turn: turnFromFen(nextFen),
        at: Date.now(),
      })
    }

    setDrawOfferBy(null)
    setTakeback(null)
  }, [fen])

  const refreshMoves = useCallback(async () => {
    if (!roomId) return
    try {
      const snap = await playApi.getRoom(roomId)
      applySnapshot(snap)
      const targetGameId = snap?.gameId || snap?.room?.gameId || snap?.room?.game?.id
      if (targetGameId) {
        const data = await playApi.getGameMoves(targetGameId)
        const built = buildHistoryFromMoves(data?.game?.moves || data?.moves || [])
        setHistory(built.history)
        if (built.fen) setFen(built.fen)
      }
    } catch {
      // A transient refresh failure should not break the live board.
    }
  }, [roomId, applySnapshot])

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
          refreshMoves()
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

      if (type.includes('move')) {
        applyMove(msg)
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
        if (msg.fen || msg.state?.fen) setFen(msg.fen || msg.state.fen)
        setDrawOfferBy(null)
        setTakeback(null)
        return
      }

      if (msg.fen && Array.isArray(msg.members)) applySnapshot(msg)
    },
    [applyMove, applySnapshot, addComment, refreshMoves],
  )

  useEffect(() => {
    handleMessageRef.current = handleMessage
  }, [handleMessage])

  // Join the room and load the initial snapshot, move list, and chat.
  useEffect(() => {
    if (!enabled || !roomId) {
      setLoading(false)
      return undefined
    }

    let active = true
    setLoading(true)
    setError(null)
    setJoined(false)

    ;(async () => {
      try {
        const joinRes = await playApi.joinRoom(roomId)
        if (!active) return
        if (joinRes?.seat) setJoinedSeat(joinRes.seat)
        setJoined(true)
        const snap = await playApi.getRoom(roomId)
        if (!active) return
        applySnapshot(snap)

        const targetGameId = snap?.gameId || snap?.room?.gameId || snap?.room?.game?.id
        if (targetGameId) {
          const data = await playApi.getGameMoves(targetGameId)
          if (!active) return
          const rawMoves = data?.game?.moves || data?.moves || []
          const built = buildHistoryFromMoves(rawMoves)
          setHistory(built.history)
          if (built.fen) setFen((prev) => prev || built.fen)
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
  }, [enabled, roomId, applySnapshot])

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
        attempts = 0
        setConnection('connected')
        setError(null)
      }

      socket.onmessage = (event) => handleMessageRef.current(event.data)
      socket.onerror = () => {}

      socket.onclose = (event) => {
        socketRef.current = null
        if (disposed) return

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

  // Keep the "waiting for opponent" screen fresh until a second player joins.
  useEffect(() => {
    if (!enabled || !roomId) return undefined
    const isWaiting =
      !room || room.status === 'waiting' || (room.members && room.members.length < 2)
    if (!isWaiting) return undefined

    const poll = async () => {
      try {
        const snap = await playApi.getRoom(roomId)
        applySnapshot(snap)
      } catch {
        // ignore polling errors
      }
    }

    const id = setInterval(poll, WAITING_POLL_MS)
    window.addEventListener('focus', poll)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', poll)
    }
  }, [enabled, roomId, room?.status, room?.members?.length, applySnapshot])

  const members = room?.members || []
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
  const myMember = members.find((member) => sameId(getMemberUserId(member), currentUserId))
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

      try {
        const probe = new Chess(fen || undefined)
        if (!probe.move({ from, to, promotion })) return false
      } catch {
        return false
      }

      const socket = socketRef.current
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'move', from, to, promotion }))
        return true
      }

      // REST fallback when WebSocket is unavailable or reconnecting
      playApi
        .makeRoomMove(roomId, { from, to, promotion })
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
    [isPlayer, gameStatus, fen, roomId, applyMove],
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
    requestTakeback,
    acceptTakeback,
    declineTakeback,
    sendComment,
    refresh: refreshMoves,
  }
}
