import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, EmptyState, Card } from './ui'
import { extractError } from '../lib/api'
import {
  CLASSIFICACAO_LABEL,
  MOMENTO_LABEL,
  listarAlertas,
  type Alerta,
} from '../lib/alertas'

interface Props {
  dias?: number
  limite?: number
  pacienteId?: string
}

function formatarQuando(iso: string): string {
  const data = new Date(iso)
  const diff = Date.now() - data.getTime()
  const horas = Math.floor(diff / 3600000)
  if (horas < 1) return 'Agora há pouco'
  if (horas < 24) return `${horas}h atrás`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'Ontem' : `${dias} dias atrás`
}

export default function AlertasPanel({ dias = 7, limite = 6, pacienteId }: Props) {
  const navigate = useNavigate()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarAlertas({ dias, pacienteId })
      .then(setAlertas)
      .catch((err) => setErro(extractError(err)))
      .finally(() => setLoading(false))
  }, [dias, pacienteId])

  const criticos = alertas.filter((a) => a.severidade === 'critico').length
  const visiveis = alertas.slice(0, limite)

  return (
    <Card
      title="Alertas glicêmicos"
      subtitle={`Medições fora da faixa nos últimos ${dias} dias`}
      action={criticos > 0
        ? <Badge label={`${criticos} crítico${criticos > 1 ? 's' : ''}`} tint="danger" dot />
        : undefined}
      flush
    >
      {loading ? (
        <div style={mensagem}>Carregando alertas...</div>
      ) : erro ? (
        <div style={{ ...mensagem, color: 'var(--danger)' }}>{erro}</div>
      ) : alertas.length === 0 ? (
        <EmptyState
          icon={<CheckIcon />}
          title="Nenhum alerta no período"
          message="Todas as medições registradas ficaram dentro das faixas de referência."
        />
      ) : (
        <>
          {visiveis.map((a, i) => {
            const critico = a.severidade === 'critico'
            const cor = critico ? 'var(--danger)' : 'var(--warning)'
            const fundo = critico ? 'var(--danger-soft)' : 'var(--warning-soft)'

            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/pacientes/${a.pacienteId}/glicemia`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/pacientes/${a.pacienteId}/glicemia`) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 18px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'var(--surface-alt)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
              >
                <div style={{ ...valorBox, background: fundo, color: cor }}>
                  <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.1 }}>{a.valor}</span>
                  <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.85 }}>mg/dL</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                    {a.pacienteNome}
                  </div>
                  <div style={{ fontSize: 12.5, color: cor, fontWeight: 500, marginTop: 1 }}>
                    {CLASSIFICACAO_LABEL[a.classificacao]}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                    {MOMENTO_LABEL[a.momento] ?? a.momento} · alvo {a.faixaReferencia.min}–
                    {a.faixaReferencia.max} mg/dL
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatarQuando(a.dataHora)}
                </div>
              </div>
            )
          })}

          {alertas.length > limite && (
            <div style={{
              padding: '10px 18px', fontSize: 12, color: 'var(--text-muted)',
              borderTop: '1px solid var(--border)', textAlign: 'center',
            }}>
              + {alertas.length - limite} outros alertas no período
            </div>
          )}
        </>
      )}
    </Card>
  )
}

const mensagem: React.CSSProperties = {
  padding: '28px 18px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: 13,
}
const valorBox: React.CSSProperties = {
  width: 50,
  height: 44,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
