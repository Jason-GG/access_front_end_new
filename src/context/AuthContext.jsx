import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser())
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
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const loggedIn = await authService.login({ username, password })
    setUser(loggedIn)
    return loggedIn
  }, [])

  const signup = useCallback(async (data) => {
    // data can be { username, email, password }
    const result = await authService.signup(data)
    return result
  }, [])

  const verifyEmail = useCallback(async (token) => {
    return authService.verifyEmail(token)
  }, [])

  const resendVerification = useCallback(async (email) => {
    return authService.resendVerification(email)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      verifyEmail,
      resendVerification,
      logout,
    }),
    [user, loading, login, signup, verifyEmail, resendVerification, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
