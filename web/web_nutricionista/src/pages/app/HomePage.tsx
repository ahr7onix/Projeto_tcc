import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Card, StatTile, EmptyState, PageHeader, Btn } from '../../components/ui'
import { api } from '../../lib/api'

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dataHoje() {
  const d = new Date()
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${meses[d.getMonth()]}`
}

const quickActions = [
  { href: '/pacientes', label: 'Ver pacientes', desc: 'Acompanhe a lista de pacientes cadastrados', icon: PatientsIcon, tint: 'var(--primary-soft)', fg: 'var(--primary)' },
  { href: '/registros', label: 'Registros recentes', desc: 'Glicemia e refeições reportados', icon: RecordsIcon, tint: 'var(--success-soft)', fg: 'var(--success)' },
  { href: '/alimentacao', label: 'Plano alimentar', desc: 'Gerencie refeições e restrições', icon: FoodIcon, tint: 'var(--warning-soft)', fg: 'var(--warning)' },
  { href: '/saude', label: 'Indicadores de saúde', desc: 'IMC, metas e resumo glicêmico', icon: HeartIcon, tint: 'var(--danger-soft)', fg: 'var(--danger)' },
]

interface Stats {
  pacientesAtivos: number
  registrosHoje: number
  comAlertas: number
}

export default function HomePage() {
  const { user } = useAuth()
  const primeiroNome = (user?.nome ?? 'Nutricionista').split(' ')[0]
  const [stats, setStats] = useState<Stats>({ pacientesAtivos: 0, registrosHoje: 0, comAlertas: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [pacRes, regRes] = await Promise.all([
          api.get('/pacientes'),
          api.get('/registros', { params: { dias: '1' } }),
        ])
        setStats({
          pacientesAtivos: pacRes.data.meta.ativos,
          registrosHoje: regRes.data.meta.total,
          comAlertas: pacRes.data.meta.comAlertas,
        })
      } catch {
        // stats ficam em 0 silenciosamente
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div>
      <PageHeader
        eyebrow={dataHoje()}
        title={`${saudacao()}, ${primeiroNome}`}
        subtitle="Aqui está um panorama da sua clínica hoje."
        action={
          <Link to="/pacientes">
            <Btn icon={<PlusIcon />}>Novo paciente</Btn>
          </Link>
        }
      />

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatTile label="Pacientes ativos" value={loading ? '—' : String(stats.pacientesAtivos)} tint="primary" icon={<PatientsIcon />} />
        <StatTile label="Registros hoje" value={loading ? '—' : String(stats.registrosHoje)} tint="success" icon={<RecordsIcon />} />
        <StatTile label="Consultas esta semana" value="0" tint="warning" icon={<CalIcon />} />
        <StatTile label="Com alertas glicêmicos" value={loading ? '—' : String(stats.comAlertas)} tint="danger" icon={<AlertIcon />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="Acesso rápido" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {quickActions.map((a) => (
              <Link key={a.href} to={a.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '16px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  transition: 'border-color 0.15s, box-shadow 0.15s', cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(124,58,237,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: a.tint, color: a.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <a.icon />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Atividade recente" style={{ gridColumn: '1 / -1' }}>
          <EmptyState
            icon={<ClockIcon />}
            title="Nenhuma atividade ainda"
            message="Os registros dos seus pacientes aparecerão aqui assim que começarem a usar o aplicativo."
          />
        </Card>
      </div>
    </div>
  )
}

function PlusIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function PatientsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function RecordsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> }
function FoodIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> }
function HeartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> }
function CalIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function AlertIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function ClockIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
