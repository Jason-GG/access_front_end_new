import { STORAGE_KEYS } from '../utils/constants'

const DEFAULT_API_BASE = import.meta.env.DEV ? '/api' : 'https://achess.wguan.dpdns.org'
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
    return 'wss://achess.wguan.dpdns.org'
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

export function clearStoredTokens() {
  try {
    localStorage.removeItem(STORAGE_KEYS.accessToken)
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    localStorage.removeItem(STORAGE_KEYS.session)
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

  // Handle 401 Token Refresh
  if (response.status === 401 && retryOnAuthFailure && !cleanEndpoint.startsWith('/auth/')) {
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
              localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session.user))
            }
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

