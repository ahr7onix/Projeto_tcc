import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import s from './AppLayout.module.css'

const NAV_NUTRICIONISTA = [
  { to: '/dashboard',   label: 'Início',      icon: HomeIcon },
  { to: '/pacientes',   label: 'Pacientes',   icon: PatientsIcon },
  { to: '/registros',   label: 'Registros',   icon: RegistrosIcon },
  { to: '/alimentacao', label: 'Alimentação', icon: AlimentacaoIcon },
  { to: '/saude',       label: 'Saúde',       icon: SaudeIcon },
  { to: '/relatorios',  label: 'Relatórios',  icon: RelatoriosIcon },
  { to: '/mensagens',   label: 'Mensagens',   icon: MensagensIcon },
  { to: '/conteudos',   label: 'Conteúdos',   icon: ConteudosIcon },
  { to: '/perfil',      label: 'Perfil',      icon: PerfilIcon },
]

// O administrador nao tem pacientes vinculados, entao as telas do nutricionista
// so devolveriam 403 para ele. Fica com a administracao, os conteudos (que ele
// tambem pode publicar) e o proprio perfil.
const NAV_ADMINISTRADOR = [
  { to: '/admin',     label: 'Administração', icon: AdminIcon },
  { to: '/conteudos', label: 'Conteúdos',     icon: ConteudosIcon },
  { to: '/perfil',    label: 'Perfil',        icon: PerfilIcon },
]

const ROTULO_PERFIL: Record<string, string> = {
  nutricionista: 'Nutricionista',
  administrador: 'Administrador',
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const initial = (user?.nome ?? 'N').charAt(0).toUpperCase()
  const nav = user?.role === 'administrador' ? NAV_ADMINISTRADOR : NAV_NUTRICIONISTA
  const rotuloPerfil = ROTULO_PERFIL[user?.role ?? ''] ?? 'Nutricionista'

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className={s.shell}>
      {sidebarOpen && <div className={s.overlay} onClick={() => setSidebarOpen(false)} />}

      <aside className={`${s.sidebar} ${sidebarOpen ? s.sidebarOpen : ''}`}>
        <div className={s.brand}>
          <div className={s.brandIcon}><PulseIcon /></div>
          <div>
            <div className={s.brandName}>NutriCare</div>
            <div className={s.brandSub}>Painel Profissional</div>
          </div>
        </div>

        <nav className={s.nav}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${s.navItem} ${isActive ? s.navItemActive : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className={s.navIcon}><item.icon /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={s.sidebarFooter}>
          <div className={s.userCard}>
            <div className={s.userAvatar}>{initial}</div>
            <div className={s.userInfo}>
              <div className={s.userName}>{user?.nome ?? 'Nutricionista'}</div>
              <div className={s.userRole}>{rotuloPerfil}</div>
            </div>
          </div>
          <button className={s.logoutBtn} onClick={handleLogout}>
            <LogoutIcon />
            Sair da conta
          </button>
        </div>
      </aside>

      <div className={s.main}>
        <header className={s.topbar}>
          <button className={s.menuBtn} onClick={() => setSidebarOpen(true)}><MenuIcon /></button>
          <div className={s.topbarBrand}><PulseIcon /><span>NutriCare</span></div>
          <div className={s.topbarAvatar}>{initial}</div>
        </header>
        <div className={s.content}><Outlet /></div>
      </div>
    </div>
  )
}

function PulseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
}
function HomeIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function PatientsIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function RegistrosIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
}
function AlimentacaoIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
}
function SaudeIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
}
function RelatoriosIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}

function MensagensIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
}

function ConteudosIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
}

function PerfilIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function AdminIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function LogoutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function MenuIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}
