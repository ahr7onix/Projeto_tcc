import { useState, type ReactNode } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import s from './AppLayout.module.css'

interface ItemMenu {
  to: string
  label: string
  icon: () => JSX.Element
}
interface GrupoMenu {
  /** Título da seção. Some quando o menu está recolhido. */
  titulo: string
  itens: ItemMenu[]
}

/*
 * O menu é agrupado pelo momento do atendimento, não pela ordem em que as telas
 * foram construídas: primeiro o dia a dia (quem está na frente da nutricionista),
 * depois o acompanhamento clínico, depois a base de nutrição e por fim o que é
 * publicado para os pacientes.
 *
 * "Perfil" não entra na navegação: fica no cartão do usuário, no rodapé, junto
 * com o botão de sair.
 */
const NAV_NUTRICIONISTA: GrupoMenu[] = [
  {
    titulo: 'Atendimento',
    itens: [
      { to: '/inicio', label: 'Início', icon: HomeIcon },
      { to: '/pacientes', label: 'Pacientes', icon: PatientsIcon },
      { to: '/mensagens', label: 'Mensagens', icon: MensagensIcon },
    ],
  },
  {
    titulo: 'Acompanhamento',
    itens: [
      { to: '/registros', label: 'Registros', icon: RegistrosIcon },
      { to: '/saude', label: 'Saúde', icon: SaudeIcon },
      { to: '/relatorios', label: 'Relatórios', icon: RelatoriosIcon },
    ],
  },
  {
    titulo: 'Nutrição',
    itens: [
      { to: '/alimentacao', label: 'Planos alimentares', icon: AlimentacaoIcon },
      { to: '/alimentos', label: 'Alimentos', icon: AlimentosIcon },
      { to: '/receitas', label: 'Receitas', icon: ReceitasIcon },
    ],
  },
  {
    titulo: 'Publicação',
    itens: [{ to: '/conteudos', label: 'Conteúdos', icon: ConteudosIcon }],
  },
]

// O administrador nao tem pacientes vinculados, entao as telas do nutricionista
// so devolveriam 403 para ele. Fica com a administracao e os conteudos (que ele
// tambem pode publicar).
const NAV_ADMINISTRADOR: GrupoMenu[] = [
  {
    titulo: 'Sistema',
    itens: [
      { to: '/admin', label: 'Administração', icon: AdminIcon },
      { to: '/conteudos', label: 'Conteúdos', icon: ConteudosIcon },
    ],
  },
]

const ROTULO_PERFIL: Record<string, string> = {
  nutricionista: 'Nutricionista',
  administrador: 'Administrador',
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const initial = (user?.nome ?? 'N').charAt(0).toUpperCase()
  const grupos = user?.role === 'administrador' ? NAV_ADMINISTRADOR : NAV_NUTRICIONISTA
  const rotuloPerfil = ROTULO_PERFIL[user?.role ?? ''] ?? 'Nutricionista'

  const handleLogout = () => { logout(); navigate('/login') }
  const fechar = () => setSidebarOpen(false)

  return (
    <div className={s.shell}>
      {sidebarOpen && <div className={s.overlay} onClick={fechar} />}

      <aside
        className={[
          s.sidebar,
          sidebarOpen ? s.sidebarOpen : '',
          collapsed ? s.sidebarCollapsed : '',
        ].filter(Boolean).join(' ')}
      >
        <div className={s.brand}>
          <div className={s.brandIcon}><PulseIcon /></div>
          <div className={s.brandText}>
            <div className={s.brandName}>NutriCare</div>
            <div className={s.brandSub}>Painel clínico</div>
          </div>
          <button
            type="button"
            className={s.collapseBtn}
            onClick={() => setCollapsed(v => !v)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir' : 'Recolher'}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        <nav className={s.nav} aria-label="Navegação principal">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className={s.grupo}>
              <div className={s.grupoTitulo}>{grupo.titulo}</div>
              {grupo.itens.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={({ isActive }) => `${s.navItem} ${isActive ? s.navItemActive : ''}`}
                  onClick={fechar}
                >
                  <span className={s.navIcon}><item.icon /></span>
                  <span className={s.navLabel}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={s.sidebarFooter}>
          {/* O cartão do usuário é o caminho para o perfil — por isso ele saiu
              da lista de menus acima. */}
          <NavLink
            to="/perfil"
            className={({ isActive }) => `${s.userCard} ${isActive ? s.userCardActive : ''}`}
            title={`${user?.nome ?? 'Nutricionista'} — abrir perfil`}
            onClick={fechar}
          >
            <div className={s.userAvatar}>{initial}</div>
            <div className={s.userInfo}>
              <div className={s.userName}>{user?.nome ?? 'Nutricionista'}</div>
              <div className={s.userRole}>{rotuloPerfil}</div>
            </div>
          </NavLink>
          <button className={s.logoutBtn} onClick={handleLogout} title="Sair da conta">
            <LogoutIcon />
            <span className={s.logoutLabel}>Sair da conta</span>
          </button>
        </div>
      </aside>

      <div className={s.main}>
        <header className={s.topbar}>
          <button type="button" className={s.menuBtn} onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <MenuIcon />
          </button>
          <div className={s.topbarBrand}><PulseIcon /><span>NutriCare</span></div>
          <NavLink to="/perfil" className={s.topbarAvatar} aria-label="Abrir perfil">{initial}</NavLink>
        </header>
        <main className={s.content}><Outlet /></main>
      </div>
    </div>
  )
}

/* ─── Ícones ───
   Traço de 1.75px, cantos arredondados e a mesma caixa de 24: o conjunto tem
   que parecer desenhado de uma vez só, não juntado de fontes diferentes. */
function Svg({ size = 18, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden
    >{children}</svg>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return <Svg size={16}>{collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}</Svg>
}

function PulseIcon() {
  return <Svg size={18}><path d="M3 12h4l2.5-7 5 14L17 12h4" /></Svg>
}
function HomeIcon() {
  return <Svg><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.8" /><path d="M9.5 21v-6h5v6" /></Svg>
}
function PatientsIcon() {
  return <Svg><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.9" /><path d="M18 14.6a5.5 5.5 0 0 1 2.5 4.6" /></Svg>
}
function MensagensIcon() {
  return <Svg><path d="M20 15a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" /><path d="M8.5 9.5h7" /><path d="M8.5 13h4" /></Svg>
}
function RegistrosIcon() {
  return <Svg><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M9 3.5v3" /><path d="M15 3.5v3" /><path d="M4 9h16" /><path d="M8 13.5h3.5" /><path d="M8 17h8" /></Svg>
}
function SaudeIcon() {
  return <Svg><path d="M20.4 6.6a4.6 4.6 0 0 0-7.5-1.4L12 6.1l-.9-.9a4.6 4.6 0 0 0-6.6 6.4L12 20l7.5-8.4a4.6 4.6 0 0 0 .9-5z" /><path d="M6.5 12h2.2l1.3-2.2 1.7 4 1.3-1.8h2.5" /></Svg>
}
function RelatoriosIcon() {
  return <Svg><path d="M4 20h16" /><rect x="5" y="11" width="3.5" height="6" rx="1" /><rect x="10.2" y="6.5" width="3.5" height="10.5" rx="1" /><rect x="15.5" y="9" width="3.5" height="8" rx="1" /></Svg>
}
function AlimentacaoIcon() {
  return <Svg><path d="M6 3v7a2.5 2.5 0 0 0 5 0V3" /><path d="M8.5 12.5V21" /><path d="M17 3c-1.6 1.4-2.2 3.2-2.2 5.2 0 1.6.8 2.6 2.2 2.8V21" /></Svg>
}
function AlimentosIcon() {
  return <Svg><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17" /><path d="M9.5 9.5V20" /><path d="M3.5 15h17" /></Svg>
}
function ReceitasIcon() {
  return <Svg><path d="M6.5 13.5a4 4 0 0 1 1.2-7.4 4.6 4.6 0 0 1 8.6 0 4 4 0 0 1 1.2 7.4V17h-11z" /><path d="M6.5 20h11" /></Svg>
}
function ConteudosIcon() {
  return <Svg><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></Svg>
}
function AdminIcon() {
  return <Svg><path d="M12 3.2 19.5 6v5.4c0 4.3-3 7.6-7.5 9.4-4.5-1.8-7.5-5.1-7.5-9.4V6z" /><path d="M9.3 12.2 11.3 14l3.5-3.6" /></Svg>
}
function LogoutIcon() {
  return <Svg size={16}><path d="M9.5 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5" /><polyline points="15.5 16 19.5 12 15.5 8" /><path d="M19.5 12H9.5" /></Svg>
}
function MenuIcon() {
  return <Svg size={22}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg>
}
