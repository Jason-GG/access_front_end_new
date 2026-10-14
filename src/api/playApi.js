import { httpClient } from '../services/request'

function withQuery(path, params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  })
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function getRoomBoardType(raw) {
  if (!raw || typeof raw !== 'object') return 'chess'
  const room = raw.room || raw.snapshot || raw.data || raw

  const candidates = [
    room.boardType,
    room.board_type,
    room.game?.boardType,
    room.game?.board_type,
    room.game?.state?.boardType,
    room.game?.state?.board_type,
    room.game?.state?.clientState?.boardType,
    room.game?.clientState?.boardType,
    room.state?.boardType,
    room.state?.board_type,
    room.state?.clientState?.boardType,
    room.clientState?.boardType,
    room.clientState?.board_type,
  ]

  for (const c of candidates) {
    if (c === 'achess' || c === 'fox' || c === '10x10') return 'achess'
    if (c === 'chess' || c === '8x8') return 'chess'
  }

  const variants = [
    room.variant,
    room.game?.variant,
    room.game?.state?.variant,
    room.game?.state?.clientState?.variant,
    room.game?.clientState?.variant,
    room.state?.variant,
    room.clientState?.variant,
  ]

  for (const v of variants) {
    if (v === 'fox' || v === 'achess' || v === '10x10') return 'achess'
    if (v === 'chess' || v === 'standard' || v === '8x8') return 'chess'
  }

  const fens = [
    room.fen,
    room.clientState?.fen,
    room.state?.fen,
    room.game?.fen,
    room.game?.state?.fen,
    room.game?.state?.clientState?.fen,
    room.game?.clientState?.fen,
  ]

  for (const f of fens) {
    if (typeof f === 'string' && f.trim()) {
      const ranks = f.trim().split(/\s+/)[0]?.split('/')
      if (Array.isArray(ranks)) {
        if (ranks.length === 10) return 'achess'
        if (ranks.length === 8) return 'chess'
      }
    }
  }

  return 'chess'
}

export function listRooms({ status = 'waiting', limit = 50, cursor, boardType } = {}) {
  return httpClient.get(withQuery('/play/rooms', { status, limit, cursor, boardType }))
}

export function createRoom(payload) {
  let body = {}
  if (typeof payload === 'string') {
    body = { gameId: payload }
  } else if (payload && typeof payload === 'object') {
    body = { ...payload }
  }
  return httpClient.post('/play/rooms', body)
}

export function joinRoom(id) {
  return httpClient.post(`/play/rooms/${id}/join`, {})
}

export function getRoom(id) {
  return httpClient.get(`/play/rooms/${id}`)
}

export function getGameMoves(gameId) {
  return httpClient.get(`/games/${gameId}/moves`)
}

export function makeRoomMove(id, { from, to, promotion, state, clientState }) {
  const body = { from, to }
  if (promotion) body.promotion = promotion
  const payloadState = state !== undefined ? state : clientState
  if (payloadState !== undefined) {
    body.state = payloadState
    body.clientState = payloadState
  }
  return httpClient.post(`/play/rooms/${id}/moves`, body)
}

export function resignRoom(id) {
  return httpClient.post(`/play/rooms/${id}/resign`, { action: 'resign' })
}

export function drawRoom(id, action) {
  return httpClient.post(`/play/rooms/${id}/draw`, { action })
}

export function takebackRoom(id, action) {
  return httpClient.post(`/play/rooms/${id}/takeback`, { action })
}

export function abortRoom(id) {
  return httpClient.post(`/play/rooms/${id}/abort`, {})
}

export function deleteRoom(id) {
  return httpClient.del(`/play/rooms/${id}`)
}

export function listComments(id, { cursor, limit = 50 } = {}) {
  return httpClient.get(withQuery(`/play/rooms/${id}/comments`, { cursor, limit }))
}

export function postComment(id, body) {
  return httpClient.post(`/play/rooms/${id}/comments`, { body })
}
