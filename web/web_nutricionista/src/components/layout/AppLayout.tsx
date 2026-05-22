import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import s from './AppLayout.module.css'

const NAV = [
  { to: '/dashboard', label: 'Início', icon: HomeIcon },
  { to: '/pacientes', label: 'Pacientes', icon: PatientsIcon },
  { to: '/registros', label: 'Registros', icon: RecordsIcon },
  { to: '/alimentacao', label: 'Alimentação', icon: FoodIcon },
  { to: '/saude', label: 'Saúde', icon: HeartIcon },
  { to: '/perfil', label: 'Meu Perfil', icon: PersonIcon },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const initial = (user?.nome ?? 'N').charAt(0).toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={s.shell}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className={s.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${s.sidebar} ${sidebarOpen ? s.sidebarOpen : ''}`}>
        <div className={s.brand}>
          <div className={s.brandIcon}>
            <PulseIcon />
          </div>
          <div>
            <div className={s.brandName}>NutriCare</div>
            <div className={s.brandSub}>Painel Profissional</div>
          </div>
        </div>

        <nav className={s.nav}>
          {NAV.map((item) => (
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
              <div className={s.userRole}>Nutricionista</div>
            </div>
          </div>
          <button className={s.logoutBtn} onClick={handleLogout}>
            <LogoutIcon />
            Sair
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className={s.main}>
        {/* Mobile topbar */}
        <header className={s.topbar}>
          <button className={s.menuBtn} onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </button>
          <div className={s.topbarBrand}>
            <PulseIcon />
            <span>NutriCare</span>
          </div>
          <div className={s.topbarAvatar}>{initial}</div>
        </header>

        <div className={s.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

// Icons
function PulseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function PatientsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function RecordsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
function FoodIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  )
}
function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
