import * as authApi from '../api/authApi'
import { STORAGE_KEYS } from '../utils/constants'
import { handleFromEmail } from '../utils/helpers'
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens,
} from './request'

function normalizeUser(rawUser, extra = {}) {
  if (!rawUser) return null
  const username = rawUser.username || ''
  const email = rawUser.email || extra.email || ''
  return {
    ...rawUser,
    email,
    username,
    handle: username || (email ? handleFromEmail(email) : 'Player'),
  }
}

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user))
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
  if (!token) {
    writeSession(null)
    return null
  }

  try {
    // Try /users/me first to get email and stats
    const response = await authApi.getUserProfileApi()
    const user = normalizeUser(response.user)
    writeSession(user)
    return user
  } catch {
    try {
      // Fallback to /auth/me
      const meResponse = await authApi.getAuthMeApi()
      const user = normalizeUser(meResponse.user, readSession() || {})
      writeSession(user)
      return user
    } catch {
      // Token is invalid/expired and couldn't be refreshed
      clearStoredTokens()
      writeSession(null)
      return null
    }
  }
}

/**
 * Register a guest user. Queues verification email on the backend.
 * Note: Does not log in or issue a token until email is verified.
 */
export async function signup({ username, email, password }) {
  const response = await authApi.registerApi({ username, email, password })
  return {
    message: response.message || 'Registration successful. Please verify your email.',
    user: normalizeUser(response.user, { email }),
  }
}

/**
 * Log in with username and password. Issues JWT access & refresh tokens.
 */
export async function login({ username, password }) {
  const session = await authApi.loginApi({ username, password })
  storeTokens(session.accessToken, session.refreshToken)

  let fullUser = normalizeUser(session.user)
  try {
    // Enrich with email & stats from profile if available
    const profile = await authApi.getUserProfileApi()
    if (profile?.user) {
      fullUser = normalizeUser(profile.user)
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
