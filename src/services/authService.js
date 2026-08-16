import { STORAGE_KEYS } from '../utils/constants'
import { handleFromEmail } from '../utils/helpers'
import { fakeReject, fakeRequest } from './api'

// Mock auth backed by localStorage so the app is fully usable today.
// TODO(backend): replace with real JWT/Firebase auth — never store plain
// passwords client-side in production.

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || []
  } catch {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.session)) || null
  } catch {
    return null
  }
}

function writeSession(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEYS.session)
  }
}

export function getCurrentUser() {
  return readSession()
}

export async function signup({ email, password }) {
  const normalized = email.trim().toLowerCase()
  const users = readUsers()
  if (users.some((user) => user.email === normalized)) {
    return fakeReject('An account with this email already exists.')
  }

  const user = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    email: normalized,
    handle: handleFromEmail(normalized),
    createdAt: new Date().toISOString(),
  }

  writeUsers([...users, { ...user, password }])
  writeSession(user)
  return fakeRequest(user)
}

export async function login({ email, password }) {
  const normalized = email.trim().toLowerCase()
  const record = readUsers().find(
    (user) => user.email === normalized && user.password === password,
  )
  if (!record) {
    return fakeReject('Incorrect email or password.')
  }

  const { password: _password, ...safeUser } = record
  writeSession(safeUser)
  return fakeRequest(safeUser)
}

export function logout() {
  writeSession(null)
}
