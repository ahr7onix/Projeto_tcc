import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/app/HomePage'
import PacientesPage from './pages/app/PacientesPage'
import RegistrosPage from './pages/app/RegistrosPage'
import AlimentacaoPage from './pages/app/AlimentacaoPage'
import SaudePage from './pages/app/SaudePage'
import RelatoriosPage from './pages/app/RelatoriosPage'
import MensagensPage from './pages/app/MensagensPage'
import ConteudosPage from './pages/app/ConteudosPage'
import AdminPage from './pages/app/AdminPage'
import PerfilPage from './pages/app/PerfilPage'

// Cada perfil tem uma tela inicial propria: o administrador nao usa a tela
// inicial do nutricionista, cujas rotas dependem de pacientes vinculados e
// respondem 403 para ele.
function useRotaInicial() {
  const { user } = useAuth()
  return user?.role === 'administrador' ? '/admin' : '/inicio'
}

const InicioPorPerfil: React.FC = () => <Navigate to={useRotaInicial()} replace />

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Carregando...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const rotaInicial = useRotaInicial()
  if (loading) return null
  if (isAuthenticated) return <Navigate to={rotaInicial} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/cadastro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/esqueci-senha" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          {}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<InicioPorPerfil />} />
            {/* A tela inicial se chamava "dashboard", mas o Render devolve 404
                para esse caminho antes de chegar no site, entao quem atualizasse
                a pagina caia num erro. O redirecionamento cobre links antigos
                dentro do proprio painel. */}
            <Route path="inicio" element={<HomePage />} />
            <Route path="dashboard" element={<Navigate to="/inicio" replace />} />
            <Route path="pacientes" element={<PacientesPage />} />
            <Route path="registros" element={<RegistrosPage />} />
            <Route path="alimentacao" element={<AlimentacaoPage />} />
            <Route path="saude" element={<SaudePage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="mensagens" element={<MensagensPage />} />
            <Route path="conteudos" element={<ConteudosPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="perfil" element={<PerfilPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
