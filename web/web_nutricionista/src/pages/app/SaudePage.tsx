import React, { useState, useMemo } from 'react'
import { Card, PageHeader, EmptyState, ProgressBar, Btn } from '../../components/ui'

type ImcStatus = { label: string; tint: string; tintBg: string }

function classificarImc(imc: number | null): ImcStatus | null {
  if (imc === null) return null
  if (imc < 18.5) return { label: 'Abaixo do peso', tint: 'var(--warning)', tintBg: 'var(--warning-soft)' }
  if (imc < 25) return { label: 'Peso normal', tint: 'var(--success)', tintBg: 'var(--success-soft)' }
  if (imc < 30) return { label: 'Sobrepeso', tint: 'var(--warning)', tintBg: 'var(--warning-soft)' }
  return { label: 'Obesidade', tint: 'var(--danger)', tintBg: 'var(--danger-soft)' }
}

const metas = [
  { titulo: 'Glicemia em jejum', meta: '< 130 mg/dL', progresso: 0 },
  { titulo: 'Hemoglobina glicada', meta: '< 7%', progresso: 0 },
  { titulo: 'Atividade física', meta: '150 min/semana', progresso: 0 },
]

const glicResumo = [
  { label: 'Média', valor: '--', unidade: 'mg/dL' },
  { label: 'Mínima', valor: '--', unidade: 'mg/dL' },
  { label: 'Máxima', valor: '--', unidade: 'mg/dL' },
  { label: 'No alvo', valor: '--', unidade: '%' },
]

export default function SaudePage() {
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')

  const imc = useMemo(() => {
    const p = Number(peso.replace(',', '.'))
    const a = Number(altura.replace(',', '.'))
    if (!p || !a || a <= 0) return null
    const result = p / (a * a)
    return Number.isFinite(result) ? result : null
  }, [peso, altura])

  const status = classificarImc(imc)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', fontSize: 15, color: 'var(--text)',
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div>
      <PageHeader
        eyebrow="Indicadores"
        title="Saúde"
        subtitle="Metas clínicas, antropometria e bem-estar dos pacientes."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {/* Próxima consulta */}
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'var(--primary)', borderRadius: 'var(--radius-lg)',
          padding: '18px 24px', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(124,58,237,0.28)',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
            <CalIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginBottom: 2 }}>Próxima consulta</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Nenhuma agendada</div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>→</div>
        </div>

        {/* Antropometria */}
        <Card title="Antropometria">
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)' }}>Peso (kg)</label>
              <input value={peso} onChange={e => setPeso(e.target.value)} type="number" placeholder="--" style={inputStyle} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)' }}>Altura (m)</label>
              <input value={altura} onChange={e => setAltura(e.target.value)} type="number" placeholder="--" step="0.01" style={inputStyle} />
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 16px', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-alt)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>IMC</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>
                {imc ? imc.toFixed(1) : '--'}
              </div>
            </div>
            {status ? (
              <div style={{ padding: '6px 14px', borderRadius: 999, background: status.tintBg }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: status.tint }}>{status.label}</span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Informe peso e altura</span>
            )}
          </div>
        </Card>

        {/* Resumo glicêmico */}
        <Card title="Resumo glicêmico" action={<span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>7 dias</span>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {glicResumo.map((g) => (
              <div key={g.label} style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--surface-alt)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{g.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                  {g.valor} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{g.unidade}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Metas clínicas */}
        <Card title="Metas clínicas" action={<Btn variant="ghost" size="sm">Editar</Btn>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {metas.map((m) => (
              <div key={m.titulo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.titulo}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{m.meta}</span>
                </div>
                <ProgressBar value={m.progresso} />
              </div>
            ))}
          </div>
        </Card>

        {/* Medicamentos */}
        <Card title="Medicamentos" action={
          <button style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 300 }}>+</button>
        }>
          <EmptyState
            icon={<MedIcon />}
            title="Nenhum medicamento ativo"
            message="Adicione os medicamentos do paciente para controle e lembretes."
          />
        </Card>
      </div>
    </div>
  )
}

function CalIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function MedIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> }
