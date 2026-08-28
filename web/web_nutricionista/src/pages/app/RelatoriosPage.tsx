import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertBanner, Btn, EmptyState, PageHeader } from '../../components/ui'
import { api, extractError } from '../../lib/api'
import PatientPicker from '../../components/PatientPicker'

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
        <PatientPicker
          patients={pacientes}
          label="Pesquisar paciente"
          placeholder="Digite o nome do paciente..."
          value={busca}
          onChange={setBusca}
          onSelect={(patient) => navigate(`/relatorios/${patient.id}`)}
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
                    <Btn size="sm" onClick={() => navigate(`/relatorios/${paciente.id}`)}>Ver Relatório</Btn>
                  </div>
                ))}
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

function PatientsIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> }
