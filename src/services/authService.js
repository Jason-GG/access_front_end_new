import * as authApi from '../api/authApi'
import { STORAGE_KEYS } from '../utils/constants'
import { handleFromEmail } from '../utils/helpers'
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens,
} from './request'

function decodeUserFromJwt(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json)
    if (!payload || typeof payload !== 'object') return null
    const id = payload.id || payload.sub || payload.userId || null
    const username = payload.username || payload.preferred_username || payload.name || ''
    const email = payload.email || ''
    const role = payload.role || undefined
    if (!id && !username && !email) return null
    return {
      ...(id ? { id } : {}),
      ...(username ? { username } : {}),
      ...(email ? { email } : {}),
      ...(role ? { role } : {}),
    }
  } catch {
    return null
  }
}

function normalizeUser(rawUser, extra = {}) {
  const unwrapped =
    rawUser && typeof rawUser === 'object' && rawUser.user && typeof rawUser.user === 'object'
      ? rawUser.user
      : rawUser
  const jwtUser = decodeUserFromJwt(getStoredAccessToken()) || {}
  const mergedSource = {
    ...jwtUser,
    ...(extra || {}),
    ...(unwrapped || {}),
  }

  const email = mergedSource.email || extra?.email || jwtUser.email || ''
  const username =
    mergedSource.username ||
    extra?.username ||
    jwtUser.username ||
    mergedSource.handle ||
    extra?.handle ||
    (email ? handleFromEmail(email) : '') ||
    ''
  const id = mergedSource.id || mergedSource.userId || extra?.id || jwtUser.id || undefined

  if (!id && !username && !email) return null

  return {
    ...mergedSource,
    ...(id ? { id } : {}),
    email,
    username,
    handle: username || (email ? handleFromEmail(email) : 'Player'),
  }
}

function readRawSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function readSession() {
  const stored = readRawSession()
  const token = getStoredAccessToken()
  if (!stored && !token) return null
  return normalizeUser(stored)
}

function writeSession(user) {
  try {
    if (user) {
      const normalized = normalizeUser(user, readRawSession() || {})
      if (normalized) {
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(normalized))
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.session)
    }
  } catch {
    // ignore
  }
}

export function getCurrentUser() {
  return readSession()
}

/**
 * Validates current session against backend /users/me or /auth/me
 */
export async function fetchCurrentUser() {
  const token = getStoredAccessToken()
  const refreshToken = getStoredRefreshToken()
  if (!token && !refreshToken) {
    writeSession(null)
    return null
  }

  const existingSession = readRawSession() || {}

  try {
    // Try /users/me first to get email and stats
    const response = await authApi.getUserProfileApi()
    const user = normalizeUser(response?.user || response, existingSession)
    if (user) {
      writeSession(user)
      return user
    }
  } catch {
    // Fall through to /auth/me
  }

  try {
    // Fallback to /auth/me
    const meResponse = await authApi.getAuthMeApi()
    const user = normalizeUser(meResponse?.user || meResponse, readRawSession() || existingSession)
    if (user) {
      writeSession(user)
      return user
    }
    return readSession()
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      // Token is invalid/expired and couldn't be refreshed
      clearStoredTokens()
      writeSession(null)
      return null
    }
    // On transient network errors, preserve existing session if token is still present
    return getStoredAccessToken() ? readSession() : null
  }
}

/**
 * Send verification code to email for registration.
 */
export async function sendVerificationCode(email) {
  return authApi.sendVerificationCodeApi({ email })
}

/**
 * Register a guest user with an email verification code.
 * Stores session tokens if returned by the backend.
 */
export async function signup({ username, email, password, code }) {
  const response = await authApi.registerApi({ username, email, password, code })
  let fullUser = normalizeUser(response.user, { username, email })

  if (response.accessToken && response.refreshToken) {
    storeTokens(response.accessToken, response.refreshToken)
    fullUser = normalizeUser(response.user, { username, email })
    writeSession(fullUser)
  }

  return {
    message: response.message || 'Registration successful.',
    user: fullUser,
    authenticated: Boolean(response.accessToken),
  }
}

/**
 * Log in with username and password. Issues JWT access & refresh tokens.
 */
export async function login({ username, password }) {
  const session = await authApi.loginApi({ username, password })
  storeTokens(session.accessToken, session.refreshToken)

  let fullUser = normalizeUser(session.user, { username })
  try {
    // Enrich with email & stats from profile if available
    const profile = await authApi.getUserProfileApi()
    if (profile?.user || profile?.username) {
      fullUser = normalizeUser(profile.user || profile, fullUser || { username })
    }
  } catch {
    // ignore profile enrichment failure, session user is sufficient
  }

  writeSession(fullUser)
  return fullUser
}

/**
 * Verify email address with one-time verification token
 */
export async function verifyEmail(token) {
  return authApi.verifyEmailApi({ token })
}

/**
 * Resend verification email
 */
export async function resendVerification(email) {
  return authApi.resendVerificationApi({ email })
}

/**
 * Revoke backend session and remove local credentials
 */
export async function logout() {
  const refreshToken = getStoredRefreshToken()
  if (refreshToken) {
    try {
      await authApi.logoutApi({ refreshToken })
    } catch {
      // ignore network/auth errors during logout
    }
  }
  clearStoredTokens()
  writeSession(null)
}
