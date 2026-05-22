import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StatTile, AlertBanner } from '../../components/ui'
import { api, extractError } from '../../lib/api'

interface Paciente {
  id: string
  nome: string
  email: string
  glicemiaMedia: number | null
  ultimoRegistro: string | null
  status: 'ativo' | 'inativo'
}

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Sem registros'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  return `${Math.floor(days / 7)} sem. atrás`
}

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/pacientes')
      .then(({ data }) => setPacientes(data.data))
      .catch(err => setError(extractError(err)))
      .finally(() => setLoading(false))
  }, [])

  const primeiroNome = (user?.nome ?? 'Nutricionista').split(' ')[0]
  const ativos = pacientes.filter(p => p.status === 'ativo').length
  const mediaGeral = (() => {
    const comMedia = pacientes.filter(p => p.glicemiaMedia)
    if (!comMedia.length) return null
    return (comMedia.reduce((a, p) => a + (p.glicemiaMedia ?? 0), 0) / comMedia.length).toFixed(0)
  })()
  const recentes = [...pacientes]
    .sort((a, b) => (b.ultimoRegistro ?? '').localeCompare(a.ultimoRegistro ?? ''))
    .slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #5B21B6 100%)',
        borderRadius: 'var(--radius-xl)', padding: '28px 32px',
        color: 'white',
      }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginBottom: 6 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
          {saudacao()}, {primeiroNome}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
          Aqui está um resumo dos seus pacientes hoje.
        </p>
      </div>

      {error && <AlertBanner message={error} />}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16 }}>
        <StatTile
          label="Total de pacientes"
          value={loading ? '...' : pacientes.length}
          icon={<PatientsIcon />}
          tint="primary"
        />
        <StatTile
          label="Pacientes ativos"
          value={loading ? '...' : ativos}
          icon={<ActiveIcon />}
          tint="success"
          sub={pacientes.length ? `${Math.round((ativos / pacientes.length) * 100)}% do total` : undefined}
        />
        <StatTile
          label="Média glicemia (30d)"
          value={loading ? '...' : mediaGeral ? `${mediaGeral} mg/dL` : '—'}
          icon={<GlucoseIcon />}
          tint={mediaGeral && Number(mediaGeral) > 140 ? 'warning' : 'primary'}
        />
      </div>

      {/* Recent patients */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Pacientes recentes</span>
          <button
            onClick={() => navigate('/pacientes')}
            style={{
              fontSize: 13, fontWeight: 600, color: 'var(--primary)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Ver todos →
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Carregando...
          </div>
        ) : recentes.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Nenhum paciente cadastrado ainda.
          </div>
        ) : (
          recentes.map((p, i) => (
            <div
              key={p.id}
              onClick={() => navigate('/pacientes')}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 20px',
                borderBottom: i < recentes.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--primary-soft)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>{p.nome.charAt(0).toUpperCase()}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{p.email}</div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: p.status === 'ativo' ? 'var(--success-soft)' : 'var(--surface-alt)',
                  color: p.status === 'ativo' ? 'var(--success)' : 'var(--text-muted)',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                  {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  {timeAgo(p.ultimoRegistro)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function PatientsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ActiveIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
function GlucoseIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> }
