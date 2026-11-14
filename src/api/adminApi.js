import { httpClient } from '../services/request'

/**
 * List users (admin only)
 * @param {{ limit?: number, cursor?: string, search?: string, role?: 'user' | 'admin' }} params
 */
export async function listAdminUsersApi({ limit = 100, cursor, search, role } = {}) {
  const query = new URLSearchParams()
  if (limit) query.set('limit', String(limit))
  if (cursor) query.set('cursor', String(cursor))
  if (search && search.trim()) query.set('search', search.trim())
  if (role === 'admin' || role === 'user') query.set('role', role)
  const qs = query.toString()
  return httpClient.get(`/users${qs ? `?${qs}` : ''}`)
}

/**
 * Update a user's role ('user' | 'admin') (admin only)
 * @param {string} userId
 * @param {'user' | 'admin'} role
 */
export async function updateAdminUserRoleApi(userId, role) {
  return httpClient.patch(`/users/${encodeURIComponent(userId)}/role`, { role })
}

/**
 * Delete a non-admin user account by id (admin only)
 * @param {string} userId
 */
export async function deleteAdminUserApi(userId) {
  return httpClient.del(`/users/${encodeURIComponent(userId)}`)
}
