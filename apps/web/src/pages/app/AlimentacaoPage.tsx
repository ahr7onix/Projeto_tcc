import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertBanner,
  Badge,
  Btn,
  Card,
  EmptyState,
  PageHeader,
  Paginacao,
  usePaginacao,
} from '../../components/ui'
import PlanoAlimentarModal from '../../components/PlanoAlimentarModal'
import { api, extractError } from '../../lib/api'
import { excluirPlano, listarPlanos, type PlanoAlimentar } from '../../lib/planos'
import PatientPicker from '../../components/PatientPicker'

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
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [planoEditando, setPlanoEditando] = useState<PlanoAlimentar | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  // Só um plano aberto por vez: a lista serve para comparar pacientes, e
  // vários blocos de refeições abertos ao mesmo tempo desfazem isso.
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  const carregarPlanos = useCallback(
    async (pacienteId: string | undefined, ativo: () => boolean) => {
      try {
        setLoading(true)
        setErro(null)
        const lista = await listarPlanos(pacienteId || undefined)
        if (ativo()) setPlanos(lista)
      } catch (err) {
        if (ativo()) setErro(extractError(err))
      } finally {
        if (ativo()) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    let cancelado = false
    api
      .get('/pacientes')
      .then(({ data }) => {
        if (cancelado) return
        setPacientes(data.data.map((p: PacienteOption) => ({ id: p.id, nome: p.nome })))
      })
      .catch(() => {
        if (!cancelado) setPacientes([])
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Trocar de paciente antes de a lista anterior chegar deixava as duas
  // respostas no ar: a mais lenta vencia e a tela mostrava os planos de um
  // paciente com outro selecionado no filtro.
  useEffect(() => {
    let cancelado = false
    carregarPlanos(filtroPaciente, () => !cancelado)
    return () => {
      cancelado = true
    }
  }, [filtroPaciente, carregarPlanos])

  const ativos = useMemo(() => planos.filter((p) => p.ativo).length, [planos])
  const pag = usePaginacao(planos, 15, filtroPaciente)

  function abrirNovo() {
    setPlanoEditando(null)
    setModalAberto(true)
  }

  function handleBuscaPaciente(value: string) {
    setBuscaPaciente(value)
    if (!pacientes.some((patient) => patient.nome === value)) setFiltroPaciente('')
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
            <PatientPicker
              patients={pacientes}
              value={buscaPaciente}
              label="Filtrar por paciente"
              placeholder="Todos os pacientes ou digite um nome..."
              onChange={handleBuscaPaciente}
              onSelect={(patient) => {
                setBuscaPaciente(patient.nome)
                setFiltroPaciente(patient.id)
              }}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--primary)' }}>
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
        <Card>
          {/* Uma linha por plano. A grade de cards obrigava a rolar para
              comparar dois pacientes; na lista as datas e o status ficam
              alinhados. As refeições abrem dentro da própria linha. */}
          <div>
            {pag.visiveis.map((plano, i) => {
              const aberto = expandidoId === plano.id
              return (
                <div
                  key={plano.id}
                  style={{
                    borderBottom: i < pag.visiveis.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setExpandidoId(aberto ? null : plano.id)}
                      aria-expanded={aberto}
                      style={{
                        flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10,
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 10 }}>{aberto ? '▾' : '▸'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{plano.pacienteNome}</span>
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 168 }}>
                      {formatarData(plano.dataInicio)} → {formatarData(plano.dataFim)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 84 }}>
                      {plano.refeicoes.length} {plano.refeicoes.length === 1 ? 'refeição' : 'refeições'}
                    </span>
                    <Badge
                      label={plano.ativo ? 'Ativo' : 'Encerrado'}
                      tint={plano.ativo ? 'success' : 'primary'}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
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
                  </div>

                  {aberto && (
                    <div style={{ padding: '0 0 12px 22px' }}>
                      {plano.refeicoes.map((r, j) => (
                        <div key={r.id ?? j} style={{ display: 'flex', gap: 10, padding: '6px 0', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 44 }}>{r.horario}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 110 }}>{r.nome}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.itens}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <Paginacao
            pagina={pag.pagina}
            totalPaginas={pag.totalPaginas}
            total={pag.total}
            primeiro={pag.primeiro}
            ultimo={pag.ultimo}
            onChange={pag.irPara}
            rotulo="planos"
          />
        </Card>
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
