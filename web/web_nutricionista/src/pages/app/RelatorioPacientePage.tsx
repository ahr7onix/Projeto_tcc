import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertBanner, Badge, Btn, Card, EmptyState, PageHeader } from '../../components/ui'
import { MOMENTO_LABEL } from '../../lib/alertas'
import { extractError } from '../../lib/api'
import { gerarRelatorio, type Relatorio, type RelatorioRegistroGlicemia, type RelatorioRegistroRefeicao } from '../../lib/relatorios'

const DIAS_HISTORICO = 3650
const refeicaoLabel: Record<string, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
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
            <Campo label="Tipo de diabetes" valor={paciente.tipoDiabetes ?? 'Não informado'} />
            <Campo label="Peso" valor={paciente.peso != null ? `${paciente.peso} kg` : 'Não informado'} />
            <Campo label="Altura" valor={paciente.altura != null ? `${paciente.altura} m` : 'Não informado'} />
            <Campo label="IMC" valor={paciente.imc != null ? String(paciente.imc) : 'Não informado'} />
            <Campo label="Restrições alimentares" valor={paciente.restricoesAlergias ?? 'Nenhuma registrada'} />
            <Campo label="Data de nascimento" valor={paciente.dataNascimento ? new Date(paciente.dataNascimento).toLocaleDateString('pt-BR') : 'Não informado'} />
          </div>
        </Card>

        <Card title="Registros do profissional" subtitle={`${relatorio.anotacoes.length} anotação${relatorio.anotacoes.length === 1 ? '' : 'ões'} vinculada${relatorio.anotacoes.length === 1 ? '' : 's'} ao paciente`}>
          {relatorio.anotacoes.length === 0 ? <EmptyState icon={<NoteIcon />} title="Nenhum registro complementar" message="Ainda não há observações, limitações ou recomendações registradas." /> : (
            <div style={styles.notes}>{relatorio.anotacoes.map((anotacao) => <article key={anotacao.id} style={styles.note}><div style={styles.noteHeader}><strong>{anotacaoLabel[anotacao.tipo] ?? anotacao.tipo}</strong><span>{new Date(anotacao.criadoEm).toLocaleString('pt-BR')}</span></div><div style={styles.noteText}>{anotacao.texto}</div>{anotacao.autorNome && <div style={styles.noteAuthor}>Registrado por {anotacao.autorNome}</div>}</article>)}</div>
          )}
        </Card>

        <Card title="Registros do profissional" subtitle={`${relatorio.anotacoes.length} anotação${relatorio.anotacoes.length === 1 ? '' : 'ões'} vinculada${relatorio.anotacoes.length === 1 ? '' : 's'} ao paciente`}>
          {relatorio.anotacoes.length === 0 ? <EmptyState icon={<NoteIcon />} title="Nenhum registro complementar" message="Ainda não há observações, limitações ou recomendações registradas." /> : (
            <div style={styles.notes}>{relatorio.anotacoes.map((anotacao) => <article key={anotacao.id} style={styles.note}><div style={styles.noteHeader}><strong>{anotacaoLabel[anotacao.tipo] ?? anotacao.tipo}</strong><span>{new Date(anotacao.criadoEm).toLocaleString('pt-BR')}</span></div><div style={styles.noteText}>{anotacao.texto}</div>{anotacao.autorNome && <div style={styles.noteAuthor}>Registrado por {anotacao.autorNome}</div>}</article>)}</div>
          )}
        </Card>

        <Card title="Controle glicêmico" subtitle={`${glicemia.total} medição${glicemia.total === 1 ? '' : 'ões'} registrada${glicemia.total === 1 ? '' : 's'}`}>
          {glicemia.total === 0 ? <EmptyState icon={<ChartIcon />} title="Nenhuma medição registrada" message="O paciente ainda não enviou medições pelo aplicativo." /> : (
            <>
              <div style={styles.metrics}>
                <Metrica label="Média" valor={glicemia.media != null ? `${glicemia.media} mg/dL` : '—'} />
                <Metrica label="Mínimo / máximo" valor={glicemia.minimo != null ? `${glicemia.minimo} / ${glicemia.maximo} mg/dL` : '—'} />
                <Metrica label="Na faixa" valor={glicemia.percentualNaFaixa != null ? `${glicemia.percentualNaFaixa}%` : '—'} />
              </div>
              {Object.entries(glicemiaPorDia).map(([data, registros]) => <GlicemiaDia key={data} data={data} registros={registros} />)}
            </>
          )}
        </Card>

        <Card title="Alimentação" subtitle={`${alimentacao.total} refeição${alimentacao.total === 1 ? '' : 'ões'} registrada${alimentacao.total === 1 ? '' : 's'}`}>
          {alimentacao.total === 0 ? <EmptyState icon={<ForkIcon />} title="Nenhuma refeição registrada" message="O paciente ainda não registrou refeições no aplicativo." /> : (
            Object.entries(alimentacaoPorDia).map(([data, registros]) => <AlimentacaoDia key={data} data={data} registros={registros} />)
          )}
        </Card>
      </div>
    </div>
  )
}

function GlicemiaDia({ data, registros }: { data: string; registros: RelatorioRegistroGlicemia[] }) {
  return <div style={styles.dayBlock}>
    <div style={styles.dayHeader}><strong>{data}</strong><span>{registros.length} medição{registros.length === 1 ? '' : 'ões'}</span></div>
    <div style={styles.tableScroll}><table style={styles.table}><thead><tr><th>Horário</th><th>Valor</th><th>Classificação</th><th>Momento</th><th>Observação</th></tr></thead><tbody>{registros.map((registro) => <tr key={registro.id}><td>{new Date(registro.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td><strong>{registro.valor} mg/dL</strong></td><td><Badge label={registro.classificacao} tint={corSeveridade(registro.severidade) as 'success' | 'warning' | 'danger'} /></td><td>{MOMENTO_LABEL[registro.momento] ?? registro.momento}</td><td>{registro.observacao || '—'}</td></tr>)}</tbody></table></div>
  </div>
}

function AlimentacaoDia({ data, registros }: { data: string; registros: RelatorioRegistroRefeicao[] }) {
  return <div style={styles.dayBlock}>
    <div style={styles.dayHeader}><strong>{data}</strong><span>{registros.length} refeição{registros.length === 1 ? '' : 'ões'}</span></div>
    <div style={styles.tableScroll}><table style={styles.table}><thead><tr><th>Horário</th><th>Tipo de refeição</th><th>Alimentos consumidos</th><th>Quantidade / nutrição</th><th>Observação</th></tr></thead><tbody>{registros.map((registro) => <tr key={registro.id}><td>{new Date(registro.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td><strong>{refeicaoLabel[registro.tipoRefeicao] ?? registro.tipoRefeicao}</strong></td><td>{registro.descricao || '—'}</td><td>{registro.carboidratos != null ? `${registro.carboidratos} g de carboidratos` : '—'}</td><td>{registro.observacao || '—'}</td></tr>)}</tbody></table></div>
  </div>
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
  dayBlock: { borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 8 },
  dayHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text)', fontSize: 13, marginBottom: 10, flexWrap: 'wrap' },
  tableScroll: { overflowX: 'auto' },
  table: { borderCollapse: 'collapse', width: '100%', minWidth: 680, fontSize: 13 },
  feedback: { padding: 48, textAlign: 'center', color: 'var(--text-muted)' },
  notes: { display: 'flex', flexDirection: 'column', gap: 10 },
  note: { padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-alt)' },
  noteHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: 'var(--text)', fontSize: 13 },
  noteText: { color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.5, marginTop: 8, whiteSpace: 'pre-wrap' },
  noteAuthor: { color: 'var(--text-muted)', fontSize: 11, marginTop: 8 },
}
