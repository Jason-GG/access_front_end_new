import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(authService.getCurrentUser())
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const loggedIn = await authService.login({ email, password })
    setUser(loggedIn)
    return loggedIn
  }, [])

  const signup = useCallback(async (email, password) => {
    const created = await authService.signup({ email, password })
    setUser(created)
    return created
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
