import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertBanner, Btn, Card, EmptyState, PageHeader, Select, Textarea } from '../../components/ui'
import { api, extractError } from '../../lib/api'
import { criarAnotacao, listarAnotacoes, type Anotacao, type TipoAnotacao } from '../../lib/anotacoes'

const tipos: { value: TipoAnotacao; label: string }[] = [
  { value: 'limitacao', label: 'Limitação' },
  { value: 'restricao', label: 'Restrição' },
  { value: 'observacao', label: 'Observação' },
  { value: 'recomendacao', label: 'Recomendação' },
  { value: 'complementar', label: 'Informação complementar' },
]

export default function PacienteAnotacoesPage() {
  const { pacienteId = '' } = useParams<{ pacienteId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const raiz = location.pathname.startsWith('/acompanhamento') ? '/acompanhamento' : '/pacientes'
  const [paciente, setPaciente] = useState<{ nome: string; email: string } | null>(null)
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([])
  const [tipo, setTipo] = useState<TipoAnotacao>('observacao')
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.get(`/pacientes/${pacienteId}`), listarAnotacoes(pacienteId)])
      .then(([pacienteResponse, anotacoesData]) => {
        setPaciente(pacienteResponse.data)
        setAnotacoes(anotacoesData)
      })
      .catch((err) => setErro(extractError(err)))
      .finally(() => setLoading(false))
  }, [pacienteId])

  async function salvar(event: FormEvent) {
    event.preventDefault()
    if (!texto.trim()) return
    try {
      setSalvando(true)
      setErro(null)
      const nova = await criarAnotacao(pacienteId, tipo, texto)
      setAnotacoes((atual) => [nova, ...atual])
      setTexto('')
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <div style={styles.feedback}>Carregando informações...</div>
  if (!paciente) return <AlertBanner message={erro ?? 'Paciente não encontrado.'} />

  return (
    <div>
      <Btn variant="ghost" onClick={() => navigate(`${raiz}/${pacienteId}/informacoes`)}>← Voltar para o paciente</Btn>
      <PageHeader eyebrow="Acompanhamento" title="Registrar nova informação" subtitle={`${paciente.nome} · ${paciente.email}`} />
      {erro && <div style={{ marginBottom: 16 }}><AlertBanner message={erro} /></div>}
      <div style={styles.layout}>
        <Card title="Nova anotação" subtitle="O registro ficará vinculado ao paciente e aparecerá no relatório.">
          <form onSubmit={salvar} style={styles.form}>
            <Select label="Tipo de informação" value={tipo} onChange={(event) => setTipo(event.target.value as TipoAnotacao)} options={tipos} />
            <Textarea label="Informação" placeholder="Descreva a limitação, restrição, observação ou recomendação..." value={texto} maxLength={2000} onChange={(event) => setTexto(event.target.value)} required />
            <div style={styles.formFooter}><span style={styles.counter}>{texto.length}/2000</span><Btn type="submit" loading={salvando} disabled={!texto.trim()}>Salvar informação</Btn></div>
          </form>
        </Card>
        <Card title="Histórico de informações" subtitle={`${anotacoes.length} registro${anotacoes.length === 1 ? '' : 's'}`}>
          {anotacoes.length === 0 ? <EmptyState icon={<NoteIcon />} title="Nenhuma informação registrada" message="Adicione a primeira anotação deste paciente." /> : <div style={styles.history}>{anotacoes.map((anotacao) => <article key={anotacao.id} style={styles.note}><div style={styles.noteHeader}><strong>{tipos.find((item) => item.value === anotacao.tipo)?.label ?? anotacao.tipo}</strong><span>{new Date(anotacao.criadoEm).toLocaleString('pt-BR')}</span></div><div style={styles.noteText}>{anotacao.texto}</div>{anotacao.autorNome && <div style={styles.author}>Registrado por {anotacao.autorNome}</div>}</article>)}</div>}
        </Card>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  feedback: { padding: 48, textAlign: 'center', color: 'var(--text-muted)' },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(320px, 1.2fr)', gap: 20, alignItems: 'start' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  counter: { color: 'var(--text-muted)', fontSize: 12 },
  history: { display: 'flex', flexDirection: 'column', gap: 12 },
  note: { padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-alt)' },
  noteHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: 'var(--text)', fontSize: 13 },
  noteText: { color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.5, marginTop: 8, whiteSpace: 'pre-wrap' },
  author: { color: 'var(--text-muted)', fontSize: 11, marginTop: 8 },
}

function NoteIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg> }
