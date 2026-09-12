import { httpClient } from '../services/request'

/**
 * Auth API layer matching backend-README.md and OpenAPI specification
 */

/**
 * Register a new guest user
 * @param {{ username: string, email: string, password: string }} data
 * @returns {Promise<{ message: string, user: { id: string, username: string, role: string } }>}
 */
export async function registerApi({ username, email, password }) {
  return httpClient.post('/auth/register', {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
  }, { skipAuth: true })
}

/**
 * Log in an existing verified user
 * @param {{ username: string, password: string }} data
 * @returns {Promise<{ user: { id: string, username: string, role: string }, accessToken: string, refreshToken: string }>}
 */
export async function loginApi({ username, password }) {
  return httpClient.post('/auth/login', {
    username: username.trim(),
    password,
  }, { skipAuth: true })
}

/**
 * Verify user email address with one-time verification token
 * @param {{ token: string }} param0
 * @returns {Promise<{ message: string }>}
 */
export async function verifyEmailApi({ token }) {
  return httpClient.post('/auth/verify-email', {
    token: token.trim(),
  }, { skipAuth: true })
}

/**
 * Verify email using GET request (link clicked from email)
 * @param {string} token
 * @returns {Promise<{ message: string }>}
 */
export async function verifyEmailGetApi(token) {
  return httpClient.get(`/auth/verify-email?token=${encodeURIComponent(token.trim())}`, {
    skipAuth: true,
  })
}

/**
 * Resend verification email
 * @param {{ email: string }} param0
 * @returns {Promise<{ message: string }>}
 */
export async function resendVerificationApi({ email }) {
  return httpClient.post('/auth/resend-verification', {
    email: email.trim().toLowerCase(),
  }, { skipAuth: true })
}

/**
 * Get current authenticated user session details
 * @returns {Promise<{ user: { id: string, username: string, role: string } }>}
 */
export async function getAuthMeApi() {
  return httpClient.get('/auth/me')
}

/**
 * Get own full profile with stats & email verification status
 * @returns {Promise<{ user: { id: string, username: string, email: string, role: string, emailVerifiedAt: string|null, createdAt: string, stats?: object } }>}
 */
export async function getUserProfileApi() {
  return httpClient.get('/users/me')
}

/**
 * Rotate current session tokens
 * @param {{ refreshToken: string }} param0
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export async function refreshSessionApi({ refreshToken }) {
  return httpClient.post('/auth/refresh', { refreshToken }, { skipAuth: true })
}

/**
 * Revoke refresh token and log out on backend
 * @param {{ refreshToken: string }} param0
 * @returns {Promise<{ message: string }>}
 */
export async function logoutApi({ refreshToken }) {
  return httpClient.post('/auth/logout', { refreshToken })
}

