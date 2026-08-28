import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertBanner,
  Badge,
  Btn,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Paginacao,
  ProgressBar,
  Select,
  StatTile,
  usePaginacao,
} from '../../components/ui'
import GraficoLinha from '../../components/GraficoLinha'
import MedidaModal from '../../components/MedidaModal'
import MedicamentoModal from '../../components/MedicamentoModal'
import { api, extractError } from '../../lib/api'
import {
  buscarEvolucao,
  excluirAntropometria,
  listarAntropometria,
  rotuloRisco,
  type EvolucaoAntropometrica,
  type RegistroAntropometrico,
} from '../../lib/antropometria'
import {
  listarMedicamentos,
  suspenderMedicamento,
  type Medicamento,
} from '../../lib/medicamentos'
import {
  buscarResumoEmocional,
  TINT_ESTADO,
  type ResumoEmocional,
} from '../../lib/emocional'

interface PacienteOption {
  id: string
  nome: string
  email: string
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

/** Uma casa decimal só quando o número precisa: 72 e 72,4. */
const formatar = (valor: number | null | undefined): string => {
  if (valor === null || valor === undefined) return '—'
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',')
}

/** O IMC classificado pela API vira a cor do indicador. */
function tintDoImc(classificacao: string | null): 'success' | 'warning' | 'danger' {
  if (classificacao === 'eutrofia') return 'success'
  if (classificacao === 'baixo_peso' || classificacao === 'sobrepeso') return 'warning'
  return 'danger'
}

function tintDoRisco(risco: string | null): 'success' | 'warning' | 'danger' {
  if (risco === 'baixo') return 'success'
  if (risco === 'muito_aumentado' || risco === 'elevado') return 'danger'
  return 'warning'
}

function SaudeDetalhePage({ pacienteInicial = '' }: { pacienteInicial?: string }) {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<PacienteOption[]>([])
  const [pacienteId, setPacienteId] = useState(pacienteInicial)

  const [registros, setRegistros] = useState<RegistroAntropometrico[]>([])
  const [evolucao, setEvolucao] = useState<EvolucaoAntropometrica | null>(null)
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [emocional, setEmocional] = useState<ResumoEmocional | null>(null)

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [medidaAberta, setMedidaAberta] = useState(false)
  const [medicamentoAberto, setMedicamentoAberto] = useState(false)
  const [medicamentoEditando, setMedicamentoEditando] = useState<Medicamento | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [suspendendoId, setSuspendendoId] = useState<string | null>(null)

  const carregar = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setErro(null)
      // Os quatro blocos da página são independentes: buscar em paralelo evita
      // que a tela apareça em pedaços.
      const [lista, serie, remedios, resumo] = await Promise.all([
        // 365 é o teto aceito pela API. Antes buscávamos 60: com a lista
        // paginada o contador precisa refletir o histórico inteiro, senão ele
        // diria "de 60" para um paciente que tem mais medidas que isso.
        listarAntropometria(id, 365),
        buscarEvolucao(id),
        listarMedicamentos(id),
        buscarResumoEmocional(id, 30),
      ])
      setRegistros(lista)
      setEvolucao(serie)
      setMedicamentos(remedios)
      setEmocional(resumo)
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
    if (!pacienteId) {
      setRegistros([])
      setEvolucao(null)
      setMedicamentos([])
      setEmocional(null)
      return
    }
    carregar(pacienteId)
  }, [pacienteId, carregar])

  const pacienteNome = useMemo(
    () => pacientes.find((p) => p.id === pacienteId)?.nome ?? '',
    [pacientes, pacienteId],
  )

  // Uma lista por bloco: o nutricionista pode estar na pagina 3 das medidas sem
  // que isso mexa na lista de medicamentos ao lado.
  const pagMedidas = usePaginacao(registros, 20, pacienteId)
  const pagMedicamentos = usePaginacao(medicamentos, 10, pacienteId)

  const ultima = registros[0] ?? null

  /** Repetida no formulário: a altura raramente muda entre duas consultas. */
  const alturaSugerida = useMemo(
    () => registros.find((r) => r.altura !== null)?.altura ?? null,
    [registros],
  )

  function handleMedidaSalva() {
    // Recarrega tudo: a nova medida muda os gráficos e a variação de peso.
    if (pacienteId) carregar(pacienteId)
  }

  function handleMedicamentoSalvo(salvo: Medicamento) {
    setMedicamentos((atual) => {
      const existe = atual.some((m) => m.id === salvo.id)
      return existe ? atual.map((m) => (m.id === salvo.id ? salvo : m)) : [...atual, salvo]
    })
  }

  async function handleExcluirMedida(registro: RegistroAntropometrico) {
    const confirmado = window.confirm(
      `Excluir a medida de ${formatarData(registro.dataMedicao)}? Esta ação não pode ser desfeita.`,
    )
    if (!confirmado) return

    try {
      setExcluindoId(registro.id)
      await excluirAntropometria(registro.id, pacienteId)
      setRegistros((atual) => atual.filter((r) => r.id !== registro.id))
      setEvolucao(await buscarEvolucao(pacienteId))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setExcluindoId(null)
    }
  }

  async function handleSuspender(medicamento: Medicamento) {
    const confirmado = window.confirm(
      `Suspender "${medicamento.nome}"? Os lembretes param, mas o histórico continua registrado.`,
    )
    if (!confirmado) return

    try {
      setSuspendendoId(medicamento.id)
      await suspenderMedicamento(medicamento.id, pacienteId)
      setMedicamentos((atual) => atual.filter((m) => m.id !== medicamento.id))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSuspendendoId(null)
    }
  }

  return (
    <div>
      {pacienteInicial && (
        <Btn variant="ghost" onClick={() => navigate('/saude')} style={{ marginBottom: 8 }}>
          ← Voltar para Saúde
        </Btn>
      )}
      <PageHeader
        eyebrow="Indicadores"
        title="Saúde"
        subtitle="Medidas corporais, medicamentos e bem-estar de cada paciente."
        action={
          <Btn disabled={!pacienteId} onClick={() => setMedidaAberta(true)}>
            + Nova medida
          </Btn>
        }
      />

      {erro && <AlertBanner message={erro} />}

      {!pacienteInicial && <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 280, flex: 1 }}>
            <Select
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              label="Paciente"
              options={[
                { value: '', label: 'Selecione um paciente' },
                ...pacientes.map((p) => ({ value: p.id, label: p.nome })),
              ]}
            />
          </div>
          {ultima && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>
                Última medida em {formatarData(ultima.dataMedicao)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {registros.length} registro{registros.length === 1 ? '' : 's'} no histórico
              </div>
            </div>
          )}
        </div>
      </Card>}

      {!pacienteId ? (
        <Card>
          <EmptyState
            icon={<HeartIcon />}
            title="Escolha um paciente"
            message="Selecione acima para ver as medidas, os medicamentos e o bem-estar registrados."
          />
        </Card>
      ) : loading ? (
        <Card>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando dados do paciente...
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <StatTile
              label="Peso atual"
              value={ultima?.peso !== null && ultima ? `${formatar(ultima.peso)} kg` : '—'}
              icon={<ScaleIcon />}
              sub={
                evolucao?.variacaoPeso !== null && evolucao?.variacaoPeso !== undefined
                  ? `${evolucao.variacaoPeso > 0 ? '+' : ''}${formatar(evolucao.variacaoPeso)} kg desde a primeira medida`
                  : undefined
              }
            />
            <StatTile
              label="IMC"
              value={ultima?.imc !== null && ultima ? formatar(ultima.imc) : '—'}
              icon={<BodyIcon />}
              tint={tintDoImc(ultima?.classificacaoImc ?? null)}
              sub={ultima?.rotuloImc ?? undefined}
            />
            <StatTile
              label="Circunferência da cintura"
              value={
                ultima?.circCintura !== null && ultima ? `${formatar(ultima.circCintura)} cm` : '—'
              }
              icon={<RulerIcon />}
              tint={tintDoRisco(ultima?.riscoCintura ?? null)}
              sub={rotuloRisco(ultima?.riscoCintura ?? null) ?? undefined}
            />
            <StatTile
              label="Relação cintura/quadril"
              value={ultima?.rcq !== null && ultima ? formatar(ultima.rcq) : '—'}
              icon={<TrendIcon />}
              tint={tintDoRisco(ultima?.riscoRcq ?? null)}
              sub={rotuloRisco(ultima?.riscoRcq ?? null) ?? undefined}
            />
          </div>

          {/* O risco depende do sexo do paciente, que a API só usa quando está cadastrado. */}
          {ultima && ultima.circCintura !== null && ultima.riscoCintura === null && (
            <div style={rodape}>
              As classificações de risco só aparecem quando o sexo do paciente está
              cadastrado no perfil.
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            <Card title="Evolução do peso (kg)">
              <GraficoLinha
                pontos={evolucao?.peso ?? []}
                unidade=" kg"
                vazio="Registre pelo menos uma pesagem para ver a evolução."
              />
            </Card>
            <Card title="Evolução do IMC">
              <GraficoLinha
                pontos={evolucao?.imc ?? []}
                cor="var(--success)"
                vazio="O IMC aparece quando houver peso e altura registrados."
              />
            </Card>
            <Card title="Circunferência da cintura (cm)">
              <GraficoLinha
                pontos={evolucao?.circCintura ?? []}
                cor="var(--warning)"
                unidade=" cm"
                vazio="Registre a medida da cintura para acompanhar a evolução."
              />
            </Card>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            <Card
              title="Medicamentos"
              action={
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMedicamentoEditando(null)
                    setMedicamentoAberto(true)
                  }}
                >
                  + Adicionar
                </Btn>
              }
            >
              {medicamentos.length === 0 ? (
                <EmptyState
                  icon={<MedIcon />}
                  title="Nenhum medicamento ativo"
                  message="Cadastre os medicamentos do paciente para gerar os lembretes no aplicativo."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pagMedicamentos.visiveis.map((medicamento) => (
                    <div key={medicamento.id} style={linha}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          {medicamento.nome}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {medicamento.dosagem} · {medicamento.frequencia} · a partir das{' '}
                          {medicamento.horarioInicial.slice(0, 5)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setMedicamentoEditando(medicamento)
                            setMedicamentoAberto(true)
                          }}
                        >
                          Editar
                        </Btn>
                        <Btn
                          variant="danger"
                          size="sm"
                          loading={suspendendoId === medicamento.id}
                          onClick={() => handleSuspender(medicamento)}
                        >
                          Suspender
                        </Btn>
                      </div>
                    </div>
                  ))}
                  <Paginacao
                    pagina={pagMedicamentos.pagina}
                    totalPaginas={pagMedicamentos.totalPaginas}
                    total={pagMedicamentos.total}
                    primeiro={pagMedicamentos.primeiro}
                    ultimo={pagMedicamentos.ultimo}
                    onChange={pagMedicamentos.irPara}
                    rotulo="medicamentos"
                  />
                </div>
              )}
            </Card>

            <Card title="Bem-estar nos últimos 30 dias">
              {!emocional || emocional.total === 0 ? (
                <EmptyState
                  icon={<SmileIcon />}
                  title="Sem registros no período"
                  message="O paciente registra como se sentiu pelo aplicativo."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>
                      {formatar(emocional.mediaEscala)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      média na escala de 1 a 5 · {emocional.total} registro
                      {emocional.total === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {emocional.porEstado.map((estado) => (
                      <div key={estado.estado}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {estado.rotulo}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {estado.total}
                          </span>
                        </div>
                        <ProgressBar
                          value={estado.total / emocional.total}
                          tint={TINT_ESTADO[estado.estado] ?? 'primary'}
                        />
                      </div>
                    ))}
                  </div>

                  {emocional.fatoresFrequentes.length > 0 && (
                    <div>
                      <div style={subtitulo}>O que mais apareceu</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {emocional.fatoresFrequentes.map((fator) => (
                          <Badge
                            key={fator.fator}
                            label={`${fator.fator} (${fator.vezes})`}
                            tint="primary"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card title="Histórico de medidas">
            {registros.length === 0 ? (
              <EmptyState
                icon={<RulerIcon />}
                title="Nenhuma medida registrada"
                message="Use o botão “Nova medida” para registrar a primeira avaliação."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pagMedidas.visiveis.map((registro) => (
                  <div key={registro.id} style={linha}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          {formatarData(registro.dataMedicao)}
                        </span>
                        {registro.rotuloImc && (
                          <Badge
                            label={registro.rotuloImc}
                            tint={tintDoImc(registro.classificacaoImc)}
                          />
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {registro.peso !== null && `Peso ${formatar(registro.peso)} kg`}
                        {registro.imc !== null && ` · IMC ${formatar(registro.imc)}`}
                        {registro.circCintura !== null &&
                          ` · Cintura ${formatar(registro.circCintura)} cm`}
                        {registro.circQuadril !== null &&
                          ` · Quadril ${formatar(registro.circQuadril)} cm`}
                        {registro.rcq !== null && ` · RCQ ${formatar(registro.rcq)}`}
                      </div>
                      {registro.observacao && (
                        <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>
                          {registro.observacao}
                        </div>
                      )}
                      {registro.autorNome && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          Registrado por {registro.autorNome}
                        </div>
                      )}
                    </div>
                    <Btn
                      variant="danger"
                      size="sm"
                      loading={excluindoId === registro.id}
                      onClick={() => handleExcluirMedida(registro)}
                    >
                      Excluir
                    </Btn>
                  </div>
                ))}
                <Paginacao
                  pagina={pagMedidas.pagina}
                  totalPaginas={pagMedidas.totalPaginas}
                  total={pagMedidas.total}
                  primeiro={pagMedidas.primeiro}
                  ultimo={pagMedidas.ultimo}
                  onChange={pagMedidas.irPara}
                  rotulo="medidas"
                />
              </div>
            )}
          </Card>

          <div style={rodape}>
            As classificações de IMC e de risco seguem os pontos de corte da OMS para
            adultos e não substituem a avaliação da nutricionista.
          </div>
        </div>
      )}

      {medidaAberta && pacienteId && (
        <MedidaModal
          pacienteId={pacienteId}
          pacienteNome={pacienteNome}
          alturaSugerida={alturaSugerida}
          onClose={() => setMedidaAberta(false)}
          onSaved={handleMedidaSalva}
        />
      )}

      {medicamentoAberto && pacienteId && (
        <MedicamentoModal
          pacienteId={pacienteId}
          pacienteNome={pacienteNome}
          medicamento={medicamentoEditando}
          onClose={() => setMedicamentoAberto(false)}
          onSaved={handleMedicamentoSalvo}
        />
      )}
    </div>
  )
}

function SaudePacientesPage() {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<PacienteOption[]>([])
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

  return (
    <div>
      <PageHeader eyebrow="Indicadores" title="Saúde" subtitle="Escolha um paciente para consultar medidas, medicamentos e bem-estar." />
      {erro && <div style={{ marginBottom: 16 }}><AlertBanner message={erro} /></div>}
      <div style={{ display: 'flex', alignItems: 'end', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input label="Pesquisar paciente" placeholder="Digite o nome do paciente..." value={busca} onChange={(event) => setBusca(event.target.value)} icon={<SearchIcon />} />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13, paddingBottom: 10 }}>{filtrados.length} paciente{filtrados.length === 1 ? '' : 's'}</span>
      </div>
      {loading ? <div style={feedback}>Carregando pacientes...</div> : filtrados.length === 0 ? (
        <EmptyState icon={<HeartIcon />} title={busca ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'} message={busca ? 'Tente pesquisar por outro nome.' : 'Os pacientes cadastrados no aplicativo aparecerão aqui.'} />
      ) : (
        <div style={listaPacientes}>
          {filtrados.map((paciente) => (
            <div key={paciente.id} style={linhaPaciente}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={avatarPaciente}>{paciente.nome.charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}><div style={nomePaciente}>{paciente.nome}</div><div style={emailPaciente}>{paciente.email}</div></div>
              </div>
              <Btn size="sm" onClick={() => navigate(`/saude/${paciente.id}`)}>Ver Saúde</Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SaudePage() {
  const { pacienteId } = useParams<{ pacienteId?: string }>()
  return pacienteId ? <SaudeDetalhePage pacienteInicial={pacienteId} /> : <SaudePacientesPage />
}

const feedback: React.CSSProperties = { padding: 48, textAlign: 'center', color: 'var(--text-muted)' }
const listaPacientes: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }
const linhaPaciente: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--border)' }
const avatarPaciente: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }
const nomePaciente: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const emailPaciente: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> }

const linha: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-alt)',
  flexWrap: 'wrap',
}
const subtitulo: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  color: 'var(--text-muted)',
  marginBottom: 8,
}
const rodape: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
}

function ScaleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 13a4 4 0 0 1 8 0" />
      <path d="M12 13l2-3" />
    </svg>
  )
}
function BodyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 8v7M8 10h8M9 21l3-6 3 6" />
    </svg>
  )
}
function RulerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h18v6H3z" />
      <path d="M7 9v3M11 9v4M15 9v3M19 9v4" />
    </svg>
  )
}
function TrendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M21 7h-5M21 7v5" />
    </svg>
  )
}
function MedIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
function SmileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  )
}
function HeartIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}
