import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'

import { authApi, type LoginPayload, type RegisterPayload } from '@/api/auth'
import { setUnauthorizedHandler, tokenStore } from '@/api/client'
import type { User } from '@/types/api'

interface AuthContextValue {
  user: User | null
  status: 'loading' | 'authenticated' | 'anonymous'
  login: (payload: LoginPayload) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [status, setStatus] = React.useState<AuthContextValue['status']>('loading')
  const queryClient = useQueryClient()

  React.useEffect(() => {
    let active = true

    if (!tokenStore.access()) {
      setStatus('anonymous')
      return
    }

    authApi
      .me()
      .then((profile) => {
        if (!active) return
        setUser(profile)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        tokenStore.clear()
        setStatus('anonymous')
      })

    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear()
      setUser(null)
      setStatus('anonymous')
      queryClient.clear()
    })
  }, [queryClient])

  const login = React.useCallback(async (payload: LoginPayload) => {
    const response = await authApi.login(payload)
    setUser(response.user)
    setStatus('authenticated')
    return response.user
  }, [])

  const register = React.useCallback(async (payload: RegisterPayload) => {
    const response = await authApi.register(payload)
    setUser(response.user)
    setStatus('authenticated')
    return response.user
  }, [])

  const logout = React.useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  const value = React.useMemo(
    () => ({ user, status, login, register, logout, setUser }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
