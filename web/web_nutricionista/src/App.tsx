import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

// App pages (nutricionista)
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/app/HomePage'
import PacientesPage from './pages/app/PacientesPage'
import RegistrosPage from './pages/app/RegistrosPage'
import AlimentacaoPage from './pages/app/AlimentacaoPage'
import SaudePage from './pages/app/SaudePage'
import PerfilPage from './pages/app/PerfilPage'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Carregando...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/cadastro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/esqueci-senha" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          {/* Protected - Nutricionista */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<HomePage />} />
            <Route path="pacientes" element={<PacientesPage />} />
            <Route path="registros" element={<RegistrosPage />} />
            <Route path="alimentacao" element={<AlimentacaoPage />} />
            <Route path="saude" element={<SaudePage />} />
            <Route path="perfil" element={<PerfilPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
