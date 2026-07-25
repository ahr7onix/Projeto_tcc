import { useEffect, useState } from 'react'
import { Badge, EmptyState } from './ui'
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
    <div style={wrapper}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Alertas glicêmicos
          </span>
          {criticos > 0 && <Badge label={`${criticos} crítico${criticos > 1 ? 's' : ''}`} tint="danger" />}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>últimos {dias} dias</span>
      </div>

      {loading ? (
        <div style={mensagem}>Carregando alertas...</div>
      ) : erro ? (
        <div style={{ ...mensagem, color: 'var(--danger)' }}>{erro}</div>
      ) : alertas.length === 0 ? (
        <div style={{ padding: '8px 20px 20px' }}>
          <EmptyState
            icon={<CheckIcon />}
            title="Nenhum alerta no período"
            message="Todas as medições registradas ficaram dentro das faixas de referência."
          />
        </div>
      ) : (
        <>
          {visiveis.map((a, i) => {
            const critico = a.severidade === 'critico'
            const cor = critico ? 'var(--danger)' : 'var(--warning)'
            const fundo = critico ? 'var(--danger-soft)' : 'var(--warning-soft)'

            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 20px',
                  borderBottom: i < visiveis.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ ...valorBox, background: fundo, color: cor }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{a.valor}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.8 }}>mg/dL</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {a.pacienteNome}
                  </div>
                  <div style={{ fontSize: 12, color: cor, fontWeight: 600, marginTop: 2 }}>
                    {CLASSIFICACAO_LABEL[a.classificacao]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {MOMENTO_LABEL[a.momento] ?? a.momento} · alvo {a.faixaReferencia.min}–
                    {a.faixaReferencia.max} mg/dL
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatarQuando(a.dataHora)}
                </div>
              </div>
            )
          })}

          {alertas.length > limite && (
            <div style={{ ...mensagem, fontSize: 12 }}>
              + {alertas.length - limite} outros alertas no período
            </div>
          )}
        </>
      )}
    </div>
  )
}

const wrapper: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border)',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-card)',
}
const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid var(--border)',
}
const mensagem: React.CSSProperties = {
  padding: '24px 20px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: 14,
}
const valorBox: React.CSSProperties = {
  width: 52,
  height: 46,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

function CheckIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
