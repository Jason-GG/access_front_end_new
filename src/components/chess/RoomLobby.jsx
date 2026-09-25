import { useCallback, useEffect, useState } from 'react'
import * as playApi from '../../api/playApi'
import { formatDateTime } from '../../utils/helpers'
import { Button } from '../common/Button'
import { Loader } from '../common/Loader'
import styles from './RoomLobby.module.css'

const POLL_MS = 5000

function hostName(room) {
  const white = room.members?.find((member) => member.seat === 'white')
  return white?.user?.username || white?.username || 'A player'
}

function timeControl(room) {
  const ms = room.game?.whiteTimeMs || room.whiteTimeMs || room.white_time_ms
  if (!ms) return 'Unlimited'
  return `${Math.round(ms / 60000)} min`
}

export function RoomLobby({
  onEnterRoom,
  title = 'Rooms waiting for a player',
  eyebrow = 'Open challenges',
  createLabel = 'Create a room',
  emptyText,
}) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [joinId, setJoinId] = useState('')

  const loadRooms = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const data = await playApi.listRooms({ status: 'waiting', limit: 20 })
      setRooms(data?.rooms || [])
      setError(null)
    } catch (err) {
      if (!silent) setError(err?.message || 'Could not load open rooms.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
    const id = setInterval(() => loadRooms({ silent: true }), POLL_MS)
    return () => clearInterval(id)
  }, [loadRooms])

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const res = await playApi.createRoom()
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
          {rooms.map((room) => (
            <li key={room.id} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.host}>{hostName(room)}</span>
                <span className={styles.meta}>
                  {timeControl(room)} · {formatDateTime(room.createdAt)}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleJoin(room.id)}
                disabled={busy}
              >
                Join
              </Button>
            </li>
          ))}
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
