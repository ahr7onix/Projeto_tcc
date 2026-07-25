import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertBanner,
  Badge,
  Btn,
  Card,
  EmptyState,
  PageHeader,
  Select,
} from '../../components/ui'
import PlanoAlimentarModal from '../../components/PlanoAlimentarModal'
import { api, extractError } from '../../lib/api'
import { excluirPlano, listarPlanos, type PlanoAlimentar } from '../../lib/planos'

interface PacienteOption {
  id: string
  nome: string
}

function formatarData(iso: string | null): string {
  if (!iso) return 'Sem término'
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

export default function AlimentacaoPage() {
  const [planos, setPlanos] = useState<PlanoAlimentar[]>([])
  const [pacientes, setPacientes] = useState<PacienteOption[]>([])
  const [filtroPaciente, setFiltroPaciente] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [planoEditando, setPlanoEditando] = useState<PlanoAlimentar | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const carregarPlanos = useCallback(async (pacienteId?: string) => {
    try {
      setLoading(true)
      setErro(null)
      setPlanos(await listarPlanos(pacienteId || undefined))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api
      .get('/pacientes')
      .then(({ data }) =>
        setPacientes(data.data.map((p: PacienteOption) => ({ id: p.id, nome: p.nome }))),
      )
      .catch(() => setPacientes([]))
  }, [])

  useEffect(() => {
    carregarPlanos(filtroPaciente)
  }, [filtroPaciente, carregarPlanos])

  const ativos = useMemo(() => planos.filter((p) => p.ativo).length, [planos])

  function abrirNovo() {
    setPlanoEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(plano: PlanoAlimentar) {
    setPlanoEditando(plano)
    setModalAberto(true)
  }

  function handleSaved(salvo: PlanoAlimentar) {
    setPlanos((atual) => {
      const existe = atual.some((p) => p.id === salvo.id)
      return existe ? atual.map((p) => (p.id === salvo.id ? salvo : p)) : [salvo, ...atual]
    })
  }

  async function handleExcluir(plano: PlanoAlimentar) {
    const confirmado = window.confirm(
      `Excluir o plano de ${plano.pacienteNome}? Esta ação não pode ser desfeita.`,
    )
    if (!confirmado) return

    try {
      setExcluindoId(plano.id)
      await excluirPlano(plano.id)
      setPlanos((atual) => atual.filter((p) => p.id !== plano.id))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Planos alimentares"
        title="Alimentação"
        subtitle="Crie e gerencie os planos alimentares personalizados dos seus pacientes."
        action={<Btn onClick={abrirNovo}>+ Novo plano</Btn>}
      />

      {erro && <AlertBanner message={erro} />}

      {}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <Select
              label="Filtrar por paciente"
              value={filtroPaciente}
              onChange={(e) => setFiltroPaciente(e.target.value)}
              options={[
                { value: '', label: 'Todos os pacientes' },
                ...pacientes.map((p) => ({ value: p.id, label: p.nome })),
              ]}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
              {ativos}/{planos.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>planos ativos</div>
          </div>
        </div>
      </Card>

      {}
      {loading ? (
        <Card>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando planos...
          </div>
        </Card>
      ) : planos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookIcon />}
            title="Nenhum plano alimentar cadastrado"
            message="Crie um plano personalizado para organizar as refeições do paciente."
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          {planos.map((plano) => (
            <Card key={plano.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {plano.pacienteNome}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {formatarData(plano.dataInicio)} → {formatarData(plano.dataFim)}
                  </div>
                </div>
                <Badge
                  label={plano.ativo ? 'Ativo' : 'Encerrado'}
                  tint={plano.ativo ? 'success' : 'primary'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {plano.refeicoes.map((r, i) => (
                  <div
                    key={r.id ?? i}
                    style={{
                      padding: '10px 0',
                      borderBottom:
                        i < plano.refeicoes.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                        {r.nome}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.horario}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {r.itens}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Btn variant="secondary" size="sm" onClick={() => abrirEdicao(plano)}>
                  Editar
                </Btn>
                <Btn
                  variant="danger"
                  size="sm"
                  loading={excluindoId === plano.id}
                  onClick={() => handleExcluir(plano)}
                >
                  Excluir
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalAberto && (
        <PlanoAlimentarModal
          pacientes={pacientes}
          plano={planoEditando}
          onClose={() => setModalAberto(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

function BookIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
