import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/app/HomePage'
import PacientesPage from './pages/app/PacientesPage'
import PacienteDetalhePage from './pages/app/PacienteDetalhePage'
import PacienteAnotacoesPage from './pages/app/PacienteAnotacoesPage'
import AlimentacaoPage from './pages/app/AlimentacaoPage'
import AlimentosPage from './pages/app/AlimentosPage'
import ReceitasPage from './pages/app/ReceitasPage'
import RelatoriosPage from './pages/app/RelatoriosPage'
import RelatorioPacientePage from './pages/app/RelatorioPacientePage'
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
const SaudeLegada: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>()
  return <Navigate to={`/acompanhamento/${pacienteId}/saude`} replace />
}

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
          <Route path="/redefinir-senha" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

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
            {/* A ficha do paciente e uma tela inteira, nao um popup: cada secao
                (informacoes / glicemia / alimentacao / saude) tem a sua URL. */}
            <Route path="pacientes/:pacienteId" element={<PacienteDetalhePage />} />
            <Route path="pacientes/:pacienteId/anotacoes" element={<PacienteAnotacoesPage />} />
            <Route path="pacientes/:pacienteId/:secao" element={<PacienteDetalhePage />} />
            <Route path="acompanhamento" element={<PacientesPage />} />
            <Route path="acompanhamento/:pacienteId" element={<PacienteDetalhePage />} />
            <Route path="acompanhamento/:pacienteId/anotacoes" element={<PacienteAnotacoesPage />} />
            <Route path="acompanhamento/:pacienteId/:secao" element={<PacienteDetalhePage />} />
            <Route path="registros" element={<Navigate to="/acompanhamento" replace />} />
            <Route path="alimentacao" element={<AlimentacaoPage />} />
            <Route path="alimentos" element={<AlimentosPage />} />
            <Route path="receitas" element={<ReceitasPage />} />
            <Route path="saude" element={<Navigate to="/acompanhamento" replace />} />
            <Route path="saude/:pacienteId" element={<SaudeLegada />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="relatorios/:pacienteId" element={<RelatorioPacientePage />} />
            <Route path="mensagens" element={<MensagensPage />} />
            <Route path="mensagens/:contraparteId" element={<MensagensPage />} />
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
