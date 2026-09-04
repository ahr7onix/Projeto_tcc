import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CalendarioGlicemia from '../../components/CalendarioGlicemia'
import { AlertBanner, Badge, Btn, Card, EmptyState, PageHeader } from '../../components/ui'
import { CLASSIFICACAO_LABEL, MOMENTO_LABEL, type Classificacao } from '../../lib/alertas'
import { extractError } from '../../lib/api'
import { gerarRelatorio, type Relatorio, type RelatorioRegistroGlicemia, type RelatorioRegistroRefeicao } from '../../lib/relatorios'
import { contar } from '../../lib/texto'

const DIAS_HISTORICO = 3650
const refeicaoLabel: Record<string, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

/** A API guarda a chave do enum; o relatorio e lido por gente. */
const diabetesLabel: Record<string, string> = {
  tipo1: 'Tipo 1',
  tipo2: 'Tipo 2',
  gestacional: 'Gestacional',
  pre: 'Pré-diabetes',
  outro: 'Outro',
}

const anotacaoLabel: Record<string, string> = {
  limitacao: 'Limitação',
  restricao: 'Restrição',
  observacao: 'Observação',
  recomendacao: 'Recomendação',
  complementar: 'Informação complementar',
}

function agruparPorDia<T extends { dataHora: string }>(registros: T[]) {
  return registros.reduce<Record<string, T[]>>((grupos, registro) => {
    const chave = new Date(registro.dataHora).toLocaleDateString('pt-BR')
    grupos[chave] = [...(grupos[chave] ?? []), registro]
    return grupos
  }, {})
}

/** A API manda a chave crua ("hiperglicemia"); a tela mostra o rotulo. */
const rotuloClassificacao = (classificacao: string): string =>
  CLASSIFICACAO_LABEL[classificacao as Classificacao] ?? classificacao

function corSeveridade(severidade: string) {
  if (severidade === 'critico') return 'danger'
  if (severidade === 'atencao') return 'warning'
  return 'success'
}

export default function RelatorioPacientePage() {
  const { pacienteId = '' } = useParams<{ pacienteId: string }>()
  const navigate = useNavigate()
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    gerarRelatorio(pacienteId, DIAS_HISTORICO, true)
      .then((dados) => { if (!cancelado) setRelatorio(dados) })
      .catch((err) => { if (!cancelado) setErro(extractError(err)) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [pacienteId])

  const glicemiaPorDia = useMemo(() => agruparPorDia(relatorio?.glicemia.registros ?? []), [relatorio])
  const alimentacaoPorDia = useMemo(() => agruparPorDia(relatorio?.alimentacao.registros ?? []), [relatorio])

  if (loading) return <div style={styles.feedback}>Carregando relatório...</div>
  if (erro || !relatorio) {
    return <div><Btn variant="ghost" onClick={() => navigate('/relatorios')}>Voltar para relatórios</Btn><div style={{ marginTop: 16 }}><AlertBanner message={erro ?? 'Relatório não encontrado.'} /></div></div>
  }

  const { paciente, glicemia, alimentacao } = relatorio
  return (
    <div>
      <Btn variant="ghost" onClick={() => navigate('/relatorios')}>← Voltar para relatórios</Btn>
      <PageHeader
        eyebrow="Relatório individual"
        title={paciente.nome}
        subtitle={`${paciente.email} · histórico dos últimos 10 anos`}
        action={<Btn variant="secondary" onClick={() => window.print()}>Imprimir</Btn>}
      />

      <div style={styles.stack}>
        <Card title="Identificação" subtitle="Dados cadastrados no perfil do paciente">
          <div style={styles.infoGrid}>
            <Campo label="Nome" valor={paciente.nome} />
            <Campo label="E-mail" valor={paciente.email} />
            <Campo
              label="Tipo de diabetes"
              valor={
                paciente.tipoDiabetes
                  ? diabetesLabel[paciente.tipoDiabetes] ?? paciente.tipoDiabetes
                  : 'Não informado'
              }
            />
            <Campo label="Peso" valor={paciente.peso != null ? `${paciente.peso} kg` : 'Não informado'} />
            <Campo label="Altura" valor={paciente.altura != null ? `${paciente.altura} m` : 'Não informado'} />
            <Campo label="IMC" valor={paciente.imc != null ? String(paciente.imc) : 'Não informado'} />
            <Campo label="Restrições alimentares" valor={paciente.restricoesAlergias ?? 'Nenhuma registrada'} />
            <Campo label="Data de nascimento" valor={paciente.dataNascimento ? new Date(paciente.dataNascimento).toLocaleDateString('pt-BR') : 'Não informado'} />
          </div>
        </Card>

        <Card title="Registros do profissional" subtitle={`${contar(relatorio.anotacoes.length, 'anotação vinculada', 'anotações vinculadas')} ao paciente`}>
          {relatorio.anotacoes.length === 0 ? <EmptyState icon={<NoteIcon />} title="Nenhum registro complementar" message="Ainda não há observações, limitações ou recomendações registradas." /> : (
            <div style={styles.notes}>{relatorio.anotacoes.map((anotacao) => <article key={anotacao.id} style={styles.note}><div style={styles.noteHeader}><strong>{anotacaoLabel[anotacao.tipo] ?? anotacao.tipo}</strong><span>{new Date(anotacao.criadoEm).toLocaleString('pt-BR')}</span></div><div style={styles.noteText}>{anotacao.texto}</div>{anotacao.autorNome && <div style={styles.noteAuthor}>Registrado por {anotacao.autorNome}</div>}</article>)}</div>
          )}
        </Card>

        <Card title="Controle glicêmico" subtitle={contar(glicemia.total, 'medição registrada', 'medições registradas')}>
          {glicemia.total === 0 ? <EmptyState icon={<ChartIcon />} title="Nenhuma medição registrada" message="O paciente ainda não enviou medições pelo aplicativo." /> : (
            <>
              <div style={styles.metrics}>
                <Metrica label="Média" valor={glicemia.media != null ? `${glicemia.media} mg/dL` : '—'} />
                <Metrica label="Mínimo / máximo" valor={glicemia.minimo != null ? `${glicemia.minimo} / ${glicemia.maximo} mg/dL` : '—'} />
                <Metrica label="Na faixa" valor={glicemia.percentualNaFaixa != null ? `${glicemia.percentualNaFaixa}%` : '—'} />
              </div>
              <CalendarioGlicemia registros={glicemia.registros} />
              {/* Na tela o profissional navega pelo calendario; no papel ele
                  precisa do historico inteiro, entao a lista corrida vai junto
                  na impressao. */}
              <div className="somente-impressao">
                <TabelaGlicemia porDia={glicemiaPorDia} />
              </div>
            </>
          )}
        </Card>

        <Card title="Alimentação" subtitle={contar(alimentacao.total, 'refeição registrada', 'refeições registradas')}>
          {alimentacao.total === 0 ? <EmptyState icon={<ForkIcon />} title="Nenhuma refeição registrada" message="O paciente ainda não registrou refeições no aplicativo." /> : (
            <TabelaAlimentacao porDia={alimentacaoPorDia} />
          )}
        </Card>
      </div>
    </div>
  )
}

const hora = (iso: string): string =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/**
 * Uma tabela para o periodo inteiro, com o dia virando uma faixa de separacao.
 *
 * Antes cada dia montava a propria tabela, com o proprio cabecalho: num
 * relatorio de cinquenta medicoes o cabecalho aparecia cinquenta vezes, e como
 * cada tabela calculava a largura das colunas por conta, elas nao se alinhavam
 * entre um dia e outro. Com uma tabela so, o cabecalho aparece uma vez na tela
 * e o navegador o repete sozinho a cada pagina na impressao, que e o formato em
 * que este relatorio costuma sair.
 */
function TabelaGlicemia({ porDia }: { porDia: Record<string, RelatorioRegistroGlicemia[]> }) {
  return (
    <div style={styles.tableScroll}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Horário</th>
            <th style={styles.th}>Valor</th>
            <th style={styles.th}>Classificação</th>
            <th style={styles.th}>Momento</th>
            <th style={styles.th}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(porDia).map(([data, registros]) => (
            <Fragment key={data}>
              <tr>
                <td colSpan={5} style={styles.diaLinha}>
                  <strong>{data}</strong>
                  <span style={styles.diaContagem}>
                    {contar(registros.length, 'medição', 'medições')}
                  </span>
                </td>
              </tr>
              {registros.map((registro) => (
                <tr key={registro.id}>
                  <td style={styles.td}>{hora(registro.dataHora)}</td>
                  <td style={styles.td}>
                    <strong>{registro.valor} mg/dL</strong>
                  </td>
                  <td style={styles.td}>
                    <Badge
                      label={rotuloClassificacao(registro.classificacao)}
                      tint={corSeveridade(registro.severidade) as 'success' | 'warning' | 'danger'}
                    />
                  </td>
                  <td style={styles.td}>{MOMENTO_LABEL[registro.momento] ?? registro.momento}</td>
                  <td style={styles.tdSuave}>{registro.observacao || '—'}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabelaAlimentacao({ porDia }: { porDia: Record<string, RelatorioRegistroRefeicao[]> }) {
  return (
    <div style={styles.tableScroll}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Horário</th>
            <th style={styles.th}>Refeição</th>
            <th style={styles.th}>Alimentos consumidos</th>
            <th style={styles.th}>Carboidratos</th>
            <th style={styles.th}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(porDia).map(([data, registros]) => (
            <Fragment key={data}>
              <tr>
                <td colSpan={5} style={styles.diaLinha}>
                  <strong>{data}</strong>
                  <span style={styles.diaContagem}>
                    {contar(registros.length, 'refeição', 'refeições')}
                  </span>
                </td>
              </tr>
              {registros.map((registro) => (
                <tr key={registro.id}>
                  <td style={styles.td}>{hora(registro.dataHora)}</td>
                  <td style={styles.td}>
                    <strong>{refeicaoLabel[registro.tipoRefeicao] ?? registro.tipoRefeicao}</strong>
                  </td>
                  <td style={styles.td}>{registro.descricao || '—'}</td>
                  <td style={styles.td}>
                    {registro.carboidratos != null ? `${registro.carboidratos} g` : '—'}
                  </td>
                  <td style={styles.tdSuave}>{registro.observacao || '—'}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string }) { return <div><div style={styles.label}>{label}</div><div style={styles.value}>{valor}</div></div> }
function Metrica({ label, valor }: { label: string; valor: string }) { return <div><div style={styles.label}>{label}</div><div style={styles.metric}>{valor}</div></div> }
function ChartIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> }
function ForkIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2v7a2 2 0 0 0 4 0V2M9 11v11M17 2v20M17 2c-3 3-3 7 0 10" /></svg> }
function NoteIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg> }

const styles: Record<string, React.CSSProperties> = {
  stack: { display: 'flex', flexDirection: 'column', gap: 20 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, paddingBottom: 6 },
  label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  value: { color: 'var(--text)', fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' },
  metric: { color: 'var(--text)', fontSize: 20, fontWeight: 700 },
  tableScroll: { overflowX: 'auto' },
  table: { borderCollapse: 'collapse', width: '100%', minWidth: 680, fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'top' },
  tdSuave: { padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', verticalAlign: 'top' },
  diaLinha: {
    padding: '10px 12px',
    background: 'var(--surface-alt)',
    color: 'var(--text)',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
  },
  diaContagem: { color: 'var(--text-muted)', marginLeft: 10, fontSize: 12 },
  feedback: { padding: 48, textAlign: 'center', color: 'var(--text-muted)' },
  notes: { display: 'flex', flexDirection: 'column', gap: 10 },
  note: { padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-alt)' },
  noteHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: 'var(--text)', fontSize: 13 },
  noteText: { color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.5, marginTop: 8, whiteSpace: 'pre-wrap' },
  noteAuthor: { color: 'var(--text-muted)', fontSize: 11, marginTop: 8 },
}
