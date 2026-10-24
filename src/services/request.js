import { STORAGE_KEYS } from '../utils/constants'

export const AUTH_SESSION_EVENT = 'achess:session-updated'

function notifySessionUpdated() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT))
    } catch {
      // ignore event dispatch errors
    }
  }
}

const DEV_HOST = 'https://achess-dev.wguan.dpdns.org'
const PROD_HOST = 'http://139.159.186.80:3000'

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production'
const defaultRemoteHost = isProd ? PROD_HOST : DEV_HOST

// In development, default to '/api' to leverage the Vite dev proxy (avoiding CORS issues).
// In production (or if VITE_API_BASE_URL is explicitly set), uses the resolved host.
const DEFAULT_API_BASE = import.meta.env.DEV ? '/api' : defaultRemoteHost
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE

export function getWebSocketBaseUrl() {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL.replace(/\/+$/, '')
  }
  const base = API_BASE_URL.replace(/\/+$/, '')
  if (/^https?:\/\//i.test(base)) {
    return base.replace(/^http/i, 'ws')
  }
  if (import.meta.env.DEV) {
    return isProd ? 'ws://139.159.186.80:3000' : 'wss://achess-dev.wguan.dpdns.org'
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${base}`
}

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.isEmailNotVerified =
      status === 403 &&
      (Boolean(data?.error && /email.*verified/i.test(data.error)) ||
        /email.*verified/i.test(message))
  }
}

let isRefreshing = false
let refreshSubscribers = []

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

export function getStoredAccessToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.accessToken) || null
  } catch {
    return null
  }
}

export function getStoredRefreshToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.refreshToken) || null
  } catch {
    return null
  }
}

export function storeTokens(accessToken, refreshToken) {
  try {
    if (accessToken) localStorage.setItem(STORAGE_KEYS.accessToken, accessToken)
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken)
  } catch {
    // ignore storage quota errors
  }
}

export function clearStoredChessStates() {
  try {
    localStorage.removeItem(STORAGE_KEYS.foxPracticeState)
    localStorage.removeItem(STORAGE_KEYS.chessPracticeState)
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (k && k.startsWith(STORAGE_KEYS.roomStatePrefix)) {
        keysToRemove.push(k)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

function hasStoredSessionOrPracticeKey(key) {
  if (!key) return false
  if (key === STORAGE_KEYS.foxPracticeState || key === STORAGE_KEYS.chessPracticeState) {
    return true
  }
  try {
    return Boolean(
      getStoredAccessToken() ||
        getStoredRefreshToken() ||
        localStorage.getItem(STORAGE_KEYS.session),
    )
  } catch {
    return false
  }
}

export function loadTokenScopedState(key) {
  if (!hasStoredSessionOrPracticeKey(key)) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveTokenScopedState(key, value) {
  if (!hasStoredSessionOrPracticeKey(key)) return
  try {
    if (value == null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // ignore storage quota errors
  }
}

export function clearStoredTokens() {
  try {
    localStorage.removeItem(STORAGE_KEYS.accessToken)
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    localStorage.removeItem(STORAGE_KEYS.session)
    clearStoredChessStates()
    notifySessionUpdated()
  } catch {
    // ignore
  }
}

/**
 * Core HTTP request handler
 */
export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    token: customToken,
    skipAuth = false,
    retryOnAuthFailure = true,
    ...customConfig
  } = options

  const resolvedHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  if (body && !(body instanceof FormData) && !resolvedHeaders['Content-Type']) {
    resolvedHeaders['Content-Type'] = 'application/json'
  }

  if (!skipAuth) {
    const token = customToken || getStoredAccessToken()
    if (token) {
      resolvedHeaders.Authorization = `Bearer ${token}`
    }
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const base = API_BASE_URL.replace(/\/+$/, '')
  const url = `${base}${cleanEndpoint}`

  const fetchConfig = {
    method,
    headers: resolvedHeaders,
    body: body && typeof body === 'object' && !(body instanceof FormData) ? JSON.stringify(body) : body,
    ...customConfig,
  }

  let response
  try {
    response = await fetch(url, fetchConfig)
  } catch (networkError) {
    throw new ApiError(
      networkError.message || 'Network connection failed. Please check your internet or backend status.',
      0,
    )
  }

  // Handle 401 Token Refresh (include /auth/me, exclude unauthenticated auth endpoints)
  const canRefreshEndpoint =
    !skipAuth &&
    cleanEndpoint !== '/auth/refresh' &&
    cleanEndpoint !== '/auth/login' &&
    cleanEndpoint !== '/auth/register' &&
    cleanEndpoint !== '/auth/verify-email' &&
    cleanEndpoint !== '/auth/resend-verification'

  if (response.status === 401 && retryOnAuthFailure && canRefreshEndpoint) {
    const refreshToken = getStoredRefreshToken()
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshRes = await fetch(`${base}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })

          if (refreshRes.ok) {
            const session = await refreshRes.json()
            storeTokens(session.accessToken, session.refreshToken)
            if (session.user) {
              let existingUser = null
              try {
                const rawExisting = localStorage.getItem(STORAGE_KEYS.session)
                existingUser = rawExisting ? JSON.parse(rawExisting) : null
              } catch {
                existingUser = null
              }
              const mergedUser = {
                ...(existingUser || {}),
                ...session.user,
              }
              const resolvedUsername =
                mergedUser.username ||
                mergedUser.handle ||
                (mergedUser.email ? String(mergedUser.email).split('@')[0] : '') ||
                ''
              mergedUser.username = resolvedUsername
              mergedUser.handle = resolvedUsername || 'Player'
              localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(mergedUser))
            }
            notifySessionUpdated()
            onRefreshed(session.accessToken)
            isRefreshing = false
          } else {
            clearStoredTokens()
            isRefreshing = false
            onRefreshed(null)
          }
        } catch {
          clearStoredTokens()
          isRefreshing = false
          onRefreshed(null)
        }
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            resolve(
              request(endpoint, {
                ...options,
                token: newToken,
                retryOnAuthFailure: false,
              }),
            )
          } else {
            reject(new ApiError('Session expired. Please sign in again.', 401))
          }
        })
      })
    }
  }

  let data = null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  } else {
    try {
      data = await response.text()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const errorMessage =
      (typeof data === 'object' && data !== null && (data.error || data.message)) ||
      `Request failed with status ${response.status}`
    throw new ApiError(errorMessage, response.status, data)
  }

  return data
}

export const httpClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  del: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
}

