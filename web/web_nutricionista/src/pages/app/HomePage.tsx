import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StatTile, AlertBanner, Card, Badge, Btn, EmptyState } from '../../components/ui'
import AlertasPanel from '../../components/AlertasPanel'
import { api, extractError } from '../../lib/api'
import { resumoAlertas, type ResumoAlertas } from '../../lib/alertas'
import { listarConversas, type Conversa } from '../../lib/mensagens'

interface Paciente {
  id: string
  nome: string
  email: string
  glicemiaMedia: number | null
  ultimoRegistro: string | null
  status: 'ativo' | 'inativo'
}

/** Dias sem registro a partir dos quais o paciente entra na lista de atenção. */
const DIAS_SEM_REGISTRO = 7

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function diasDesde(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function tempoRelativo(dateStr: string | null): string {
  const dias = diasDesde(dateStr)
  if (dias === null) return 'Sem registros'
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 7) return `Há ${dias} dias`
  if (dias < 30) return `Há ${Math.floor(dias / 7)} sem.`
  return `Há ${Math.floor(dias / 30)} meses`
}

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumo, setResumo] = useState<ResumoAlertas | null>(null)
  const [conversas, setConversas] = useState<Conversa[]>([])

  useEffect(() => {
    resumoAlertas(7).then(setResumo).catch(() => setResumo(null))
    listarConversas().then(setConversas).catch(() => setConversas([]))
  }, [])

  useEffect(() => {
    api.get('/pacientes')
      .then(({ data }) => setPacientes(data.data))
      .catch(err => setError(extractError(err)))
      .finally(() => setLoading(false))
  }, [])

  // "Dra. Camila Souza" cumprimenta a Camila, nao a "Dra." — o titulo e pulado.
  const TITULOS = ['dr', 'dr.', 'dra', 'dra.', 'sr', 'sr.', 'sra', 'sra.']
  const primeiroNome = (user?.nome ?? 'Nutricionista')
    .split(' ')
    .filter(parte => parte && !TITULOS.includes(parte.toLowerCase()))[0] ?? 'Nutricionista'

  const ativos = pacientes.filter(p => p.status === 'ativo').length

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  // So a primeira letra sobe: `capitalize` no CSS viraria "Sabado, 22 De Agosto".
  const dataHoje = hoje.charAt(0).toUpperCase() + hoje.slice(1)

  // Quem parou de registrar é o que exige ação da nutricionista — mais do que
  // qualquer média geral.
  const semRegistro = pacientes
    .filter(p => {
      const d = diasDesde(p.ultimoRegistro)
      return d === null || d >= DIAS_SEM_REGISTRO
    })
    .sort((a, b) => (a.ultimoRegistro ?? '').localeCompare(b.ultimoRegistro ?? ''))

  const naoLidas = conversas.reduce((total, c) => total + c.naoLidas, 0)
  const conversasPendentes = conversas.filter(c => c.naoLidas > 0)
  const conversasRecentes = (conversasPendentes.length ? conversasPendentes : conversas).slice(0, 4)

  const mediaGeral = (() => {
    const comMedia = pacientes.filter(p => p.glicemiaMedia)
    if (!comMedia.length) return null
    return (comMedia.reduce((a, p) => a + (p.glicemiaMedia ?? 0), 0) / comMedia.length).toFixed(0)
  })()

  const recentes = [...pacientes]
    .filter(p => p.ultimoRegistro)
    .sort((a, b) => (b.ultimoRegistro ?? '').localeCompare(a.ultimoRegistro ?? ''))
    .slice(0, 5)

  const criticos = resumo?.criticos ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Cabeçalho sem caixa colorida: a cor da tela fica reservada aos dados. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
            {dataHoje}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>
            {saudacao()}, {primeiroNome}
          </h1>
        </div>
        <Btn variant="secondary" onClick={() => navigate('/pacientes')}>Ver todos os pacientes</Btn>
      </div>

      {error && <AlertBanner message={error} />}

      {/* As quatro métricas que mudam o que a nutricionista faz agora. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <StatTile
          label="Pacientes ativos"
          value={loading ? '—' : ativos}
          icon={<PatientsIcon />}
          tint="primary"
          sub={pacientes.length ? `${pacientes.length} no total` : undefined}
          onClick={() => navigate('/pacientes')}
        />
        <StatTile
          label="Alertas críticos (7d)"
          value={resumo ? criticos : '—'}
          icon={<AlertIcon />}
          tint={criticos > 0 ? 'danger' : 'success'}
          sub={resumo ? `${resumo.foraDaFaixa} fora da faixa` : undefined}
          onClick={() => navigate('/registros')}
        />
        <StatTile
          label="Mensagens não lidas"
          value={naoLidas}
          icon={<MensagensIcon />}
          tint={naoLidas > 0 ? 'warning' : 'neutral'}
          sub={conversasPendentes.length ? `${conversasPendentes.length} conversa(s)` : undefined}
          onClick={() => navigate('/mensagens')}
        />
        <StatTile
          label={`Sem registro há ${DIAS_SEM_REGISTRO}+ dias`}
          value={loading ? '—' : semRegistro.length}
          icon={<RelogioIcon />}
          tint={semRegistro.length > 0 ? 'warning' : 'success'}
          sub={pacientes.length ? `de ${pacientes.length} pacientes` : undefined}
        />
      </div>

      {/* Métricas de contexto ficam numa linha discreta, não em cartões. */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 18px',
        fontSize: 12.5, color: 'var(--text-muted)',
        padding: '0 2px',
      }}>
        <span>
          Média glicêmica dos pacientes (30d):{' '}
          <strong style={{ color: 'var(--text-soft)', fontWeight: 600 }}>
            {mediaGeral ? `${mediaGeral} mg/dL` : '—'}
          </strong>
        </span>
        <span>
          Medições na faixa (7d):{' '}
          <strong style={{ color: 'var(--text-soft)', fontWeight: 600 }}>
            {resumo?.percentualNaFaixa != null ? `${resumo.percentualNaFaixa}%` : '—'}
          </strong>
        </span>
        <span>
          Registros no período:{' '}
          <strong style={{ color: 'var(--text-soft)', fontWeight: 600 }}>
            {resumo ? resumo.totalRegistros : '—'}
          </strong>
        </span>
      </div>

      <div className="grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <AlertasPanel dias={7} />

          <Card
            title="Precisam de atenção"
            subtitle={`Pacientes sem registro há ${DIAS_SEM_REGISTRO} dias ou mais`}
            flush
          >
            {loading ? (
              <Carregando />
            ) : semRegistro.length === 0 ? (
              <EmptyState
                icon={<CheckIcon />}
                title="Todos em dia"
                message="Todos os pacientes registraram algo na última semana."
              />
            ) : (
              semRegistro.slice(0, 5).map((p, i) => (
                <Linha key={p.id} primeira={i === 0} onClick={() => navigate(`/pacientes/${p.id}/informacoes`)}>
                  <Avatar nome={p.nome} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={nomeStyle}>{p.nome}</div>
                    <div style={subStyle}>{p.email}</div>
                  </div>
                  <Badge
                    label={tempoRelativo(p.ultimoRegistro)}
                    tint={p.ultimoRegistro ? 'warning' : 'danger'}
                  />
                </Linha>
              ))
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Card
            title="Mensagens"
            action={<LinkBtn onClick={() => navigate('/mensagens')}>Abrir</LinkBtn>}
            flush
          >
            {conversasRecentes.length === 0 ? (
              <EmptyState
                icon={<MensagensIcon />}
                title="Nenhuma conversa"
                message="As mensagens trocadas com os pacientes aparecem aqui."
              />
            ) : (
              conversasRecentes.map((c, i) => (
                <Linha key={c.vinculoId} primeira={i === 0} onClick={() => navigate('/mensagens')}>
                  <Avatar nome={c.contraparteNome} destaque={c.naoLidas > 0} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={nomeStyle}>{c.contraparteNome}</div>
                    <div style={{ ...subStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.ultimaMensagem ?? 'Sem mensagens'}
                    </div>
                  </div>
                  {c.naoLidas > 0 && <Badge label={String(c.naoLidas)} tint="primary" />}
                </Linha>
              ))
            )}
          </Card>

          <Card
            title="Atividade recente"
            subtitle="Últimos pacientes com registro"
            flush
          >
            {loading ? (
              <Carregando />
            ) : recentes.length === 0 ? (
              <EmptyState
                icon={<PatientsIcon />}
                title="Nenhum registro ainda"
                message="Assim que os pacientes começarem a registrar, eles aparecem aqui."
              />
            ) : (
              recentes.map((p, i) => (
                <Linha key={p.id} primeira={i === 0} onClick={() => navigate(`/pacientes/${p.id}/glicemia`)}>
                  <Avatar nome={p.nome} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={nomeStyle}>{p.nome}</div>
                    <div style={subStyle}>
                      {p.glicemiaMedia ? `Média ${Math.round(p.glicemiaMedia)} mg/dL` : 'Sem média'}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {tempoRelativo(p.ultimoRegistro)}
                  </span>
                </Linha>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ─── Peças da tela ─── */

const nomeStyle: React.CSSProperties = {
  fontSize: 13.5, fontWeight: 600, color: 'var(--text)',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
}
const subStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }

function Linha({ children, primeira, onClick }: { children: React.ReactNode; primeira: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 18px',
        borderTop: primeira ? 'none' : '1px solid var(--border)',
        cursor: 'pointer', transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-alt)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      {children}
    </div>
  )
}

function Avatar({ nome, destaque }: { nome: string; destaque?: boolean }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: destaque ? 'var(--primary-soft)' : 'var(--surface-alt)',
      border: `1px solid ${destaque ? 'var(--primary-soft)' : 'var(--border)'}`,
      color: destaque ? 'var(--primary)' : 'var(--text-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: 13, flexShrink: 0,
    }}>{nome.charAt(0).toUpperCase()}</div>
  )
}

function LinkBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 13, fontWeight: 500, color: 'var(--primary)',
        background: 'none', border: 'none', padding: '2px 4px',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
      }}
    >{children}</button>
  )
}

function Carregando() {
  return (
    <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Carregando...
    </div>
  )
}

/* ─── Ícones ─── */

function PatientsIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.9"/><path d="M18 14.6a5.5 5.5 0 0 1 2.5 4.6"/></svg> }
function AlertIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function MensagensIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 15a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8.5 9.5h7"/><path d="M8.5 13h4"/></svg> }
function RelogioIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg> }
function CheckIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
