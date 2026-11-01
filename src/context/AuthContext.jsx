import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'
import { AUTH_SESSION_EVENT } from '../services/request'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser())
  const [guestScore, setGuestScoreState] = useState(() => authService.getGuestScore())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function initSession() {
      try {
        const verifiedUser = await authService.fetchCurrentUser()
        if (active) {
          setUser(verifiedUser)
        }
      } catch {
        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    initSession()

    function syncSessionFromStorage() {
      if (!active) return
      setUser(authService.getCurrentUser())
      setGuestScoreState(authService.getGuestScore())
    }

    window.addEventListener(AUTH_SESSION_EVENT, syncSessionFromStorage)
    window.addEventListener('storage', syncSessionFromStorage)
    return () => {
      active = false
      window.removeEventListener(AUTH_SESSION_EVENT, syncSessionFromStorage)
      window.removeEventListener('storage', syncSessionFromStorage)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const refreshed = await authService.fetchCurrentUser()
      if (refreshed) {
        setUser(refreshed)
      }
      return refreshed
    } catch {
      return null
    }
  }, [])

  const applyScoreChange = useCallback((deltaOrOptions) => {
    if (typeof deltaOrOptions === 'object' && deltaOrOptions !== null && typeof deltaOrOptions.newScore === 'number') {
      const updated = authService.updateStoredUserScore(deltaOrOptions.newScore)
      if (updated) {
        setUser(updated)
        return updated.score
      }
      const clamped = authService.setGuestScore(deltaOrOptions.newScore)
      setGuestScoreState(clamped)
      return clamped
    }
    const delta = typeof deltaOrOptions === 'number' ? deltaOrOptions : Number(deltaOrOptions?.delta || 0)
    const res = authService.adjustStoredUserScore(delta)
    if (res.user) {
      setUser(res.user)
    } else {
      setGuestScoreState(res.score)
    }
    return res.score
  }, [])

  const login = useCallback(async (username, password) => {
    const loggedIn = await authService.login({ username, password })
    setUser(loggedIn)
    return loggedIn
  }, [])

  const signup = useCallback(async (data) => {
    // data is { username, email, password, code }
    const result = await authService.signup(data)
    if (result.authenticated && result.user) {
      setUser(result.user)
    }
    return result
  }, [])

  const sendVerificationCode = useCallback(async (email) => {
    return authService.sendVerificationCode(email)
  }, [])

  const verifyEmail = useCallback(async (token) => {
    return authService.verifyEmail(token)
  }, [])

  const resendVerification = useCallback(async (email) => {
    return authService.resendVerification(email)
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const result = await authService.updateProfile(payload)
    if (result?.user) {
      setUser(result.user)
    }
    return result
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const score =
    user && typeof user.score === 'number'
      ? user.score
      : user
        ? authService.DEFAULT_USER_SCORE
        : guestScore

  const value = useMemo(
    () => ({
      user,
      score,
      loading,
      login,
      signup,
      sendVerificationCode,
      verifyEmail,
      resendVerification,
      updateProfile,
      logout,
      refreshUser,
      applyScoreChange,
    }),
    [
      user,
      score,
      loading,
      login,
      signup,
      sendVerificationCode,
      verifyEmail,
      resendVerification,
      updateProfile,
      logout,
      refreshUser,
      applyScoreChange,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
