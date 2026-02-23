import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const STORAGE_ACCESS = 'motify_access'
const STORAGE_REFRESH = 'motify_refresh'
const STORAGE_USER = 'motify_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const persistAuth = useCallback((accessToken, refreshToken, userData) => {
    localStorage.setItem(STORAGE_ACCESS, accessToken)
    localStorage.setItem(STORAGE_REFRESH, refreshToken)
    localStorage.setItem(STORAGE_USER, JSON.stringify(userData))
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_ACCESS)
    localStorage.removeItem(STORAGE_REFRESH)
    localStorage.removeItem(STORAGE_USER)
    setUser(null)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    persistAuth(data.accessToken, data.refreshToken, data.user)
    setUser(data.user)
  }, [persistAuth])

  const register = useCallback(async (email, password) => {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    persistAuth(data.accessToken, data.refreshToken, data.user)
    setUser(data.user)
  }, [persistAuth])

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const getAccessToken = useCallback(() => localStorage.getItem(STORAGE_ACCESS), [])

  useEffect(() => {
    const access = localStorage.getItem(STORAGE_ACCESS)
    const stored = localStorage.getItem(STORAGE_USER)
    if (!access || !stored) {
      setLoading(false)
      return
    }

    const verify = async () => {
      try {
        const res = await fetch('/auth/me', {
          headers: { Authorization: `Bearer ${access}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          return
        }
        const refresh = localStorage.getItem(STORAGE_REFRESH)
        if (!refresh) {
          clearAuth()
          return
        }
        const refreshRes = await fetch('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        })
        const refreshData = await refreshRes.json()
        if (!refreshRes.ok) {
          clearAuth()
          return
        }
        persistAuth(refreshData.accessToken, refreshData.refreshToken, JSON.parse(stored))
        setUser(JSON.parse(stored))
      } catch {
        clearAuth()
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [clearAuth, persistAuth])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
