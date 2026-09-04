import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertBanner, Btn, Card, Paginacao, usePaginacao } from '../../components/ui'
import GraficoLinha, { type PontoGrafico } from '../../components/GraficoLinha'
import SaudePaciente from '../../components/SaudePaciente'
import { CLASSIFICACAO_LABEL, MOMENTO_LABEL, type Classificacao, type Severidade } from '../../lib/alertas'
import { api, extractError } from '../../lib/api'
import { contar } from '../../lib/texto'
import s from './PacienteDetalhePage.module.css'

// Cada seção é uma tela própria, com URL própria: o nutricionista pode voltar
// pelo botão do navegador e mandar o link de uma seção específica para alguém.
type Secao = 'informacoes' | 'glicemia' | 'alimentacao' | 'saude'

const SECOES: Secao[] = ['informacoes', 'glicemia', 'alimentacao', 'saude']

const refeicaoLabel: Record<string, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

/**
 * A cor do registro sai da avaliação que a API devolve com ele, e não de um
 * limite fixo. Antes a tela pintava de vermelho tudo acima de 126 mg/dL: 143
 * antes de uma refeição (alvo 70-180) aparecia como problema, e 62 de
 * madrugada -- hipoglicemia -- aparecia em verde.
 */
function classeDaSeveridade(severidade: Severidade | undefined): string {
  if (severidade === 'critico') return s.badgeDanger
  if (severidade === 'atencao') return s.badgeWarning
  return s.badgeSuccess
}

/** Os registros chegam sem tipo do `/registros`, entao a chave entra como texto. */
function rotuloClassificacao(classificacao: string): string {
  return CLASSIFICACAO_LABEL[classificacao as Classificacao] ?? classificacao
}

function corDaSeveridade(severidade: Severidade | undefined): string | undefined {
  if (severidade === 'critico') return 'var(--danger)'
  if (severidade === 'atencao') return 'var(--warning)'
  return undefined
}

/** Faixa geral usada como fundo do gráfico; a de cada momento vai na tabela. */
const FAIXA_GERAL = { min: 70, max: 180 }

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function PacienteDetalhePage() {
  const { pacienteId = '', secao } = useParams<{ pacienteId: string; secao: Secao }>()
  const navigate = useNavigate()
  const location = useLocation()
  const raiz = location.pathname.startsWith('/acompanhamento') ? '/acompanhamento' : '/pacientes'

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
          api.get(`/antropometria?pacienteId=${pacienteId}`),
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
  // A API devolve as medições da mais recente para a mais antiga.
  const ultimaSaude = saude.length > 0 ? saude[0] : null

  // Os hooks precisam vir antes de qualquer return condicional: a ordem de
  // chamada tem que ser a mesma em todo render.
  const pagGlicemia = usePaginacao(regsGlicemia, 15, abaAtual)

  // A API entrega do mais recente para o mais antigo; o gráfico lê ao contrário.
  // 30 pontos já enchem a largura do cartão -- mais que isso vira borrão.
  const pontosGlicemia = useMemo<PontoGrafico[]>(
    () =>
      regsGlicemia
        .filter((r) => r.valor != null && r.dataHora)
        .slice(0, 30)
        .reverse()
        .map((r) => ({
          data: r.dataHora,
          valor: Number(r.valor),
          cor: corDaSeveridade(r.alerta?.severidade),
        })),
    [regsGlicemia],
  )
  const pagAlimentacao = usePaginacao(regsAlimentacao, 15, abaAtual)

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
        <button className={s.voltar} onClick={() => navigate(raiz)}>
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
      subtitle: contar(regsAlimentacao.length, 'refeição registrada', 'refeições registradas'),
    },
    saude: {
      title: 'Dados de saúde',
      subtitle: ultimaSaude
        ? contar(saude.length, 'medição registrada', 'medições registradas')
        : 'Nenhuma medição registrada',
    },
  }

  return (
    <div>
      <button className={s.voltar} onClick={() => navigate(raiz)}>
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
        <Btn size="sm" onClick={() => navigate(`${raiz}/${pacienteId}/anotacoes`)}>
          Novo registro
        </Btn>
      </div>

      <nav className={s.nav}>
        {navItens.map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(`${raiz}/${pacienteId}/${item.key}`)}
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
            <Card
              title="Evolução da glicemia (mg/dL)"
              subtitle="Últimas 30 medições, com a faixa de referência geral (70–180 mg/dL) ao fundo. Cada ponto é avaliado pelo alvo do seu momento, que a tabela mostra abaixo."
              style={{ marginBottom: 20 }}
            >
              <GraficoLinha
                pontos={pontosGlicemia}
                unidade=" mg/dL"
                faixa={FAIXA_GERAL}
                altura={240}
                vazio="Registre ao menos uma medição para ver a evolução."
              />
            </Card>

            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Momento</th>
                    <th>Valor</th>
                    <th>Situação</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {pagGlicemia.visiveis.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dataHora(r.dataHora)}</td>
                      <td>{MOMENTO_LABEL[r.momento] ?? r.momento ?? '—'}</td>
                      <td>
                        <span className={`${s.badge} ${classeDaSeveridade(r.alerta?.severidade)}`}>
                          {r.valor} mg/dL
                        </span>
                      </td>
                      <td>
                        {r.alerta ? (
                          <>
                            <div style={{ fontSize: 13 }}>{rotuloClassificacao(r.alerta.classificacao)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              alvo {r.alerta.faixaReferencia.min}–{r.alerta.faixaReferencia.max}
                            </div>
                          </>
                        ) : '—'}
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
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {pagAlimentacao.visiveis.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dataHora(r.dataHora)}</td>
                      <td style={{ fontWeight: 600 }}>{refeicaoLabel[r.tipoRefeicao] ?? r.tipoRefeicao ?? '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.descricao || '—'}</td>
                      <td>{r.carboidratos ? `${r.carboidratos} g` : '—'}</td>
                      {/* Carboidrato calculado pela tabela e carboidrato que o
                          paciente estimou de cabeça não têm o mesmo peso na
                          consulta: a coluna diz de onde veio o número. */}
                      <td>
                        {r.alimento ? (
                          <>
                            <span className={`${s.badge} ${s.badgeSuccess}`}>Tabela</span>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              {r.alimento.nome}
                              {r.quantidadeG ? ` · ${r.quantidadeG} g` : ''}
                            </div>
                          </>
                        ) : r.carboidratos ? (
                          <span className={`${s.badge} ${s.badgeWarning}`}>Estimado</span>
                        ) : '—'}
                      </td>
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
      {/* Medidas, evolução em gráfico, medicamentos e bem-estar: tudo o que a
          aba mostra vem do painel, que também sabe cadastrar uma nova medida. */}
      {abaAtual === 'saude' && (
        <SaudePaciente pacienteId={pacienteId} pacienteNome={paciente.nome} />
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
