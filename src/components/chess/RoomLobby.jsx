import { useCallback, useEffect, useState } from 'react'
import * as playApi from '../../api/playApi'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime } from '../../utils/helpers'
import { Button } from '../common/Button'
import { Loader } from '../common/Loader'
import styles from './RoomLobby.module.css'

const POLL_MS = 5000

function sameId(a, b) {
  return a != null && b != null && String(a) === String(b)
}

function hostMember(room) {
  return room.members?.find((member) => member.seat === 'white')
}

function hostName(room) {
  const white = hostMember(room)
  return white?.user?.username || white?.username || 'A player'
}

function canUserDeleteRoom(room, user) {
  if (!user) return false
  if (user.role === 'admin') return true
  const white = hostMember(room)
  const whiteId = white?.user?.id || white?.userId || room.createdById || room.created_by_id
  return sameId(whiteId, user.id)
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

  const loadRooms = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = { status: 'waiting', limit: 20 }
      if (boardType) params.boardType = boardType
      const data = await playApi.listRooms(params)
      const rawList = data?.rooms || []
      const filtered = boardType
        ? rawList.filter((r) => {
            const type = r.boardType || r.game?.boardType || (r.variant === 'fox' ? 'achess' : 'chess')
            return type === boardType
          })
        : rawList
      setRooms(filtered)
      setError(null)
    } catch (err) {
      if (!silent) setError(err?.message || 'Could not load open rooms.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [boardType])

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
      const res = await playApi.createRoom(boardType ? { boardType } : {})
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
    if (!id || deletingId) return
    setDeletingId(id)
    setError(null)
    try {
      await playApi.deleteRoom(id)
      setRooms((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err?.message || 'Could not delete that room.')
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
            const isFox =
              room.boardType === 'achess' ||
              room.game?.boardType === 'achess' ||
              room.variant === 'fox' ||
              room.game?.variant === 'fox'
            const canDelete = canUserDeleteRoom(room, user)
            const isDeleting = deletingId === room.id
            return (
              <li key={room.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.hostLine}>
                    <span className={styles.host}>{hostName(room)}</span>
                    {isFox && <span className={styles.variantBadge}>10×10 Fox</span>}
                  </div>
                  <span className={styles.meta}>
                    {timeControl(room)} · {formatDateTime(room.createdAt)}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  {canDelete && (
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
                    Join
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
          disabled={busy || !joinId.trim()}
        >
          Join by id
        </Button>
      </div>
    </section>
  )
}
