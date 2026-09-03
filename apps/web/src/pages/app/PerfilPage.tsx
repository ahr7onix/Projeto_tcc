import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Input, Btn, AlertBanner } from '../../components/ui'
import { api, extractError } from '../../lib/api'
import s from './PerfilPage.module.css'

type Tab = 'dados' | 'senha' | 'notif' | 'ajuda' | 'termos' | 'sobre'

const ROTULO: Record<string, string> = {
  nutricionista: 'Nutricionista',
  administrador: 'Administrador',
}

const TABS: { id: Tab; label: string; icon: () => JSX.Element; group: 'conta' | 'suporte' }[] = [
  { id: 'dados', label: 'Dados da conta', icon: PersonIcon, group: 'conta' },
  { id: 'senha', label: 'Segurança', icon: LockIcon, group: 'conta' },
  { id: 'notif', label: 'Notificações', icon: BellIcon, group: 'conta' },
  { id: 'ajuda', label: 'Central de ajuda', icon: HelpIcon, group: 'suporte' },
  { id: 'termos', label: 'Termos e privacidade', icon: DocIcon, group: 'suporte' },
  { id: 'sobre', label: 'Sobre o sistema', icon: InfoIcon, group: 'suporte' },
]

export default function PerfilPage() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('dados')
  const [nome, setNome] = useState(user?.nome ?? '')
  const [email] = useState(user?.email ?? '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setNome(user?.nome ?? '')
  }, [user?.nome])

  const initial = (user?.nome ?? 'N').charAt(0).toUpperCase()
  const roleLabel = ROTULO[user?.role ?? ''] ?? 'Profissional'
  // Pula o titulo ("Dra.") para o cumprimento usar o nome de verdade.
  const TITULOS = ['dr', 'dr.', 'dra', 'dra.', 'sr', 'sr.', 'sra', 'sra.']
  const firstName = (user?.nome ?? 'Nutricionista')
    .split(' ')
    .filter(parte => parte && !TITULOS.includes(parte.toLowerCase()))[0] ?? 'Nutricionista'

  const handleSave = async (mode: 'dados' | 'senha') => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const body: Record<string, string> = {}
      if (mode === 'dados' && nome && nome !== user?.nome) body.nome = nome
      if (mode === 'senha') {
        if (!senhaAtual || !novaSenha) {
          setError('Preencha a senha atual e a nova senha.')
          return
        }
        if (novaSenha.length < 8) {
          setError('A nova senha deve ter pelo menos 8 caracteres.')
          return
        }
        body.senhaAtual = senhaAtual
        body.novaSenha = novaSenha
      }
      if (Object.keys(body).length === 0) {
        setError(mode === 'dados' ? 'Nenhuma alteração para salvar.' : 'Preencha os campos de senha.')
        return
      }

      const { data } = await api.patch('/perfil', body)
      const accessToken = localStorage.getItem('@NutriCare:accessToken') ?? ''
      const refreshToken = localStorage.getItem('@NutriCare:refreshToken') ?? ''
      login(data, accessToken, refreshToken)
      setNome(data.nome)
      setSenhaAtual('')
      setNovaSenha('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const selectTab = (id: Tab) => {
    setTab(id)
    setError(null)
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <p className={s.eyebrow}>Sua conta</p>
        <h1 className={s.title}>Gerenciar perfil</h1>
        <p className={s.subtitle}>Hub de configurações do NutriCare — dados, segurança e suporte.</p>
      </header>

      {success && (
        <div className={s.flash}>
          <AlertBanner message="Dados atualizados com sucesso!" type="success" />
        </div>
      )}

      <div className={s.hub}>
        <aside className={s.rail}>
          <div className={s.railTop}>
            <div className={s.avatar} aria-hidden>{initial}</div>
            <h2 className={s.railName}>{user?.nome ?? '—'}</h2>
            <p className={s.railRole}>{roleLabel}</p>
            <p className={s.railBio}>
              Olá, {firstName}. Use o menu ao lado para editar dados, senha e ver suporte.
            </p>
            <p className={s.railEmail}>{user?.email ?? '—'}</p>
          </div>

          <nav className={s.railNav} aria-label="Seções do perfil">
            <p className={s.railGroup}>Conta</p>
            {TABS.filter(t => t.group === 'conta').map(t => (
              <button
                key={t.id}
                type="button"
                className={`${s.railLink} ${tab === t.id ? s.railLinkActive : ''}`}
                onClick={() => selectTab(t.id)}
              >
                <span className={s.railIcon}><t.icon /></span>
                {t.label}
              </button>
            ))}
            <p className={s.railGroup}>Suporte</p>
            {TABS.filter(t => t.group === 'suporte').map(t => (
              <button
                key={t.id}
                type="button"
                className={`${s.railLink} ${tab === t.id ? s.railLinkActive : ''}`}
                onClick={() => selectTab(t.id)}
              >
                <span className={s.railIcon}><t.icon /></span>
                {t.label}
              </button>
            ))}
          </nav>

          <button type="button" className={s.railLogout} onClick={handleLogout}>
            <LogoutIcon />
            Sair da conta
          </button>
        </aside>

        <section className={s.panel} key={tab}>
          {tab === 'dados' && (
            <>
              <div className={s.panelHead}>
                <h3>Dados da conta</h3>
                <p>Atualize seu nome profissional. O e-mail fica vinculado ao login.</p>
              </div>
              {error && <AlertBanner message={error} />}
              <div className={s.formGrid}>
                <Input label="Nome completo" value={nome} onChange={e => setNome(e.target.value)} />
                <Input label="E-mail" type="email" value={email} disabled style={{ opacity: 0.65 }} />
              </div>
              <div className={s.formActions}>
                <Btn icon={<CheckIcon />} loading={saving} onClick={() => handleSave('dados')}>
                  Salvar alterações
                </Btn>
              </div>
            </>
          )}

          {tab === 'senha' && (
            <>
              <div className={s.panelHead}>
                <h3>Segurança</h3>
                <p>Altere a senha de acesso ao painel. Use no mínimo 8 caracteres.</p>
              </div>
              {error && <AlertBanner message={error} />}
              <div className={s.formGrid}>
                <Input
                  label="Senha atual"
                  type="password"
                  value={senhaAtual}
                  onChange={e => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                />
                <Input
                  label="Nova senha"
                  type="password"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className={s.formActions}>
                <Btn icon={<CheckIcon />} loading={saving} onClick={() => handleSave('senha')}>
                  Atualizar senha
                </Btn>
              </div>
            </>
          )}

          {tab === 'notif' && (
            <>
              <div className={s.panelHead}>
                <h3>Notificações</h3>
                <p>Como o NutriCare avisa sobre pacientes e mensagens hoje.</p>
              </div>
              <ul className={s.infoList}>
                <li>Alertas de glicemia fora da faixa na tela Início</li>
                <li>Mensagens não lidas no menu Mensagens</li>
                <li>Preferências finas de alerta chegam em breve</li>
              </ul>
            </>
          )}

          {tab === 'ajuda' && (
            <>
              <div className={s.panelHead}>
                <h3>Central de ajuda</h3>
                <p>Atalhos rápidos do painel do nutricionista.</p>
              </div>
              <ul className={s.infoList}>
                <li>Pacientes — vínculos e fichas</li>
                <li>Registros — glicemia e histórico</li>
                <li>Alimentação / Relatórios — acompanhamento nutricional</li>
              </ul>
            </>
          )}

          {tab === 'termos' && (
            <>
              <div className={s.panelHead}>
                <h3>Termos e privacidade</h3>
                <p>
                  Dados clínicos dos pacientes são protegidos e destinam-se ao acompanhamento
                  nutricional neste TCC. Não compartilhe suas credenciais.
                </p>
              </div>
            </>
          )}

          {tab === 'sobre' && (
            <>
              <div className={s.panelHead}>
                <h3>Sobre o sistema</h3>
                <p>NutriCare — painel web do nutricionista · TCC · tema FEZ roxo escuro.</p>
              </div>
              <div className={s.metaChip}>Versão web · perfil hub</div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function PersonIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
function LockIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
}
function BellIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
}
function HelpIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
}
function DocIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}
function InfoIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
}
function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}
function LogoutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
}
