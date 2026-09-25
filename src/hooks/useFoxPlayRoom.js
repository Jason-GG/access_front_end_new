import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as playApi from '../api/playApi'
import { FoxChess } from '../services/foxChessEngine'
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

export function useFoxPlayRoom({ roomId, currentUserId, enabled = true }) {
  const [room, setRoom] = useState(null)
  const [fen, setFen] = useState(null)
  const [history, setHistory] = useState([])
  const [captured, setCaptured] = useState({ white: [], black: [] })
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

  const engineRef = useRef(new FoxChess())
  const socketRef = useRef(null)
  const handleMessageRef = useRef(() => {})

  const syncFromEngine = useCallback(() => {
    const engine = engineRef.current
    setFen(engine.fen())
    setHistory([...engine.history()])
    setCaptured(engine.captured())
  }, [])

  const applySnapshot = useCallback((snap) => {
    if (!snap || typeof snap !== 'object') return
    const source = snap.room || snap.snapshot || snap.data || snap
    if (!source || typeof source !== 'object') return

    if (snap.seat) setJoinedSeat(snap.seat)
    if (source.seat) setJoinedSeat(source.seat)

    setRoom((prev) => ({ ...(prev || {}), ...source }))
    if ('drawOfferBy' in source) setDrawOfferBy(source.drawOfferBy || null)

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
  }, [])

  const addComment = useCallback((comment) => {
    if (!comment || !comment.id) return
    setComments((prev) =>
      prev.some((item) => sameId(item.id, comment.id)) ? prev : [...prev, comment],
    )
  }, [])

  const applyMove = useCallback(
    (msg) => {
      const state = msg.state || {}
      const moveData = msg.move?.move ?? msg.move ?? (msg.from || msg.san ? msg : null)

      if (moveData) {
        const engine = engineRef.current
        const from = moveData.from
        const to = moveData.to
        const promotion = moveData.promotion

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
            // ignore bad/mismatched moves
          }
          syncFromEngine()
        }
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
          turn: engineRef.current.turn(),
          at: Date.now(),
        })
      }

      setDrawOfferBy(null)
      setTakeback(null)
    },
    [syncFromEngine],
  )

  const refreshMoves = useCallback(async () => {
    if (!roomId) return
    try {
      const snap = await playApi.getRoom(roomId)
      applySnapshot(snap)
      const targetGameId = snap?.gameId || snap?.room?.gameId || snap?.room?.game?.id
      if (targetGameId) {
        const data = await playApi.getGameMoves(targetGameId)
        const rawMoves = data?.game?.moves || data?.moves || []
        const engine = new FoxChess()
        for (const m of rawMoves) {
          try {
            if (m.from && m.to) {
              engine.move({ from: m.from, to: m.to, promotion: m.promotion })
            } else if (m.san) {
              engine.move(m.san)
            }
          } catch {
            // ignore
          }
        }
        engineRef.current = engine
        syncFromEngine()
      }
    } catch {
      // Non-fatal
    }
  }, [roomId, applySnapshot, syncFromEngine])

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
          engineRef.current.undo()
          syncFromEngine()
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
        setDrawOfferBy(null)
        setTakeback(null)
        return
      }

      if (msg.members) applySnapshot(msg)
    },
    [applyMove, applySnapshot, addComment, syncFromEngine],
  )

  useEffect(() => {
    handleMessageRef.current = handleMessage
  }, [handleMessage])

  // Join the room and load initial snapshot, moves, and chat
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
          const engine = new FoxChess()
          for (const m of rawMoves) {
            try {
              if (m.from && m.to) {
                engine.move({ from: m.from, to: m.to, promotion: m.promotion })
              } else if (m.san) {
                engine.move(m.san)
              }
            } catch {
              // ignore
            }
          }
          engineRef.current = engine
          syncFromEngine()
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
  }, [enabled, roomId, applySnapshot, syncFromEngine])

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
    if (!enabled || !roomId) return undefined
    const isWaiting =
      !room || room.status === 'waiting' || (room.members && room.members.length < 2)
    if (!isWaiting) return undefined

    const poll = async () => {
      try {
        const snap = await playApi.getRoom(roomId)
        applySnapshot(snap)
      } catch {
        // ignore
      }
    }

    const id = setInterval(poll, WAITING_POLL_MS)
    window.addEventListener('focus', poll)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', poll)
    }
  }, [enabled, roomId, room, applySnapshot])

  const members = useMemo(() => room?.members || [], [room?.members])
  const gameStatus = room?.status || (roomId ? 'waiting' : 'idle')
  const result = room?.result || null

  const engine = engineRef.current
  const turn = engine.turn()
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
    !engine.isGameOver() &&
    ((mySeat === 'white' && turn === 'w') || (mySeat === 'black' && turn === 'b'))
  const canMove = isMyTurn

  const status = useMemo(() => {
    if (gameStatus === 'waiting') {
      return { kind: 'waiting', label: 'Waiting for an opponent to join' }
    }
    if (gameStatus === 'finished') {
      return { kind: 'finished', label: result || 'Game finished' }
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
  }, [gameStatus, result, engine, turn])

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

      const payload = {
        type: 'move',
        from,
        to,
        promotion,
        san: executed.san,
        fen: eng.fen(),
        variant: 'fox',
      }

      const socket = socketRef.current
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
        return true
      }

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
