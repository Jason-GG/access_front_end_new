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

export function listRooms({ status = 'waiting', limit = 20, cursor, boardType } = {}) {
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
