import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import { limparSessao } from '../lib/api'

interface User {
  id?: string
  nome: string
  email: string
  role: 'nutricionista' | 'administrador'
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('@NutriCare:user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  const login = useCallback((userData: User, accessToken: string, refreshToken: string) => {
    setUser(userData)
    localStorage.setItem('@NutriCare:user', JSON.stringify(userData))
    localStorage.setItem('@NutriCare:accessToken', accessToken)
    localStorage.setItem('@NutriCare:refreshToken', refreshToken)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    limparSessao()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
