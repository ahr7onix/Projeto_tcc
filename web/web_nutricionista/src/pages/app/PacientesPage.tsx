import { useState, useEffect, useCallback } from 'react'
import { Card, PageHeader, Input, EmptyState, AlertBanner } from '../../components/ui'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State para o Modal do Paciente
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<string | null>(null)

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

  return (
    <div>
      <PageHeader
        eyebrow="Gerenciamento"
        title="Pacientes"
        subtitle="Seus clientes registrados no aplicativo mobile aparecem automaticamente aqui."
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
            message={busca ? 'Tente um nome diferente.' : 'Os pacientes cadastrados no app mobile aparecerão aqui.'}
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
    </div>
  )
}

function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function PatientsIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
