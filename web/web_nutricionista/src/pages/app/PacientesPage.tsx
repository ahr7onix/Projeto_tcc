import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Input, EmptyState, AlertBanner, Btn } from '../../components/ui'
import { api, extractError } from '../../lib/api'
import PacienteDetalhesModal from '../../components/PacienteDetalhesModal'
import VincularPacienteModal from '../../components/VincularPacienteModal'
import { desvincularPaciente } from '../../lib/vinculos'

interface Paciente {
  id: string
  nome: string
  email: string
  glicemiaMedia: number | null
  ultimoRegistro: string | null
  status: 'ativo' | 'inativo'
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Sem registros'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`
  return `${Math.floor(days / 30)} meses atrás`
}

function glicemiaColor(val: number | null): string {
  if (!val) return 'var(--text-muted)'
  if (val < 100) return 'var(--success)'
  if (val < 140) return 'var(--warning)'
  return 'var(--danger)'
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<string | null>(null)
  const [vincularAberto, setVincularAberto] = useState(false)
  const [desvinculandoId, setDesvinculandoId] = useState<string | null>(null)

  const fetchPacientes = useCallback(async (q?: string) => {
    try {
      const params: Record<string, string> = {}
      if (q) params.busca = q
      const { data } = await api.get('/pacientes', { params })
      setPacientes(data.data)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPacientes() }, [fetchPacientes])

  useEffect(() => {
    if (!busca) { fetchPacientes(); return }
    const timer = setTimeout(() => fetchPacientes(busca), 300)
    return () => clearTimeout(timer)
  }, [busca, fetchPacientes])

  const filtrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const ativos = pacientes.filter(p => p.status === 'ativo').length

  async function handleDesvincular(e: React.MouseEvent, p: Paciente) {
    e.stopPropagation()
    if (!window.confirm(`Desvincular ${p.nome}? Você perderá o acesso aos dados deste paciente.`)) return
    try {
      setDesvinculandoId(p.id)
      await desvincularPaciente(p.id)
      setPacientes(atual => atual.filter(x => x.id !== p.id))
    } catch (err) {
      setError(extractError(err))
    } finally {
      setDesvinculandoId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Gerenciamento"
        title="Pacientes"
        subtitle="Pacientes vinculados a você. Novos cadastros pelo app mobile aparecem automaticamente aqui."
        action={<Btn onClick={() => setVincularAberto(true)}>+ Vincular paciente</Btn>}
      />

      {error && <div style={{ marginBottom: 16 }}><AlertBanner message={error} /></div>}

      {}
      {!loading && pacientes.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: pacientes.length, color: 'var(--primary)', bg: 'var(--primary-soft)' },
            { label: 'Ativos', value: ativos, color: 'var(--success)', bg: 'var(--success-soft)' },
            { label: 'Inativos', value: pacientes.length - ativos, color: 'var(--text-muted)', bg: 'var(--surface-alt)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 'var(--radius-md)',
              padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 13, color: s.color, fontWeight: 600, opacity: 0.8 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        {}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <Input
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            icon={<SearchIcon />}
          />
        </div>

        {}
        {!loading && filtrados.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 110px 140px 130px 110px 36px',
            padding: '10px 20px', gap: 12,
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <span>Paciente</span>
            <span>Status</span>
            <span>Glicemia média</span>
            <span>Último registro</span>
            <span />
            <span />
          </div>
        )}

        {}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Carregando pacientes...
          </div>
        ) : filtrados.length > 0 ? (
          filtrados.map((p, i) => (
            <div
              key={p.id}
              onClick={() => setPacienteSelecionadoId(p.id)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 110px 140px 130px 110px 36px',
                alignItems: 'center', padding: '14px 20px', gap: 12,
                borderBottom: i < filtrados.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              {}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--primary-soft)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 15, flexShrink: 0,
                }}>{p.nome.charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</div>
                </div>
              </div>

              {}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: p.status === 'ativo' ? 'var(--success-soft)' : 'var(--surface-alt)',
                  color: p.status === 'ativo' ? 'var(--success)' : 'var(--text-muted)',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                  {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {}
              <div style={{ fontSize: 14, fontWeight: 600, color: glicemiaColor(p.glicemiaMedia) }}>
                {p.glicemiaMedia ? `${p.glicemiaMedia} mg/dL` : '—'}
              </div>

              {}
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {timeAgo(p.ultimoRegistro)}
              </div>

              <div>
                <Btn
                  variant="ghost"
                  size="sm"
                  loading={desvinculandoId === p.id}
                  onClick={(e) => handleDesvincular(e, p)}
                >
                  Desvincular
                </Btn>
              </div>

              <div style={{ color: 'var(--text-muted)', display: 'flex' }}>
                <ChevronIcon />
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '8px 0 8px' }}>
            <EmptyState
              icon={<PatientsIcon />}
              title="Nenhum paciente encontrado"
              message={busca ? 'Tente um nome diferente.' : 'Clique em "Vincular paciente" para começar a acompanhar alguém.'}
            />
          </div>
        )}
      </div>

      {pacienteSelecionadoId && (
        <PacienteDetalhesModal
          pacienteId={pacienteSelecionadoId}
          onClose={() => setPacienteSelecionadoId(null)}
        />
      )}

      {vincularAberto && (
        <VincularPacienteModal
          onClose={() => setVincularAberto(false)}
          onVinculado={() => fetchPacientes(busca || undefined)}
        />
      )}
    </div>
  )
}

function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function PatientsIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ChevronIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg> }
