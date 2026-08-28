import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertBanner, Btn, EmptyState, Input, PageHeader } from '../../components/ui'
import { api, extractError } from '../../lib/api'

interface Paciente {
  id: string
  nome: string
  email: string
  tipoDiabetes?: string | null
  status?: 'ativo' | 'inativo'
}

const rotuloDiabetes: Record<string, string> = {
  tipo1: 'Diabetes tipo 1',
  tipo2: 'Diabetes tipo 2',
  gestacional: 'Diabetes gestacional',
}

export default function RelatoriosPage() {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.get('/pacientes')
      .then(({ data }) => setPacientes(data.data ?? []))
      .catch((err) => setErro(extractError(err)))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase()
    return pacientes.filter((paciente) => paciente.nome.toLocaleLowerCase().includes(termo))
  }, [busca, pacientes])

  const grupos = useMemo(() => {
    return filtrados.reduce<Record<string, Paciente[]>>((acc, paciente) => {
      const grupo = paciente.tipoDiabetes || 'sem-classificacao'
      acc[grupo] = [...(acc[grupo] ?? []), paciente]
      return acc
    }, {})
  }, [filtrados])

  return (
    <div>
      <PageHeader
        eyebrow="Acompanhamento"
        title="Relatórios"
        subtitle="Escolha um paciente para consultar o histórico completo registrado no aplicativo."
      />

      {erro && <div style={{ marginBottom: 16 }}><AlertBanner message={erro} /></div>}

      <div style={styles.toolbar}>
        <Input
          label="Pesquisar paciente"
          placeholder="Digite o nome do paciente..."
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          icon={<SearchIcon />}
        />
        <span style={styles.count}>{filtrados.length} paciente{filtrados.length === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div style={styles.feedback}>Carregando pacientes...</div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={<PatientsIcon />}
          title={busca ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          message={busca ? 'Tente pesquisar por outro nome.' : 'Os pacientes cadastrados no aplicativo aparecerão aqui.'}
        />
      ) : (
        <div style={styles.groups}>
          {Object.entries(grupos).map(([grupo, lista]) => (
            <section key={grupo}>
              <div style={styles.groupTitle}>{rotuloDiabetes[grupo] ?? (grupo === 'sem-classificacao' ? 'Sem classificação' : grupo)}</div>
              <div style={styles.list}>
                {lista.map((paciente) => (
                  <div key={paciente.id} style={styles.row}>
                    <div style={styles.identity}>
                      <div style={styles.avatar}>{paciente.nome.charAt(0).toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.name}>{paciente.nome}</div>
                        <div style={styles.email}>{paciente.email}</div>
                      </div>
                    </div>
<<<<<<< HEAD
                  )}
                </>
              )
            )}
          </Card>

          <Card title="Alimentação">
            <div style={grid}>
              <Metrica label="Refeições registradas" valor={relatorio.alimentacao.total} />
              <Metrica
                label="Carboidratos (média)"
                valor={
                  relatorio.alimentacao.carboidratosMedia != null
                    ? `${relatorio.alimentacao.carboidratosMedia} g`
                    : '—'
                }
              />
            </div>
          </Card>

          {g && g.registros.length > 0 && (
            <Card title="Medições do período">
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {g.registros
                  .slice()
                  .reverse()
                  .map((r, i) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0',
                        borderBottom: i < g.registros.length - 1 ? '1px solid var(--border)' : 'none',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ width: 110, color: 'var(--text-muted)', fontSize: 12 }}>
                        {formatarDataHora(r.dataHora)}
                      </span>
                      <span
                        style={{
                          width: 80,
                          fontWeight: 700,
                          color: corSeveridade(r.severidade),
                        }}
                      >
                        {r.valor} mg/dL
                      </span>
                      <span style={{ flex: 1, color: 'var(--text-muted)' }}>
                        {MOMENTO_LABEL[r.momento] ?? r.momento}
                        {r.observacao ? ` · ${r.observacao}` : ''}
                      </span>
                    </div>
                  ))}
=======
                    <Btn size="sm" onClick={() => navigate(`/relatorios/${paciente.id}`)}>Ver Relatório</Btn>
                  </div>
                ))}
>>>>>>> e285f2e (feat: reorganiza relatorios por paciente)
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: 'flex', alignItems: 'end', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  count: { color: 'var(--text-muted)', fontSize: 13, paddingBottom: 10 },
  groups: { display: 'flex', flexDirection: 'column', gap: 24 },
  groupTitle: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  list: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  identity: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 },
  name: { fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  email: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  feedback: { padding: 48, textAlign: 'center', color: 'var(--text-muted)' },
}

<<<<<<< HEAD
function Metrica({
  label,
  valor,
  cor = 'var(--text)',
}: {
  label: string
  valor: string | number
  cor?: string
}) {
  return (
    <div>
      <div style={rotulo}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: cor }}>{valor}</div>
    </div>
  )
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
}
const rotulo: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: 3,
}
const subtitulo: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-soft)',
  marginBottom: 4,
}

function ChartIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
=======
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> }
function PatientsIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> }
>>>>>>> e285f2e (feat: reorganiza relatorios por paciente)
