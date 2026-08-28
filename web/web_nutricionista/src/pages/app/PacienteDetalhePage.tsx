import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertBanner, Paginacao, usePaginacao } from '../../components/ui'
import { api, extractError } from '../../lib/api'
import s from './PacienteDetalhePage.module.css'

// Cada seção é uma tela própria, com URL própria: o nutricionista pode voltar
// pelo botão do navegador e mandar o link de uma seção específica para alguém.
type Secao = 'informacoes' | 'glicemia' | 'alimentacao' | 'saude'

const SECOES: Secao[] = ['informacoes', 'glicemia', 'alimentacao', 'saude']

const momentoLabel: Record<string, string> = {
  jejum: 'Jejum',
  pre: 'Pré-refeição',
  pos: 'Pós-refeição',
  aleatorio: 'Aleatório',
}

const refeicaoLabel: Record<string, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

function imcStatus(imc: number) {
  if (imc < 18.5) return { label: 'Abaixo do peso', color: 'var(--primary)', fill: imc / 40 }
  if (imc < 25) return { label: 'Peso normal', color: 'var(--success)', fill: imc / 40 }
  if (imc < 30) return { label: 'Sobrepeso', color: 'var(--warning)', fill: imc / 40 }
  return { label: 'Obesidade', color: 'var(--danger)', fill: Math.min(imc / 40, 1) }
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function PacienteDetalhePage() {
  const { pacienteId = '', secao } = useParams<{ pacienteId: string; secao: Secao }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [paciente, setPaciente] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [saude, setSaude] = useState<any[]>([])

  // URL sem seção (ou com uma seção inexistente) abre nas informações em vez
  // de deixar a tela em branco.
  const abaAtual: Secao = SECOES.includes(secao as Secao) ? (secao as Secao) : 'informacoes'

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      try {
        setLoading(true)
        setErro(null)
        const [pacRes, regRes, saudeRes] = await Promise.all([
          api.get(`/pacientes/${pacienteId}`),
          api.get(`/registros?pacienteId=${pacienteId}`),
          api.get(`/saude/${pacienteId}`),
        ])
        if (cancelado) return
        setPaciente(pacRes.data)
        setRegistros(regRes.data.data || [])
        setSaude(saudeRes.data.data || [])
      } catch (err) {
        if (!cancelado) setErro(extractError(err))
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [pacienteId])

  const regsGlicemia = registros.filter((r) => r.tipo === 'glicemia')
  const regsAlimentacao = registros.filter((r) => r.tipo === 'refeicao')
  const ultimaSaude = saude.length > 0 ? saude[saude.length - 1] : null

  // Os hooks precisam vir antes de qualquer return condicional: a ordem de
  // chamada tem que ser a mesma em todo render.
  const pagGlicemia = usePaginacao(regsGlicemia, 15, abaAtual)
  const pagAlimentacao = usePaginacao(regsAlimentacao, 15, abaAtual)
  const pagSaude = usePaginacao([...saude].reverse(), 10, abaAtual)

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Carregando ficha do paciente…
      </div>
    )
  }

  if (erro || !paciente) {
    return (
      <div>
        <button className={s.voltar} onClick={() => navigate('/pacientes')}>
          <SetaIcon /> Voltar para pacientes
        </button>
        <AlertBanner message={erro ?? 'Paciente não encontrado.'} />
      </div>
    )
  }

  const ativo = paciente.status === 'ativo'

  const navItens: { key: Secao; label: string; icon: React.ReactElement; count?: number }[] = [
    { key: 'informacoes', label: 'Informações', icon: <InfoIcon /> },
    { key: 'glicemia', label: 'Glicemia', icon: <DropIcon />, count: regsGlicemia.length },
    { key: 'alimentacao', label: 'Alimentação', icon: <ForkIcon />, count: regsAlimentacao.length },
    { key: 'saude', label: 'Saúde', icon: <HeartIcon />, count: saude.length },
  ]

  const cabecalho: Record<Secao, { title: string; subtitle: string }> = {
    informacoes: {
      title: 'Informações do paciente',
      subtitle: 'Dados cadastrais e resumo clínico',
    },
    glicemia: {
      title: 'Histórico de glicemia',
      subtitle: `${regsGlicemia.length} registro${regsGlicemia.length !== 1 ? 's' : ''} encontrado${regsGlicemia.length !== 1 ? 's' : ''}`,
    },
    alimentacao: {
      title: 'Diário de refeições',
      subtitle: `${regsAlimentacao.length} refeição${regsAlimentacao.length !== 1 ? 'ões' : ''} registrada${regsAlimentacao.length !== 1 ? 's' : ''}`,
    },
    saude: {
      title: 'Dados de saúde',
      subtitle: ultimaSaude
        ? `${saude.length} medição${saude.length !== 1 ? 'ões' : ''} registrada${saude.length !== 1 ? 's' : ''}`
        : 'Nenhuma medição registrada',
    },
  }

  return (
    <div>
      <button className={s.voltar} onClick={() => navigate('/pacientes')}>
        <SetaIcon /> Voltar para pacientes
      </button>

      <div className={s.pacienteHeader}>
        <div className={s.avatar}>{paciente.nome.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className={s.pacienteNome}>{paciente.nome}</h2>
          <div className={s.pacienteEmail}>{paciente.email}</div>
        </div>
        <span className={`${s.badge} ${ativo ? s.badgeSuccess : s.badgeWarning}`}>
          {ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <nav className={s.nav}>
        {navItens.map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(`/pacientes/${pacienteId}/${item.key}`)}
            aria-current={abaAtual === item.key ? 'page' : undefined}
            className={`${s.navItem} ${abaAtual === item.key ? s.navItemActive : ''}`}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span className={s.navCount}>{item.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ marginBottom: 18 }}>
        <h3 className={s.sectionTitle}>{cabecalho[abaAtual].title}</h3>
        <p className={s.sectionSubtitle}>{cabecalho[abaAtual].subtitle}</p>
      </div>

      {/* ── INFORMAÇÕES ── */}
      {abaAtual === 'informacoes' && (
        <div>
          <div className={s.statGrid} style={{ marginBottom: 20 }}>
            <div className={s.statCard}>
              <div className={s.statLabel}>Média glicêmica</div>
              <div
                className={s.statValue}
                style={{
                  color: paciente.glicemiaMedia > 126
                    ? 'var(--danger)'
                    : paciente.glicemiaMedia
                      ? 'var(--success)'
                      : 'var(--text-muted)',
                }}
              >
                {paciente.glicemiaMedia ?? '—'}
                {paciente.glicemiaMedia && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>mg/dL</span>
                )}
              </div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Registros</div>
              <div className={s.statValue}>{registros.length}</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Último registro</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 6 }}>
                {paciente.ultimoRegistro
                  ? new Date(paciente.ultimoRegistro).toLocaleDateString('pt-BR')
                  : '—'}
              </div>
            </div>
          </div>

          <div className={s.profileSection}>
            <div className={s.profileRow}>
              <div className={s.profileIcon}><PersonIcon /></div>
              <div>
                <div className={s.profileFieldLabel}>Nome completo</div>
                <div className={s.profileFieldValue}>{paciente.nome}</div>
              </div>
            </div>
            <div className={s.profileRow}>
              <div className={s.profileIcon}><MailIcon /></div>
              <div>
                <div className={s.profileFieldLabel}>E-mail de contato</div>
                <div className={s.profileFieldValue}>{paciente.email}</div>
              </div>
            </div>
            <div className={s.profileRow}>
              <div className={s.profileIcon}><StatusIcon /></div>
              <div>
                <div className={s.profileFieldLabel}>Status da conta</div>
                <div className={s.profileFieldValue}>
                  <span className={`${s.badge} ${ativo ? s.badgeSuccess : s.badgeWarning}`}>
                    {ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GLICEMIA ── */}
      {abaAtual === 'glicemia' && (
        regsGlicemia.length > 0 ? (
          <div>
            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Momento</th>
                    <th>Valor</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {pagGlicemia.visiveis.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dataHora(r.criadoEm)}</td>
                      <td>{momentoLabel[r.momento] ?? r.momento ?? '—'}</td>
                      <td>
                        <span className={`${s.badge} ${r.valor > 126 ? s.badgeDanger : s.badgeSuccess}`}>
                          {r.valor} mg/dL
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao
              pagina={pagGlicemia.pagina}
              totalPaginas={pagGlicemia.totalPaginas}
              total={pagGlicemia.total}
              primeiro={pagGlicemia.primeiro}
              ultimo={pagGlicemia.ultimo}
              onChange={pagGlicemia.irPara}
              rotulo="registros"
            />
          </div>
        ) : (
          <div className={s.empty}>
            <div className={s.emptyIcon}><DropIcon /></div>
            <p className={s.emptyTitle}>Nenhum registro de glicemia</p>
            <p className={s.emptyMsg}>O paciente ainda não enviou medições pelo aplicativo.</p>
          </div>
        )
      )}

      {/* ── ALIMENTAÇÃO ── */}
      {abaAtual === 'alimentacao' && (
        regsAlimentacao.length > 0 ? (
          <div>
            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Refeição</th>
                    <th>Descrição</th>
                    <th>Carb.</th>
                  </tr>
                </thead>
                <tbody>
                  {pagAlimentacao.visiveis.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dataHora(r.criadoEm)}</td>
                      <td style={{ fontWeight: 600 }}>{refeicaoLabel[r.tipo_refeicao] ?? r.tipo_refeicao ?? '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.descricao || '—'}</td>
                      <td>{r.carboidratos ? `${r.carboidratos} g` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao
              pagina={pagAlimentacao.pagina}
              totalPaginas={pagAlimentacao.totalPaginas}
              total={pagAlimentacao.total}
              primeiro={pagAlimentacao.primeiro}
              ultimo={pagAlimentacao.ultimo}
              onChange={pagAlimentacao.irPara}
              rotulo="refeições"
            />
          </div>
        ) : (
          <div className={s.empty}>
            <div className={s.emptyIcon}><ForkIcon /></div>
            <p className={s.emptyTitle}>Nenhuma refeição registrada</p>
            <p className={s.emptyMsg}>O paciente ainda não registrou refeições no aplicativo.</p>
          </div>
        )
      )}

      {/* ── SAÚDE ── */}
      {abaAtual === 'saude' && (
        ultimaSaude ? (
          <div>
            <div className={s.statGrid} style={{ marginBottom: 20 }}>
              <div className={s.statCard}>
                <div className={s.statLabel}>Peso</div>
                <div className={s.statValue}>
                  {ultimaSaude.peso}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>kg</span>
                </div>
              </div>
              <div className={s.statCard}>
                <div className={s.statLabel}>Altura</div>
                <div className={s.statValue}>
                  {ultimaSaude.altura}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>cm</span>
                </div>
              </div>
              <div className={s.statCard}>
                <div className={s.statLabel}>IMC</div>
                <div className={s.statValue}>{ultimaSaude.imc}</div>
                {ultimaSaude.imc && (() => {
                  const st = imcStatus(Number(ultimaSaude.imc))
                  return (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, color: st.color, marginTop: 4 }}>{st.label}</div>
                      <div className={s.imcBar}>
                        <div className={s.imcFill} style={{ width: `${st.fill * 100}%`, background: st.color }} />
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Histórico completo, da medição mais recente para a mais antiga. */}
            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Peso</th>
                    <th>Altura</th>
                    <th>IMC</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {pagSaude.visiveis.map((m: any, i: number) => (
                    <tr key={m.id ?? i}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(m.criadoEm).toLocaleDateString('pt-BR')}
                      </td>
                      <td>{m.peso ? `${m.peso} kg` : '—'}</td>
                      <td>{m.altura ? `${m.altura} cm` : '—'}</td>
                      <td>{m.imc ?? '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao
              pagina={pagSaude.pagina}
              totalPaginas={pagSaude.totalPaginas}
              total={pagSaude.total}
              primeiro={pagSaude.primeiro}
              ultimo={pagSaude.ultimo}
              onChange={pagSaude.irPara}
              rotulo="medições"
            />
          </div>
        ) : (
          <div className={s.empty}>
            <div className={s.emptyIcon}><HeartIcon /></div>
            <p className={s.emptyTitle}>Sem dados antropométricos</p>
            <p className={s.emptyMsg}>O paciente ainda não registrou peso, altura ou IMC no aplicativo.</p>
          </div>
        )
      )}
    </div>
  )
}

function SetaIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> }
function InfoIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> }
function DropIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> }
function ForkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> }
function HeartIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> }
function PersonIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function MailIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function StatusIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
