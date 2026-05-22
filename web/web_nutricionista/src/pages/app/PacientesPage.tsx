import { useState, useEffect, useCallback } from 'react'
import { Card, PageHeader, Btn, Input, EmptyState, AlertBanner } from '../../components/ui'
import { api, extractError } from '../../lib/api'
import PacienteDetalhesModal from '../../components/PacienteDetalhesModal'

interface Paciente {
  id: string
  nome: string
  email: string
  glicemiaMedia: number | null
  ultimoRegistro: string | null
  status: 'ativo' | 'inativo'
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [busca, setBusca] = useState('')
  const [showModalAdd, setShowModalAdd] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // State para o Modal do Paciente
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<string | null>(null)

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
      setShowModalAdd(false)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const filtrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        eyebrow="Gerenciamento"
        title="Pacientes"
        subtitle="Acompanhe todos os seus pacientes em um só lugar."
        action={
          <Btn icon={<PlusIcon />} onClick={() => setShowModalAdd(true)}>
            Adicionar paciente
          </Btn>
        }
      />

      {error && <div style={{ marginBottom: 16 }}><AlertBanner message={error} /></div>}

      <Card>
        {/* Search */}
        <Input
          placeholder="Buscar por nome..."
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
              padding: '10px 12px',
              fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.4px',
              borderBottom: '1px solid var(--border)',
            }}>
              Nome do Paciente
            </div>
            {filtrados.map((p) => (
              <div key={p.id} style={{
                padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s', cursor: 'pointer',
              }}
                onClick={() => setPacienteSelecionadoId(p.id)}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--primary-soft)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>{p.nome.charAt(0).toUpperCase()}</div>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 16 }}>{p.nome}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PatientsIcon />}
            title="Nenhum paciente encontrado"
            message={busca ? 'Tente um nome diferente.' : 'Adicione pacientes para começar a acompanhar.'}
          />
        )}
      </Card>

      {/* Modal de Detalhes do Paciente */}
      {pacienteSelecionadoId && (
        <PacienteDetalhesModal 
          pacienteId={pacienteSelecionadoId} 
          onClose={() => setPacienteSelecionadoId(null)} 
        />
      )}

      {/* Modal de Adicionar Paciente */}
      {showModalAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
        }} onClick={() => setShowModalAdd(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Adicionar paciente</h3>
            {error && <div style={{ marginBottom: 12 }}><AlertBanner message={error} /></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Nome completo" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do paciente" />
              <Input label="E-mail (opcional)" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <Btn variant="secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModalAdd(false)}>Cancelar</Btn>
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
