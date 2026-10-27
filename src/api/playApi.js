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
    room.game?.state?.clientState?.board_type,
    room.game?.clientState?.boardType,
    room.game?.clientState?.board_type,
    room.state?.boardType,
    room.state?.board_type,
    room.state?.clientState?.boardType,
    room.state?.clientState?.board_type,
    room.clientState?.boardType,
    room.clientState?.board_type,
  ]

  const variants = [
    room.variant,
    room.game?.variant,
    room.game?.state?.variant,
    room.game?.state?.clientState?.variant,
    room.game?.clientState?.variant,
    room.state?.variant,
    room.state?.clientState?.variant,
    room.clientState?.variant,
  ]

  const fens = [
    room.fen,
    room.initialFen,
    room.clientState?.fen,
    room.state?.fen,
    room.state?.initialFen,
    room.game?.fen,
    room.game?.initialFen,
    room.game?.state?.fen,
    room.game?.state?.initialFen,
    room.game?.state?.clientState?.fen,
    room.game?.clientState?.fen,
  ]

  // Check ALL signals for 10x10 / achess / fox FIRST so a default 'chess' column
  // on game_states never masks a 10x10 room.
  for (const c of candidates) {
    if (typeof c === 'string') {
      const lower = c.trim().toLowerCase()
      if (lower === 'achess' || lower === 'fox' || lower === '10x10' || lower === '10*10') {
        return 'achess'
      }
    }
  }

  for (const v of variants) {
    if (typeof v === 'string') {
      const lower = v.trim().toLowerCase()
      if (lower === 'fox' || lower === 'achess' || lower === '10x10' || lower === '10*10') {
        return 'achess'
      }
    }
  }

  for (const f of fens) {
    if (typeof f === 'string' && f.trim()) {
      const ranks = f.trim().split(/\s+/)[0]?.split('/')
      if (Array.isArray(ranks) && ranks.length === 10) {
        return 'achess'
      }
    }
  }

  for (const c of candidates) {
    if (typeof c === 'string') {
      const lower = c.trim().toLowerCase()
      if (lower === 'chess' || lower === '8x8' || lower === '8*8') return 'chess'
    }
  }

  for (const v of variants) {
    if (typeof v === 'string') {
      const lower = v.trim().toLowerCase()
      if (lower === 'chess' || lower === 'standard' || lower === '8x8' || lower === '8*8') return 'chess'
    }
  }

  for (const f of fens) {
    if (typeof f === 'string' && f.trim()) {
      const ranks = f.trim().split(/\s+/)[0]?.split('/')
      if (Array.isArray(ranks) && ranks.length === 8) return 'chess'
    }
  }

  return 'chess'
}

export function createGame(payload = {}) {
  return httpClient.post('/games', payload)
}

export function makeGameMove(gameId, payload = {}) {
  return httpClient.post(`/games/${gameId}/moves`, payload)
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

export function leaveRoom(id) {
  return httpClient.post(`/play/rooms/${id}/leave`, {})
}

export function getRoom(id) {
  return httpClient.get(`/play/rooms/${id}`)
}

export function getGameMoves(gameId) {
  return httpClient.get(`/games/${gameId}/moves`)
}

export function makeRoomMove(
  id,
  {
    from,
    to,
    promotion,
    san,
    fen,
    boardType,
    variant,
    gameOver,
    result,
    gameOverReason,
    state,
    clientState,
  },
) {
  const body = { from, to }
  if (promotion) body.promotion = promotion
  if (san) body.san = san
  if (fen) body.fen = fen
  if (boardType) body.boardType = boardType
  if (variant) body.variant = variant
  if (gameOver !== undefined) body.gameOver = gameOver
  if (result) body.result = result
  if (gameOverReason) body.gameOverReason = gameOverReason
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
