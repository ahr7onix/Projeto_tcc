import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, PageHeader, Btn, Input, EmptyState, Badge, AlertBanner } from '../../components/ui'
import { api, extractError } from '../../lib/api'

interface Paciente {
  id: string
  nome: string
  email: string
  glicemiaMedia: number | null
  ultimoRegistro: string | null
  status: 'ativo' | 'inativo'
}

interface Meta {
  total: number
  ativos: number
  comAlertas: number
}

function formatDate(iso: string | null) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function PacientesPage() {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, ativos: 0, comAlertas: 0 })
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPacientes = useCallback(async (q?: string) => {
    try {
      const params: Record<string, string> = {}
      if (q) params.busca = q
      const { data } = await api.get('/pacientes', { params })
      setPacientes(data.data)
      setMeta(data.meta)
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

  const handleAdd = async () => {
    if (!nome || !email) return
    setSaving(true)
    setError(null)
    try {
      const { data } = await api.post('/pacientes', { nome, email })
      setPacientes(prev => [data, ...prev])
      setMeta(prev => ({ ...prev, total: prev.total + 1, ativos: prev.ativos + 1 }))
      setNome('')
      setEmail('')
      setShowModal(false)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const filtrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.email.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        eyebrow="Gerenciamento"
        title="Pacientes"
        subtitle="Acompanhe todos os seus pacientes em um só lugar."
        action={
          <Btn icon={<PlusIcon />} onClick={() => setShowModal(true)}>
            Adicionar paciente
          </Btn>
        }
      />

      {error && <div style={{ marginBottom: 16 }}><AlertBanner message={error} /></div>}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total de pacientes', value: String(meta.total), tint: '#7C3AED', bg: '#F3EEFF' },
          { label: 'Ativos', value: String(meta.ativos), tint: '#10B981', bg: '#E7F8F2' },
          { label: 'Com alertas', value: String(meta.comAlertas), tint: '#EF4444', bg: '#FCEAEA' },
        ].map((s) => (
          <div key={s.label} style={{
            flex: '1', minWidth: 150,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.tint }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Card>
        {/* Search */}
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          icon={<SearchIcon />}
        />

        {/* Table header */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando pacientes...</div>
        ) : filtrados.length > 0 ? (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto',
              gap: 16, padding: '10px 12px',
              fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.4px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span>Paciente</span>
              <span>E-mail</span>
              <span>Última glicemia</span>
              <span>Último registro</span>
              <span>Status</span>
            </div>
            {filtrados.map((p) => (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto',
                gap: 16, padding: '14px 12px', alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s', cursor: 'pointer',
              }}
                onClick={() => navigate(`/pacientes/${p.id}`)}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--primary-soft)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>{p.nome.charAt(0).toUpperCase()}</div>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{p.nome}</span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.email}</span>
                <span style={{ fontSize: 13, color: p.glicemiaMedia ? 'var(--text)' : 'var(--text-muted)' }}>
                  {p.glicemiaMedia ? `${p.glicemiaMedia} mg/dL` : '--'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {formatDate(p.ultimoRegistro)}
                </span>
                <Badge label={p.status === 'ativo' ? 'Ativo' : 'Inativo'} tint={p.status === 'ativo' ? 'success' : 'warning'} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PatientsIcon />}
            title="Nenhum paciente encontrado"
            message={busca ? 'Tente um nome ou e-mail diferente.' : 'Adicione pacientes para começar a acompanhar a evolução clínica.'}
          />
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
        }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Adicionar paciente</h3>
            {error && <div style={{ marginBottom: 12 }}><AlertBanner message={error} /></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Nome completo" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do paciente" />
              <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <Btn variant="secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</Btn>
                <Btn style={{ flex: 1, justifyContent: 'center' }} loading={saving} onClick={handleAdd}>Adicionar</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlusIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function PatientsIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
