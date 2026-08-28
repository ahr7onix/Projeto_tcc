import { useEffect, useState } from 'react'
import { AlertBanner, Btn, EmptyState } from './ui'
import PatientPicker from './PatientPicker'
import { extractError } from '../lib/api'
import {
  buscarDisponiveis,
  vincularPaciente,
  type PacienteDisponivel,
} from '../lib/vinculos'

interface Props {
  onClose: () => void
  onVinculado: () => void
}

export default function VincularPacienteModal({ onClose, onVinculado }: Props) {
  const [busca, setBusca] = useState('')
  const [pacientes, setPacientes] = useState<PacienteDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const [vinculandoId, setVinculandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        setErro(null)
        setPacientes(await buscarDisponiveis(busca || undefined))
      } catch (err) {
        setErro(extractError(err))
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [busca])

  async function handleVincular(paciente: PacienteDisponivel) {
    try {
      setVinculandoId(paciente.id)
      setErro(null)
      await vincularPaciente(paciente.id)
      setPacientes((atual) => atual.filter((p) => p.id !== paciente.id))
      onVinculado()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setVinculandoId(null)
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div>
            <div style={eyebrow}>Vincular</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
              Adicionar paciente
            </h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={body}>
          {erro && <AlertBanner message={erro} />}

          <PatientPicker
            patients={pacientes}
            value={busca}
            label="Localizar paciente"
            placeholder="Digite o nome ou e-mail..."
            onChange={setBusca}
          />

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Buscando...
            </div>
          ) : pacientes.length === 0 ? (
            <EmptyState
              icon={<UsersIcon />}
              title="Nenhum paciente disponível"
              message={
                busca
                  ? 'Nenhum paciente encontrado com esse termo.'
                  : 'Todos os pacientes cadastrados já estão vinculados a você.'
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pacientes.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: i < pacientes.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={avatar}>{p.nome.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                      {p.nome}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</div>
                  </div>
                  <Btn
                    size="sm"
                    loading={vinculandoId === p.id}
                    onClick={() => handleVincular(p)}
                  >
                    Vincular
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={footer}>
          <Btn variant="secondary" onClick={onClose}>
            Fechar
          </Btn>
        </div>
      </div>
    </div>
  )
}

function UsersIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  width: '100%', maxWidth: 520, maxHeight: '85vh',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
}
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid var(--border)',
}
const eyebrow: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--primary)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4,
}
const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 26, lineHeight: 1, color: 'var(--text-muted)',
}
const body: React.CSSProperties = {
  padding: '20px 24px', overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: 14,
}
const avatar: React.CSSProperties = {
  width: 38, height: 38, borderRadius: '50%',
  background: 'var(--primary-soft)', color: 'var(--primary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 700, fontSize: 14, flexShrink: 0,
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end',
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
