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

export function listRooms({ status = 'waiting', limit = 20, cursor } = {}) {
  return httpClient.get(withQuery('/play/rooms', { status, limit, cursor }))
}

export function createRoom(payload) {
  const body =
    typeof payload === 'string'
      ? { gameId: payload }
      : payload?.gameId
        ? { gameId: payload.gameId }
        : {}
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

export function makeRoomMove(id, { from, to, promotion }) {
  const body = { from, to }
  if (promotion) body.promotion = promotion
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

export function listComments(id, { cursor, limit = 50 } = {}) {
  return httpClient.get(withQuery(`/play/rooms/${id}/comments`, { cursor, limit }))
}

export function postComment(id, body) {
  return httpClient.post(`/play/rooms/${id}/comments`, { body })
}
