import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Card, PageHeader, Input, Btn, AlertBanner } from '../../components/ui'
import { api, extractError } from '../../lib/api'

const menuItems = [
  { key: 'editar', label: 'Editar perfil', icon: PersonIcon, desc: 'Altere seus dados cadastrais' },
  { key: 'senha', label: 'Alterar senha', icon: LockIcon, desc: 'Atualize sua senha de acesso' },
  { key: 'notif', label: 'Notificações', icon: BellIcon, desc: 'Configure alertas e lembretes' },
]
const suporteItems = [
  { key: 'ajuda', label: 'Central de ajuda', icon: HelpIcon, desc: 'Dúvidas e tutoriais' },
  { key: 'termos', label: 'Termos e privacidade', icon: DocIcon, desc: 'Leia os termos de uso' },
  { key: 'sobre', label: 'Sobre o sistema', icon: InfoIcon, desc: 'Versão e informações' },
]

export default function PerfilPage() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState(user?.nome ?? '')
  const [email] = useState(user?.email ?? '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const initial = (user?.nome ?? 'N').charAt(0).toUpperCase()

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false)
    try {
      const body: Record<string, string> = {}
      if (nome && nome !== user?.nome) body.nome = nome
      if (senhaAtual && novaSenha) { body.senhaAtual = senhaAtual; body.novaSenha = novaSenha }
      if (Object.keys(body).length === 0) { setEditing(false); return }

      const { data } = await api.patch('/perfil', body)
      const accessToken = localStorage.getItem('@NutriCare:accessToken') ?? ''
      const refreshToken = localStorage.getItem('@NutriCare:refreshToken') ?? ''
      login(data, accessToken, refreshToken)
      setNome(data.nome)
      setSenhaAtual(''); setNovaSenha('')
      setSuccess(true); setEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(extractError(err))
    } finally { setSaving(false) }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div>
      <PageHeader eyebrow="Sua conta" title="Perfil" />

      {success && <div style={{ marginBottom: 16 }}><AlertBanner message="Dados atualizados com sucesso!" type="success" /></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        <div style={{
          gridColumn: '1 / -1',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: '28px',
          display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 700, flexShrink: 0,
            boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
          }}>{initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>{user?.nome ?? '—'}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email ?? '—'}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 8, padding: '4px 12px', borderRadius: 999, background: 'var(--primary-soft)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>Nutricionista</span>
            </div>
          </div>
          <Btn variant="secondary" icon={<EditIcon />} onClick={() => { setEditing(!editing); setError(null) }}>
            {editing ? 'Cancelar' : 'Editar'}
          </Btn>
        </div>

        {editing && (
          <Card title="Editar dados" style={{ gridColumn: '1 / -1' }}>
            {error && <AlertBanner message={error} />}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="Nome completo" value={nome} onChange={e => setNome(e.target.value)} />
              <Input label="E-mail" type="email" value={email} disabled style={{ opacity: 0.6 }} />
            </div>
            <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 12 }}>Alterar senha (opcional)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input label="Senha atual" type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="••••••••" />
                <Input label="Nova senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 8 caracteres" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Btn icon={<CheckIcon />} loading={saving} onClick={handleSave}>Salvar alterações</Btn>
              <Btn variant="secondary" onClick={() => { setEditing(false); setError(null) }}>Cancelar</Btn>
            </div>
          </Card>
        )}

        <Card title="Conta">
          <div>
            {menuItems.map((item, i) => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer',
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{item.desc}</div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Suporte">
          <div>
            {suporteItems.map((item, i) => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                borderBottom: i < suporteItems.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer',
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-alt)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{item.desc}</div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ gridColumn: '1 / -1' }}>
          <Btn variant="danger" size="lg" icon={<LogoutIcon />} style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
            Sair da conta
          </Btn>
        </div>
      </div>
    </div>
  )
}

function PersonIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function LockIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function BellIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function HelpIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function DocIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function InfoIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> }
function EditIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function CheckIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function LogoutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
