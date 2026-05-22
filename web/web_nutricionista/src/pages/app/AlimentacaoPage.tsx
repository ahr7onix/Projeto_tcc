import { Card, PageHeader, EmptyState, ProgressBar } from '../../components/ui'

const refeicoes = [
  { nome: 'Café da manhã', horario: '07:30', status: 'feita', icon: '☕' },
  { nome: 'Almoço', horario: '12:00', status: 'agora', icon: '🍽️' },
  { nome: 'Lanche', horario: '16:00', status: 'pendente', icon: '🥗' },
  { nome: 'Jantar', horario: '19:30', status: 'pendente', icon: '🌙' },
]

function statusStyle(status: string) {
  if (status === 'feita') return { bg: 'var(--success-soft)', fg: 'var(--success)', label: 'Feita' }
  if (status === 'agora') return { bg: 'var(--primary-soft)', fg: 'var(--primary)', label: 'Agora' }
  return { bg: 'var(--surface-alt)', fg: 'var(--text-muted)', label: 'Pendente' }
}

export default function AlimentacaoPage() {
  const feitas = refeicoes.filter(r => r.status === 'feita').length
  const total = refeicoes.length

  return (
    <div>
      <PageHeader
        eyebrow="Plano de hoje"
        title="Alimentação"
        subtitle="Acompanhe as refeições, planos alimentares e receitas dos pacientes."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {/* Plano */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Plano alimentar</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Padrão · controle glicêmico</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{feitas}/{total}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>refeições</div>
            </div>
          </div>
          <ProgressBar value={feitas / total} />
        </Card>

        {/* Refeições */}
        <Card title="Refeições de hoje" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {refeicoes.map((r, i) => {
              const t = statusStyle(r.status)
              return (
                <div key={r.nome} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 0',
                  borderBottom: i < refeicoes.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>{r.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{r.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.horario}</div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 999,
                    background: t.bg, color: t.fg,
                    fontSize: 12, fontWeight: 700,
                  }}>{t.label}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Receitas */}
        <Card title="Receitas indicadas">
          <EmptyState
            icon={<BookIcon />}
            title="Nenhuma receita cadastrada"
            message="Adicione receitas personalizadas alinhadas com o plano do paciente."
          />
        </Card>

        {/* Restrições */}
        <Card title="Restrições alimentares">
          <EmptyState
            icon={<AlertIcon />}
            title="Nenhuma restrição cadastrada"
            message="Registre alergias ou intolerâncias para personalizar o plano."
          />
        </Card>
      </div>
    </div>
  )
}

function BookIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function AlertIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
