import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { apiRequest } from '../services/api'
import type { AuthUser, Role } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (identity: string, password: string, roleHint?: Role) => Promise<AuthUser>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AUTH_TOKEN_KEY = 'vidyavault_token'
const UI_ONLY_ROLE_KEY = 'vidyavault_ui_only_role'
const UI_ONLY_MODE = import.meta.env.DEV && import.meta.env.VITE_UI_ONLY === 'true'

const inferRoleFromPath = (): Role | null => {
  const pathname = window.location.pathname
  if (pathname.startsWith('/teacher')) {
    return 'teacher_admin'
  }
  if (pathname.startsWith('/student')) {
    return 'student'
  }
  if (pathname.startsWith('/superadmin')) {
    return 'superadmin'
  }
  return null
}

const isRole = (value: string | null): value is Role =>
  value === 'superadmin' || value === 'teacher_admin' || value === 'student'

const getUiOnlyRole = (): Role => {
  const fromPath = inferRoleFromPath()
  if (fromPath) {
    return fromPath
  }

  const storedRole = localStorage.getItem(UI_ONLY_ROLE_KEY)
  if (isRole(storedRole)) {
    return storedRole
  }

  return 'superadmin'
}

const createUiOnlyUser = (role: Role, identity?: string): AuthUser => ({
  id: `ui-${role}`,
  email: identity?.includes('@') ? identity : null,
  username: identity && !identity.includes('@') ? identity : `ui_${role}`,
  role,
  teacherId: role === 'teacher_admin' ? 'ui-teacher-1' : undefined,
  studentId: role === 'student' ? 'ui-student-1' : undefined,
  forcePasswordChange: false,
})

export const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() =>
    UI_ONLY_MODE ? createUiOnlyUser(getUiOnlyRole()) : null,
  )
  const [loading, setLoading] = useState(!UI_ONLY_MODE)

  const refreshMe = useCallback(async (): Promise<void> => {
    if (UI_ONLY_MODE) {
      const role = getUiOnlyRole()
      setUser(createUiOnlyUser(role))
      setLoading(false)
      return
    }

    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const data = await apiRequest<{ user: AuthUser }>('/auth/me', {
        method: 'GET',
        token,
      })
      setUser(data.user)
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const login = useCallback(async (identity: string, password: string, roleHint?: Role): Promise<AuthUser> => {
    if (UI_ONLY_MODE) {
      void password
      const role = roleHint ?? getUiOnlyRole()
      localStorage.setItem(UI_ONLY_ROLE_KEY, role)
      const uiUser = createUiOnlyUser(role, identity || undefined)
      setUser(uiUser)
      setLoading(false)
      return uiUser
    }

    const data = await apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identity, password }),
    })

    localStorage.setItem(AUTH_TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
    setUser(null)
    if (UI_ONLY_MODE) {
      localStorage.removeItem(UI_ONLY_ROLE_KEY)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshMe,
    }),
    [user, token, loading, login, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
