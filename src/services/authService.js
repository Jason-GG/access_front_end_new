import * as authApi from '../api/authApi'
import { STORAGE_KEYS } from '../utils/constants'
import { handleFromEmail, normalizeUserRole } from '../utils/helpers'
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
    const role = payload.role ? normalizeUserRole(payload.role) : undefined
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

const GUEST_SCORE_STORAGE_KEY = 'achess_guest_score'
export const DEFAULT_USER_SCORE = 500
export const WIN_SCORE_DELTA = 5
export const LOSS_SCORE_DELTA = 5

export function getGuestScore() {
  try {
    const raw = localStorage.getItem(GUEST_SCORE_STORAGE_KEY)
    if (raw === null || raw === '') return DEFAULT_USER_SCORE
    const num = Number(raw)
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : DEFAULT_USER_SCORE
  } catch {
    return DEFAULT_USER_SCORE
  }
}

export function setGuestScore(score) {
  const clamped = Math.max(0, Math.floor(Number(score) || 0))
  try {
    localStorage.setItem(GUEST_SCORE_STORAGE_KEY, String(clamped))
  } catch {
    // ignore storage errors
  }
  return clamped
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

  const rawScore =
    unwrapped?.score ??
    mergedSource.score ??
    extra?.score ??
    DEFAULT_USER_SCORE
  const parsedScore = Number(rawScore)
  const score =
    Number.isFinite(parsedScore) && parsedScore >= 0
      ? Math.floor(parsedScore)
      : DEFAULT_USER_SCORE

  const resolvedRole = normalizeUserRole(
    unwrapped?.role ?? mergedSource.role ?? extra?.role ?? jwtUser.role,
  )

  return {
    ...mergedSource,
    ...(id ? { id } : {}),
    email,
    username,
    role: resolvedRole,
    handle: username || (email ? handleFromEmail(email) : 'Player'),
    score,
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

export function updateStoredUserScore(newScore) {
  const clamped = Math.max(0, Math.floor(Number(newScore) || 0))
  const current = readSession()
  if (current) {
    const updated = { ...current, score: clamped }
    writeSession(updated)
    return updated
  }
  setGuestScore(clamped)
  return null
}

export function adjustStoredUserScore(delta) {
  const d = Number(delta) || 0
  const current = readSession()
  if (current) {
    const base = typeof current.score === 'number' ? current.score : DEFAULT_USER_SCORE
    const nextScore = Math.max(0, base + d)
    const updated = { ...current, score: nextScore }
    writeSession(updated)
    return { user: updated, score: nextScore, previousScore: base, delta: nextScore - base }
  }
  const baseGuest = getGuestScore()
  const nextGuest = setGuestScore(Math.max(0, baseGuest + d))
  return { user: null, score: nextGuest, previousScore: baseGuest, delta: nextGuest - baseGuest }
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
 * Fetch full user profile including recent games and dashboard stats
 */
export async function fetchFullProfile() {
  return authApi.getFullProfileApi()
}

/**
 * Update own profile (username, email, password) and refresh stored session
 */
export async function updateProfile(payload) {
  const response = await authApi.updateUserProfileApi(payload)
  if (response?.accessToken) {
    storeTokens(response.accessToken)
  }
  const existingSession = readRawSession() || {}
  const updatedUser = normalizeUser(response?.user || response, existingSession)
  if (updatedUser) {
    writeSession(updatedUser)
  }
  return {
    message: response?.message || 'Profile updated successfully.',
    user: updatedUser,
  }
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
