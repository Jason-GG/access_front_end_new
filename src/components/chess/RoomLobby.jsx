import { useCallback, useEffect, useRef, useState } from 'react'
import * as playApi from '../../api/playApi'
import { useAuth } from '../../hooks/useAuth'
import { FoxChess } from '../../services/foxChessEngine'
import { formatDateTime } from '../../utils/helpers'
import { Button } from '../common/Button'
import { Loader } from '../common/Loader'
import styles from './RoomLobby.module.css'

const POLL_MS = 5000
const DELETED_ROOMS_SESSION_KEY = 'achess_deleted_rooms'

function getSessionDeletedRoomIds() {
  try {
    const raw = sessionStorage.getItem(DELETED_ROOMS_SESSION_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function addSessionDeletedRoomId(roomId) {
  if (!roomId) return
  try {
    const set = getSessionDeletedRoomIds()
    set.add(String(roomId))
    sessionStorage.setItem(DELETED_ROOMS_SESSION_KEY, JSON.stringify(Array.from(set).slice(-200)))
  } catch {
    // ignore storage errors
  }
}

function getMemberId(member) {
  return member?.user?.id || member?.userId || member?.user_id || member?.id || null
}

function hostMember(room) {
  const members = Array.isArray(room?.members) ? room.members : []
  const explicitOwnerId = room?.ownerId || room?.owner_id
  if (explicitOwnerId) {
    const found = members.find((m) => String(getMemberId(m)) === String(explicitOwnerId))
    if (found) return found
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
}

function hostName(room) {
  const owner = hostMember(room)
  return owner?.user?.username || owner?.username || 'A player'
}

function canUserDeleteRoom(room, user) {
  if (!user) return false
  if (
    String(user.role || '').toLowerCase() === 'admin' ||
    String(user.username || '').toLowerCase() === 'admin'
  ) {
    return true
  }
  const owner = hostMember(room)
  const ownerId = room?.ownerId || room?.owner_id || getMemberId(owner)
  const ownerUsername = owner?.user?.username || owner?.username
  if (ownerId && user.id && String(ownerId) === String(user.id)) return true
  if (
    ownerUsername &&
    user.username &&
    String(ownerUsername).toLowerCase() === String(user.username).toLowerCase()
  ) {
    return true
  }
  return false
}

function isUserInRoom(room, user) {
  if (!user || !Array.isArray(room?.members)) return false
  return room.members.some((m) => {
    const uid = m?.user?.id || m?.userId || m?.id
    const uname = m?.user?.username || m?.username
    return (
      (uid && user.id && String(uid) === String(user.id)) ||
      (uname && user.username && String(uname).toLowerCase() === String(user.username).toLowerCase())
    )
  })
}

function timeControl(room) {
  const ms = room.game?.whiteTimeMs || room.whiteTimeMs || room.white_time_ms
  if (!ms) return 'Unlimited'
  return `${Math.round(ms / 60000)} min`
}

export function RoomLobby({
  onEnterRoom,
  onCreateRoom,
  boardType,
  title = 'Rooms waiting for a player',
  eyebrow = 'Open challenges',
  createLabel = 'Create a room',
  emptyText,
}) {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState(null)
  const [joinId, setJoinId] = useState('')
  const deletedIdsRef = useRef(getSessionDeletedRoomIds())

  const loadRooms = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = { status: 'waiting,active', limit: 50 }
      if (boardType) params.boardType = boardType
      const data = await playApi.listRooms(params)
      const rawList = data?.rooms || []
      const sessionDeleted = getSessionDeletedRoomIds()
      sessionDeleted.forEach((id) => deletedIdsRef.current.add(id))
      const filtered = rawList.filter((r) => {
        if (!r?.id || deletedIdsRef.current.has(String(r.id))) return false
        if (r.deletedAt || r.deleted_at) return false
        if (r.result || r.game?.result) return false
        if (boardType && playApi.getRoomBoardType(r) !== boardType) return false
        const roomStatus = r.game?.status || r.status || 'waiting'
        if (roomStatus === 'finished') return false
        if (roomStatus === 'waiting') return true
        if (roomStatus === 'active' && isUserInRoom(r, user)) return true
        return false
      })
      setRooms(filtered)
      setError(null)
    } catch (err) {
      if (!silent) setError(err?.message || 'Could not load open rooms.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [boardType, user])

  useEffect(() => {
    loadRooms()
    const id = setInterval(() => loadRooms({ silent: true }), POLL_MS)
    return () => clearInterval(id)
  }, [loadRooms])

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      if (typeof onCreateRoom === 'function') {
        await onCreateRoom()
        return
      }
      let createPayload = {}
      if (boardType === 'achess') {
        const initialEngine = new FoxChess()
        const initialState = {
          boardType: 'achess',
          variant: 'fox',
          fen: initialEngine.fen(),
          turn: initialEngine.turn(),
          history: [],
          captured: { white: [], black: [] },
        }
        createPayload = {
          boardType: 'achess',
          variant: 'fox',
          fen: initialEngine.fen(),
          state: initialState,
        }
      } else if (boardType) {
        createPayload = {
          boardType: 'chess',
          variant: 'chess',
          state: { boardType: 'chess', variant: 'chess' },
        }
      }
      const res = await playApi.createRoom(createPayload)
      const newRoomId = res?.room?.id || res?.id
      if (newRoomId) {
        onEnterRoom(newRoomId)
      } else {
        setError('Room created but ID was missing.')
      }
    } catch (err) {
      setError(err?.message || 'Could not create a room.')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(id) {
    const target = (id || joinId).trim()
    if (!target) return
    setBusy(true)
    setError(null)
    try {
      if (boardType) {
        const snap = await playApi.getRoom(target)
        const targetType = playApi.getRoomBoardType(snap)
        if (targetType !== boardType) {
          setError(
            boardType === 'achess'
              ? 'This room is a Normal 8×8 Chess game. You can only open 10×10 Chess games from the 10×10 Chess room.'
              : 'This room is a 10×10 Chess game. You can only open Normal 8×8 Chess games from the Normal Chess room.',
          )
          return
        }
      }
      const res = await playApi.joinRoom(target)
      const targetId = res?.room?.id || res?.id || target
      onEnterRoom(targetId)
    } catch (err) {
      setError(err?.message || 'Could not join that room.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    const target = (id || joinId).trim()
    if (!target || deletingId) return
    setDeletingId(target)
    setError(null)
    try {
      await playApi.deleteRoom(target)
      deletedIdsRef.current.add(String(target))
      addSessionDeletedRoomId(target)
      setRooms((prev) => prev.filter((r) => r.id !== target))
      if (!id && joinId.trim() === target) {
        setJoinId('')
      }
    } catch (err) {
      if (err?.status === 404) {
        deletedIdsRef.current.add(String(target))
        addSessionDeletedRoomId(target)
        setRooms((prev) => prev.filter((r) => r.id !== target))
        if (!id && joinId.trim() === target) {
          setJoinId('')
        }
      } else {
        setError(err?.message || 'Could not remove that room.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className={styles.title}>{title}</h2>
        </div>
        <Button variant="primary" onClick={handleCreate} disabled={busy}>
          {busy ? 'Working…' : createLabel}
        </Button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <Loader label="Loading rooms" />
      ) : rooms.length === 0 ? (
        <p className={styles.empty}>
          {emptyText ||
            'No open rooms right now. Create one and the next player who joins takes the black seat.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {rooms.map((room) => {
            const isFox = playApi.getRoomBoardType(room) === 'achess'
            const isDeleting = deletingId === room.id
            const isActiveRoom = (room.game?.status || room.status) === 'active'
            return (
              <li key={room.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.hostLine}>
                    <span className={styles.host}>{hostName(room)}</span>
                    <span className={styles.variantBadge}>
                      {isFox ? '10×10 Fox' : '8×8 Chess'}
                    </span>
                  </div>
                  <span className={styles.meta}>
                    {isActiveRoom ? 'In progress · ' : ''}
                    {timeControl(room)} · {formatDateTime(room.createdAt)}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  {canUserDeleteRoom(room, user) && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(room.id)}
                      disabled={busy || isDeleting}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete room'}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleJoin(room.id)}
                    disabled={busy || isDeleting}
                  >
                    {isActiveRoom ? 'Resume' : 'Join'}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className={styles.joinBy}>
        <input
          className={styles.input}
          value={joinId}
          onChange={(event) => setJoinId(event.target.value)}
          placeholder="Paste a room id"
          aria-label="Room id"
        />
        <Button
          variant="secondary"
          onClick={() => handleJoin()}
          disabled={busy || Boolean(deletingId) || !joinId.trim()}
        >
          Join by id
        </Button>
        <Button
          variant="danger"
          onClick={() => handleDelete()}
          disabled={busy || Boolean(deletingId) || !joinId.trim()}
        >
          {deletingId && deletingId === joinId.trim() ? 'Deleting…' : 'Delete by id'}
        </Button>
      </div>
    </section>
  )
}
