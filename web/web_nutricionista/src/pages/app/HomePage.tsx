import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertBanner, Badge, Btn, Card, EmptyState, StatTile } from '../../components/ui'
import { api, extractError } from '../../lib/api'
import { resumoAlertas, type ResumoAlertas } from '../../lib/alertas'
import { assinarMensagens } from '../../lib/mensagens-stream'
import { contarNaoLidas } from '../../lib/mensagens'

interface Paciente {
  id: string
  nome: string
  glicemiaMedia: number | null
  ultimoRegistro: string | null
  status: 'ativo' | 'inativo'
}

interface Registro {
  id: string
  tipo: string
  valor: number | null
  alerta: { severidade: 'critico' | 'atencao' | 'normal' } | null
  dataHora: string
  pacienteId: string
}

type Periodo = 7 | 30 | 90

function saudacao() {
  const hora = new Date().getHours()
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
}

function dataCurta(data: Date) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function pctMudanca(atual: number, anterior: number) {
  if (anterior === 0) return atual > 0 ? null : 0
  return Math.round(((atual - anterior) / anterior) * 100)
}

export default function HomePage() {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [resumo7, setResumo7] = useState<ResumoAlertas | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setErro(null)
      const [pacientesRes, alertasRes, registrosRes, mensagens] = await Promise.all([
        api.get('/pacientes'),
        resumoAlertas(7),
        api.get('/registros', { params: { dias: 90, tipo: 'glicemia' } }),
        contarNaoLidas(),
      ])
      setPacientes(pacientesRes.data.data ?? [])
      setResumo7(alertasRes)
      setRegistros(registrosRes.data.data ?? [])
      setNaoLidas(mensagens)
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
    const timer = window.setInterval(carregar, 30_000)
    const cancelarMensagens = assinarMensagens(() => { void carregar() })
    return () => {
      window.clearInterval(timer)
      cancelarMensagens()
    }
  }, [carregar])

  const registrosPeriodo = useMemo(() => {
    const limite = Date.now() - periodo * 86400000
    return registros.filter((registro) => new Date(registro.dataHora).getTime() >= limite)
  }, [periodo, registros])

  const situacao = useMemo(() => {
    const ultimaPorPaciente = new Map<string, Registro>()
    registrosPeriodo.forEach((registro) => {
      if (!ultimaPorPaciente.has(registro.pacienteId)) ultimaPorPaciente.set(registro.pacienteId, registro)
    })
    let faixa = 0
    let atencao = 0
    let critico = 0
    pacientes.forEach((paciente) => {
      const registro = ultimaPorPaciente.get(paciente.id)
      if (!registro) return
      if (registro.alerta?.severidade === 'critico') critico += 1
      else if (registro.alerta?.severidade === 'atencao') atencao += 1
      else faixa += 1
    })
    const semRegistro = Math.max(pacientes.length - faixa - atencao - critico, 0)
    return [
      { label: 'Dentro da faixa', valor: faixa, cor: 'var(--success)' },
      { label: 'Precisam de atenção', valor: atencao, cor: 'var(--warning)' },
      { label: 'Situação crítica', valor: critico, cor: 'var(--danger)' },
      { label: 'Sem registros recentes', valor: semRegistro, cor: 'var(--text-muted)' },
    ]
  }, [pacientes, registrosPeriodo])

  const tendencia = useMemo(() => {
    const agora = Date.now()
    const inicio = agora - periodo * 86400000
    const porDia = new Map<string, { data: Date; fora: number; total: number }>()
    registros.filter((registro) => new Date(registro.dataHora).getTime() >= inicio).forEach((registro) => {
      const data = new Date(registro.dataHora)
      const chave = data.toISOString().slice(0, 10)
      const item = porDia.get(chave) ?? { data, fora: 0, total: 0 }
      item.total += 1
      if (registro.alerta?.severidade !== 'normal') item.fora += 1
      porDia.set(chave, item)
    })
    return [...porDia.values()].sort((a, b) => a.data.getTime() - b.data.getTime())
  }, [periodo, registros])

  const variacao = useMemo(() => {
    const fimAtual = Date.now()
    const inicioAtual = fimAtual - periodo * 86400000
    const inicioAnterior = inicioAtual - periodo * 86400000
    const fora = (inicio: number, fim: number) => registros.filter((registro) => {
      const quando = new Date(registro.dataHora).getTime()
      return quando >= inicio && quando < fim && registro.alerta?.severidade !== 'normal'
    }).length
    return pctMudanca(fora(inicioAtual, fimAtual), fora(inicioAnterior, inicioAtual))
  }, [periodo, registros])
  const semRegistro = situacao[3].valor
  const dentroFaixa = situacao[0].valor

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.date}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 style={styles.title}>{saudacao()}</h1>
          <p style={styles.subtitle}>Visão rápida do acompanhamento dos seus pacientes.</p>
        </div>
        <Btn variant="secondary" onClick={() => navigate('/pacientes')}>Ver pacientes</Btn>
      </header>

      {erro && <AlertBanner message={erro} />}

      <section style={styles.metrics} aria-label="Indicadores principais">
        <StatTile label="Total de pacientes" value={loading ? '—' : pacientes.length} icon={<PatientsIcon />} onClick={() => navigate('/pacientes')} />
        <StatTile label="Pacientes ativos" value={loading ? '—' : pacientes.filter((p) => p.status === 'ativo').length} icon={<PulseIcon />} tint="success" />
        <StatTile label="Precisam de atenção" value={loading ? '—' : semRegistro + (resumo7?.pacientes.length ?? 0)} icon={<AlertIcon />} tint={semRegistro > 0 ? 'warning' : 'success'} onClick={() => navigate('/acompanhamento')} />
        <StatTile label="Alertas glicêmicos" value={resumo7?.foraDaFaixa ?? '—'} icon={<AlertIcon />} tint={(resumo7?.foraDaFaixa ?? 0) > 0 ? 'danger' : 'success'} onClick={() => navigate('/registros')} />
        <StatTile label="Mensagens não lidas" value={naoLidas} icon={<MessageIcon />} tint={naoLidas > 0 ? 'warning' : 'neutral'} onClick={() => navigate('/mensagens')} />
      </section>

      <section style={styles.insight}>
        <div><div style={styles.kicker}>Visão geral</div><strong>{dentroFaixa > 0 && pacientes.length ? `${Math.round((dentroFaixa / pacientes.length) * 100)}% dos pacientes estão dentro da faixa.` : 'Ainda não há dados suficientes para um resumo.'}</strong></div>
        {variacao !== null && variacao !== 0 && <Badge label={`${variacao > 0 ? '↑' : '↓'} ${Math.abs(variacao)}% nos alertas glicêmicos`} tint={variacao > 0 ? 'danger' : 'success'} />}
      </section>

      <div className="home-dashboard-charts" style={styles.charts}>
        <Card title="Situação dos pacientes" subtitle="Última medição disponível no período selecionado.">
          {pacientes.length === 0 || registrosPeriodo.length === 0 ? <EmptyState icon={<ChartIcon />} title="Sem dados suficientes" message="Os indicadores aparecerão quando houver registros reais." /> : <div style={styles.distribution}>{situacao.map((item) => <div key={item.label} style={styles.barRow}><div style={styles.barLabel}><span>{item.label}</span><strong>{item.valor}</strong></div><div style={styles.track}><div style={{ ...styles.bar, width: `${Math.max((item.valor / pacientes.length) * 100, item.valor ? 4 : 0)}%`, background: item.cor }} /></div></div>)}</div>}
        </Card>

        <Card title="Evolução dos alertas" subtitle="Medições fora da faixa por dia." action={<div style={styles.periods}>{([7, 30, 90] as Periodo[]).map((item) => <button key={item} type="button" onClick={() => setPeriodo(item)} style={{ ...styles.periodButton, ...(periodo === item ? styles.periodActive : {}) }}>{item === 90 ? '3 meses' : `${item} dias`}</button>)}</div>}>
          <TrendChart pontos={tendencia.map((item) => ({ data: item.data.toISOString(), valor: item.fora }))} />
        </Card>
      </div>

      <div style={styles.footerLine}><span>Atualização automática a cada 30 segundos</span><span>{registrosPeriodo.length} medições analisadas · período de {periodo} dias</span></div>
    </div>
  )
}

function TrendChart({ pontos }: { pontos: { data: string; valor: number }[] }) {
  if (!pontos.length) return <div style={styles.chartEmpty}>Ainda não há dados suficientes para gerar este gráfico.</div>
  const max = Math.max(...pontos.map((p) => p.valor), 1)
  const width = 640
  const height = 210
  const points = pontos.map((p, index) => `${pontos.length === 1 ? width / 2 : 12 + index * ((width - 24) / (pontos.length - 1))},${height - 24 - (p.valor / max) * (height - 48)}`).join(' ')
  return <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Evolução diária dos alertas glicêmicos"><line x1="12" y1={height - 24} x2={width - 12} y2={height - 24} stroke="var(--border)" /><polyline points={points} fill="none" stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{pontos.map((p, i) => { const x = pontos.length === 1 ? width / 2 : 12 + i * ((width - 24) / (pontos.length - 1)); const y = height - 24 - (p.valor / max) * (height - 48); return <circle key={`${p.data}-${i}`} cx={x} cy={y} r="4" fill="var(--surface)" stroke="var(--danger)" strokeWidth="2" /> })}<text x="12" y={height - 6} fill="var(--text-muted)" fontSize="11">{dataCurta(new Date(pontos[0].data))}</text><text x={width - 12} y={height - 6} textAnchor="end" fill="var(--text-muted)" fontSize="11">{dataCurta(new Date(pontos[pontos.length - 1].data))}</text></svg>
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  header: { display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  date: { color: 'var(--text-muted)', fontSize: 12 },
  title: { color: 'var(--text)', fontSize: 26, fontWeight: 700, marginTop: 5 },
  subtitle: { color: 'var(--text-soft)', fontSize: 14, marginTop: 4 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 },
  insight: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', borderLeft: '3px solid var(--primary)', background: 'var(--surface-alt)', color: 'var(--text)', fontSize: 14, flexWrap: 'wrap' },
  kicker: { color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  charts: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 },
  distribution: { display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0' },
  barRow: { display: 'flex', flexDirection: 'column', gap: 7 },
  barLabel: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-soft)', fontSize: 13 },
  track: { height: 9, borderRadius: 99, background: 'var(--surface-alt)', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 99, transition: 'width .35s ease' },
  periods: { display: 'flex', gap: 4 },
  periodButton: { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer' },
  periodActive: { background: 'var(--primary-soft)', color: 'var(--primary)', borderColor: 'var(--primary)' },
  chartEmpty: { height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' },
  footerLine: { display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text-muted)', fontSize: 11, flexWrap: 'wrap' },
}

function PatientsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M17 5.5a3 3 0 0 1 0 5.5M18 14a5 5 0 0 1 2.5 4" /></svg> }
function PulseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 12h4l2-6 4 12 2-6h6" /></svg> }
function AlertIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="m10.3 3.9-8.4 14a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3l-8.4-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg> }
function MessageIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 15a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" /></svg> }
function ChartIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" /></svg> }
