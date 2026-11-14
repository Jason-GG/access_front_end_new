import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as playApi from '../../api/playApi'
import { useAuth } from '../../hooks/useAuth'
import { FoxChess } from '../../services/foxChessEngine'
import {
  DEFAULT_TIME_CONTROL,
  TIME_CONTROL_CATEGORIES,
  classifyTimeMinutes,
  formatTimeControlSummary,
  resolveRoomTimeControl,
} from '../../utils/constants'
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

function hostName(room, currentUser) {
  const owner = hostMember(room)
  const name =
    owner?.user?.username ||
    owner?.username ||
    room?.owner?.username ||
    room?.ownerUsername
  if (name) return name
  const ownerId = room?.ownerId || room?.owner_id || getMemberId(owner)
  if (ownerId && currentUser?.id && String(ownerId) === String(currentUser.id)) {
    return currentUser.username || currentUser.handle || 'You'
  }
  return 'A player'
}

function canUserDeleteRoom(room, user) {
  if (!user) return false
  const myUsername = user.username || user.handle || ''
  if (String(user.role || '').toLowerCase() === 'admin') {
    return true
  }
  const owner = hostMember(room)
  const ownerId = room?.ownerId || room?.owner_id || getMemberId(owner)
  const ownerUsername = owner?.user?.username || owner?.username
  if (ownerId && user.id && String(ownerId) === String(user.id)) return true
  if (
    ownerUsername &&
    myUsername &&
    String(ownerUsername).toLowerCase() === String(myUsername).toLowerCase()
  ) {
    return true
  }
  return false
}

function isUserInRoom(room, user) {
  if (!user || !Array.isArray(room?.members)) return false
  const myUsername = user.username || user.handle || ''
  return room.members.some((m) => {
    const uid = m?.user?.id || m?.userId || m?.id
    const uname = m?.user?.username || m?.username
    return (
      (uid && user.id && String(uid) === String(user.id)) ||
      (uname && myUsername && String(uname).toLowerCase() === String(myUsername).toLowerCase())
    )
  })
}

function timeControl(room) {
  const tc = resolveRoomTimeControl(room)
  if (tc) {
    return formatTimeControlSummary(tc)
  }
  const ms = room.game?.whiteTimeMs || room.whiteTimeMs || room.white_time_ms
  if (!ms) return 'Unlimited'
  return `${Math.round(ms / 60000)} min`
}

function hostScore(room, currentUser) {
  const owner = hostMember(room)
  const rawScore = owner?.score ?? owner?.user?.score
  if (typeof rawScore === 'number') return rawScore
  const ownerId = room?.ownerId || room?.owner_id || getMemberId(owner)
  if (
    ownerId &&
    currentUser?.id &&
    String(ownerId) === String(currentUser.id) &&
    typeof currentUser.score === 'number'
  ) {
    return currentUser.score
  }
  return null
}

export function RoomLobby({
  onEnterRoom,
  onCreateRoom,
  onSwitchToBot,
  boardType,
  title = 'Rooms waiting for a player',
  eyebrow = 'Open challenges',
  createLabel = 'Create a room',
  emptyText,
}) {
  const { user, score, refreshUser } = useAuth()
  const numericScore = typeof score === 'number' ? score : 500
  const isZeroScore = numericScore <= 0
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState(null)
  const [joinId, setJoinId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_TIME_CONTROL.category)
  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_TIME_CONTROL)
  const [customMinutesA, setCustomMinutesA] = useState(5)
  const [customMinutesB, setCustomMinutesB] = useState(3)
  const [filterCategory, setFilterCategory] = useState('All')
  const deletedIdsRef = useRef(getSessionDeletedRoomIds())

  const activeTimeControl = useMemo(() => {
    if (selectedCategory === 'Custom') {
      const mA = Math.min(180, Math.max(1, Number(customMinutesA) || 1))
      const mB = Math.min(180, Math.max(1, Number(customMinutesB) || 1))
      return {
        category: 'Custom',
        label: `${mA}+${mB}`,
        minutesA: mA,
        minutesB: mB,
      }
    }
    return selectedPreset || DEFAULT_TIME_CONTROL
  }, [selectedCategory, selectedPreset, customMinutesA, customMinutesB])

  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey)
    const foundCat = TIME_CONTROL_CATEGORIES.find((c) => c.key === catKey)
    if (foundCat && foundCat.presets.length > 0) {
      setSelectedPreset(foundCat.presets[0])
    }
  }

  const handleSelectPreset = (preset) => {
    setSelectedCategory(preset.category)
    setSelectedPreset(preset)
  }

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
    if (isZeroScore) {
      setError(
        'Your score is 0! You must play with the Computer to win score (+5 per win) before competing with normal users.',
      )
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (typeof onCreateRoom === 'function') {
        await onCreateRoom(activeTimeControl)
        return
      }
      let createPayload = {
        timeControl: activeTimeControl,
      }
      if (boardType === 'achess') {
        const initialEngine = new FoxChess()
        const initialState = {
          boardType: 'achess',
          variant: 'fox',
          fen: initialEngine.fen(),
          turn: initialEngine.turn(),
          history: [],
          captured: { white: [], black: [] },
          timeControl: activeTimeControl,
        }
        createPayload = {
          boardType: 'achess',
          variant: 'fox',
          fen: initialEngine.fen(),
          timeControl: activeTimeControl,
          state: initialState,
        }
      } else if (boardType) {
        createPayload = {
          boardType: 'chess',
          variant: 'chess',
          timeControl: activeTimeControl,
          state: { boardType: 'chess', variant: 'chess', timeControl: activeTimeControl },
        }
      } else {
        createPayload = {
          boardType: 'chess',
          variant: 'chess',
          timeControl: activeTimeControl,
          state: { boardType: 'chess', variant: 'chess', timeControl: activeTimeControl },
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
      if (err?.status === 403) {
        refreshUser?.()
      }
      setError(err?.message || 'Could not create a room.')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(id) {
    const target = (id || joinId).trim()
    if (!target) return
    if (isZeroScore) {
      setError(
        'Your score is 0! You must play with the Computer to win score (+5 per win) before competing with normal users.',
      )
      return
    }
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
      if (err?.status === 403) {
        refreshUser?.()
      }
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
      refreshUser?.()
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

  const displayedRooms = useMemo(() => {
    if (filterCategory === 'All') return rooms
    return rooms.filter((room) => {
      const tc = resolveRoomTimeControl(room)
      const cat = tc?.category || classifyTimeMinutes(tc?.minutesA || 10, tc?.minutesB || 10)
      return cat === filterCategory
    })
  }, [rooms, filterCategory])

  const activeMaxMin = Math.max(activeTimeControl.minutesA, activeTimeControl.minutesB)
  const activeMinMin = Math.min(activeTimeControl.minutesA, activeTimeControl.minutesB)
  const isAsymmetricActive = activeMaxMin !== activeMinMin

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className={styles.title}>{title}</h2>
        </div>
        <div className={styles.headRight}>
          <span
            className={`${styles.myScorePill} ${isZeroScore ? styles.myScorePillZero : ''}`}
            title="New users start with 500 score · Win: +5 · Loss: -5"
          >
            Your Score: ★ {numericScore} pts
          </span>
          <Button variant="primary" onClick={handleCreate} disabled={busy || isZeroScore}>
            {busy
              ? 'Working…'
              : `${createLabel} (${activeTimeControl.category} · ${activeTimeControl.label})`}
          </Button>
        </div>
      </div>

      <div className={styles.timeControlSection} aria-label="Time control options">
        <div className={styles.timeControlHeader}>
          <div>
            <h3 className={styles.timeControlTitle}>Time Control Options (Minutes)</h3>
            <p className={styles.timeControlSubtitle}>
              Select a time category before creating a room. Asymmetric controls like{' '}
              <strong>2+1</strong> give <strong>2 minutes</strong> to the lower-score player and{' '}
              <strong>1 minute</strong> to the higher-score player.
            </p>
          </div>
          <span className={styles.selectedTimePill}>
            Selected: <strong>{activeTimeControl.category}</strong> ·{' '}
            <strong>{activeTimeControl.label}</strong>
          </span>
        </div>

        <div className={styles.categoryGrid} role="tablist" aria-label="Time categories">
          {TIME_CONTROL_CATEGORIES.map((cat) => {
            const isActiveCat = selectedCategory === cat.key
            return (
              <div
                key={cat.key}
                className={`${styles.categoryCard} ${isActiveCat ? styles.categoryCardActive : ''}`}
                onClick={() => handleSelectCategory(cat.key)}
                role="tab"
                aria-selected={isActiveCat}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelectCategory(cat.key)
                  }
                }}
              >
                <div className={styles.categoryCardTop}>
                  <span className={styles.categoryName}>{cat.label}</span>
                  <span className={styles.categoryRange}>{cat.rangeText}</span>
                </div>
                {cat.presets.length > 0 ? (
                  <div className={styles.presetRow}>
                    {cat.presets.map((preset) => {
                      const isPresetSelected =
                        selectedCategory === cat.key && selectedPreset?.label === preset.label
                      const isHandicap = preset.minutesA !== preset.minutesB
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          className={`${styles.presetBtn} ${
                            isPresetSelected ? styles.presetBtnActive : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectPreset(preset)
                          }}
                          title={
                            isHandicap
                              ? `${preset.minutesA} min vs ${preset.minutesB} min (Player with higher score gets ${ Math.min(preset.minutesA, preset.minutesB)} min)`
                              : `${preset.minutesA} minutes per player`
                          }
                        >
                          <span>{preset.label}</span>
                          {isHandicap && <span className={styles.handicapTag}>vs</span>}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div
                    className={styles.customInputsWrap}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (selectedCategory !== 'Custom') setSelectedCategory('Custom')
                    }}
                  >
                    <label className={styles.customField}>
                      <span>Lower score (min)</span>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={customMinutesA}
                        onChange={(e) => {
                          setSelectedCategory('Custom')
                          setCustomMinutesA(e.target.value)
                        }}
                        className={styles.customNumberInput}
                      />
                    </label>
                    <span className={styles.customPlus}>+</span>
                    <label className={styles.customField}>
                      <span>Higher score (min)</span>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={customMinutesB}
                        onChange={(e) => {
                          setSelectedCategory('Custom')
                          setCustomMinutesB(e.target.value)
                        }}
                        className={styles.customNumberInput}
                      />
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.timeRuleBanner}>
          <span className={styles.timeRuleBadge}>Rule</span>
          {isAsymmetricActive ? (
            <span>
              <strong>{activeTimeControl.label}</strong> means one player has{' '}
              <strong>{activeMaxMin} min</strong> and the other has{' '}
              <strong>{activeMinMin} min</strong> — the{' '}
              <strong>player with the higher score gets {activeMinMin} minute{activeMinMin === 1 ? '' : 's'}</strong>{' '}
              (and the player with the lower score gets {activeMaxMin} minutes).
            </span>
          ) : (
            <span>
              <strong>{activeTimeControl.label}</strong> ({activeTimeControl.category}): Both players
              receive <strong>{activeMaxMin} minute{activeMaxMin === 1 ? '' : 's'}</strong>. Tip:
              Choose an asymmetric option like <strong>2+1</strong>, <strong>5+4</strong>,{' '}
              <strong>15+10</strong>, or <strong>30+20</strong> so the higher-score player gets the
              shorter time!
            </span>
          )}
        </div>
      </div>

      {isZeroScore && (
        <div className={styles.zeroScoreLockout} role="alert">
          <div className={styles.zeroScoreContent}>
            <strong>Score Depleted (0 / 500 pts)</strong>
            <p>
              You lost all 500 score points and cannot compete with normal users right now. Play
              with the Computer to win <strong>+5 score</strong> per victory, then you can compete
              with normal users again!
            </p>
          </div>
          {typeof onSwitchToBot === 'function' && (
            <Button variant="primary" size="sm" onClick={onSwitchToBot}>
              Play vs Computer (+5 pts / win)
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.filterBar} aria-label="Filter rooms by time category">
        <span className={styles.filterLabel}>Filter rooms:</span>
        {['All', 'Bullet', 'Blitz', 'Rapid', 'Classical', 'Custom'].map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.filterChip} ${filterCategory === cat ? styles.filterChipActive : ''}`}
            onClick={() => setFilterCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader label="Loading rooms" />
      ) : displayedRooms.length === 0 ? (
        <p className={styles.empty}>
          {filterCategory !== 'All'
            ? `No open ${filterCategory} rooms right now. Create a ${filterCategory} room above or switch filter to All.`
            : emptyText ||
              'No open rooms right now. Create one and the next player who joins takes the black seat.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {displayedRooms.map((room) => {
            const isFox = playApi.getRoomBoardType(room) === 'achess'
            const isDeleting = deletingId === room.id
            const isActiveRoom = (room.game?.status || room.status) === 'active'
            const ownerPts = hostScore(room, user)
            const roomTc = resolveRoomTimeControl(room)
            return (
              <li key={room.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.hostLine}>
                    <span className={styles.host}>{hostName(room, user)}</span>
                    {typeof ownerPts === 'number' && (
                      <span className={styles.hostScoreBadge}>★ {ownerPts} pts</span>
                    )}
                    <span className={styles.variantBadge}>
                      {isFox ? '10×10 Fox' : '8×8 Chess'}
                    </span>
                    {roomTc && (
                      <span className={styles.timeCategoryBadge}>
                        ⏱ {roomTc.category} · {roomTc.label}
                      </span>
                    )}
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
                    disabled={busy || isDeleting || (isZeroScore && !isActiveRoom)}
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
          disabled={busy || Boolean(deletingId) || !joinId.trim() || isZeroScore}
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
