import { useEffect, useMemo, useState } from 'react'
import { Btn, Input, Textarea, Select, AlertBanner, Badge } from './ui'
import PatientPicker from './PatientPicker'
import { extractError } from '../lib/api'
import {
  atualizarPlano,
  criarPlano,
  type ItemRefeicao,
  type PlanoAlimentar,
  type RefeicaoPlano,
} from '../lib/planos'
import { listarAlimentos, type Alimento } from '../lib/alimentos'
import {
  buscarReferencias,
  calcularNecessidade,
  type Referencias,
  type ResultadoCalculo,
} from '../lib/nutricional'

interface PacienteOption {
  id: string
  nome: string
}

interface Props {
  pacientes: PacienteOption[]

  plano?: PlanoAlimentar | null
  onClose: () => void
  onSaved: (plano: PlanoAlimentar) => void
}

const REFEICAO_PADRAO: RefeicaoPlano[] = [
  { nome: 'Café da manhã', horario: '07:30', itens: '' },
  { nome: 'Almoço', horario: '12:00', itens: '' },
  { nome: 'Lanche', horario: '16:00', itens: '' },
  { nome: 'Jantar', horario: '19:30', itens: '' },
]

const hoje = () => new Date().toISOString().slice(0, 10)

/** Campo numérico vazio some do envio; a API distingue "zero" de "não informado". */
const numero = (texto: string): number | undefined => {
  const limpo = texto.trim().replace(',', '.')
  if (!limpo) return undefined
  const valor = Number(limpo)
  return Number.isNaN(valor) ? undefined : valor
}

const texto = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '' : String(valor)

const arredondar = (valor: number): number => Math.round(valor * 10) / 10

export default function PlanoAlimentarModal({
  pacientes,
  plano,
  onClose,
  onSaved,
}: Props) {
  const editando = Boolean(plano)

  const [pacienteId, setPacienteId] = useState(plano?.pacienteId ?? '')
  const [pacienteBusca, setPacienteBusca] = useState('')
  const [dataInicio, setDataInicio] = useState(plano?.dataInicio ?? hoje())
  const [dataFim, setDataFim] = useState(plano?.dataFim ?? '')
  const [refeicoes, setRefeicoes] = useState<RefeicaoPlano[]>(
    plano?.refeicoes?.length ? plano.refeicoes : REFEICAO_PADRAO,
  )

  const [vetKcal, setVetKcal] = useState(texto(plano?.vetKcal))
  const [formulaVet, setFormulaVet] = useState(plano?.formulaVet ?? 'mifflin_st_jeor')
  const [nivelAtividade, setNivelAtividade] = useState('')
  const [percCarboidratos, setPercCarboidratos] = useState(texto(plano?.percCarboidratos))
  const [percProteinas, setPercProteinas] = useState(texto(plano?.percProteinas))
  const [percLipidios, setPercLipidios] = useState(texto(plano?.percLipidios))
  const [observacoes, setObservacoes] = useState(plano?.observacoes ?? '')

  const [referencias, setReferencias] = useState<Referencias | null>(null)
  const [catalogo, setCatalogo] = useState<Alimento[]>([])
  const [calculo, setCalculo] = useState<ResultadoCalculo | null>(null)
  const [calculando, setCalculando] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    buscarReferencias()
      .then((refs) => {
        setReferencias(refs)
        // Num plano novo a distribuição padrão já vem preenchida; num plano
        // existente o que a nutricionista definiu antes tem preferência.
        setPercCarboidratos((atual) => atual || String(refs.distribuicaoPadrao.carboidratos))
        setPercProteinas((atual) => atual || String(refs.distribuicaoPadrao.proteinas))
        setPercLipidios((atual) => atual || String(refs.distribuicaoPadrao.lipidios))
        const nivel = plano?.fatorAtividade
          ? refs.niveisAtividade.find((n) => n.fator === plano.fatorAtividade)
          : undefined
        setNivelAtividade(nivel?.valor ?? refs.niveisAtividade[0]?.valor ?? '')
      })
      .catch(() => setReferencias(null))

    listarAlimentos({ limite: 300 })
      .then(setCatalogo)
      .catch(() => setCatalogo([]))
  }, [plano])

  /** Índice por id para achar o alimento de cada item sem varrer a lista toda. */
  const porId = useMemo(
    () => new Map(catalogo.map((alimento) => [alimento.id, alimento])),
    [catalogo],
  )

  function alterarRefeicao(index: number, campo: keyof RefeicaoPlano, valor: string) {
    setRefeicoes((atual) =>
      atual.map((r, i) => (i === index ? { ...r, [campo]: valor } : r)),
    )
  }

  function adicionarRefeicao() {
    setRefeicoes((atual) => [...atual, { nome: '', horario: '08:00', itens: '' }])
  }

  function removerRefeicao(index: number) {
    setRefeicoes((atual) => atual.filter((_, i) => i !== index))
  }

  function alterarItem(
    indexRefeicao: number,
    indexItem: number,
    campos: Partial<ItemRefeicao>,
  ) {
    setRefeicoes((atual) =>
      atual.map((r, i) =>
        i === indexRefeicao
          ? {
              ...r,
              alimentos: (r.alimentos ?? []).map((item, j) =>
                j === indexItem ? { ...item, ...campos } : item,
              ),
            }
          : r,
      ),
    )
  }

  function adicionarItem(indexRefeicao: number) {
    setRefeicoes((atual) =>
      atual.map((r, i) =>
        i === indexRefeicao
          ? { ...r, alimentos: [...(r.alimentos ?? []), { alimentoId: '', quantidadeG: 100 }] }
          : r,
      ),
    )
  }

  function removerItem(indexRefeicao: number, indexItem: number) {
    setRefeicoes((atual) =>
      atual.map((r, i) =>
        i === indexRefeicao
          ? { ...r, alimentos: (r.alimentos ?? []).filter((_, j) => j !== indexItem) }
          : r,
      ),
    )
  }

  /**
   * Prévia dos totais enquanto a nutricionista monta o plano. Quem manda é o
   * cálculo da API, refeito a cada gravação — isto aqui é só para ela não
   * precisar salvar para saber quantas calorias a refeição tem.
   */
  function totaisDa(refeicao: RefeicaoPlano) {
    const itens = refeicao.alimentos ?? []
    let kcal = 0
    let carboidratosG = 0
    let proteinasG = 0
    let lipidiosG = 0
    let semAnalise = 0

    for (const item of itens) {
      const alimento = item.alimentoId ? porId.get(item.alimentoId) : undefined
      if (!alimento || !alimento.porcaoG || !item.quantidadeG) {
        semAnalise += 1
        continue
      }
      const proporcao = item.quantidadeG / alimento.porcaoG
      kcal += alimento.kcal * proporcao
      carboidratosG += alimento.carboidratosG * proporcao
      proteinasG += alimento.proteinasG * proporcao
      lipidiosG += alimento.lipidiosG * proporcao
    }

    return {
      kcal: arredondar(kcal),
      carboidratosG: arredondar(carboidratosG),
      proteinasG: arredondar(proteinasG),
      lipidiosG: arredondar(lipidiosG),
      semAnalise,
    }
  }

  const totalDoPlano = refeicoes.reduce(
    (total, refeicao) => {
      const t = totaisDa(refeicao)
      return {
        kcal: arredondar(total.kcal + t.kcal),
        carboidratosG: arredondar(total.carboidratosG + t.carboidratosG),
        proteinasG: arredondar(total.proteinasG + t.proteinasG),
        lipidiosG: arredondar(total.lipidiosG + t.lipidiosG),
        semAnalise: total.semAnalise + t.semAnalise,
      }
    },
    { kcal: 0, carboidratosG: 0, proteinasG: 0, lipidiosG: 0, semAnalise: 0 },
  )

  const somaPercentuais =
    (numero(percCarboidratos) ?? 0) + (numero(percProteinas) ?? 0) + (numero(percLipidios) ?? 0)

  const fatorDoNivel =
    referencias?.niveisAtividade.find((n) => n.valor === nivelAtividade)?.fator

  /** Gramas de cada macro a partir do VET: 4 kcal/g nos carboidratos e proteínas, 9 nos lipídios. */
  function gramasDoMacro(percentual: string, kcalPorGrama: number): string {
    const vet = numero(vetKcal)
    const perc = numero(percentual)
    if (!vet || !perc) return ''
    return `${Math.round((vet * perc) / 100 / kcalPorGrama)} g`
  }

  async function handleCalcular() {
    if (!pacienteId) {
      setErro('Selecione o paciente antes de calcular.')
      return
    }

    setErro(null)
    setCalculando(true)
    try {
      const resultado = await calcularNecessidade({
        pacienteId,
        nivelAtividade: nivelAtividade || undefined,
        formula: formulaVet === 'manual' ? undefined : formulaVet,
        percCarboidratos: numero(percCarboidratos),
        percProteinas: numero(percProteinas),
        percLipidios: numero(percLipidios),
      })
      setCalculo(resultado)
      setVetKcal(String(resultado.vet))
      setFormulaVet(resultado.formula)
      setPercCarboidratos(String(resultado.macros.carboidratos.percentual))
      setPercProteinas(String(resultado.macros.proteinas.percentual))
      setPercLipidios(String(resultado.macros.lipidios.percentual))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setCalculando(false)
    }
  }

  function validar(): string | null {
    if (!editando && !pacienteId) return 'Selecione o paciente.'
    if (!dataInicio) return 'Informe a data de início.'
    if (dataFim && dataFim < dataInicio)
      return 'A data final não pode ser anterior à data de início.'
    if (!refeicoes.length) return 'Adicione ao menos uma refeição.'
    const incompleta = refeicoes.find((r) => !r.nome.trim() || !r.itens.trim())
    if (incompleta) return 'Preencha o nome e os itens de todas as refeições.'
    if (somaPercentuais > 0 && Math.round(somaPercentuais) !== 100) {
      return `Os percentuais de macronutrientes devem somar 100% (estão em ${arredondar(somaPercentuais)}%).`
    }
    return null
  }

  async function handleSalvar() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    const conduta = {
      vetKcal: numero(vetKcal),
      formulaVet: formulaVet || undefined,
      fatorAtividade: fatorDoNivel,
      percCarboidratos: numero(percCarboidratos),
      percProteinas: numero(percProteinas),
      percLipidios: numero(percLipidios),
      observacoes,
    }

    setErro(null)
    setSalvando(true)
    try {
      const salvo = plano
        ? await atualizarPlano(plano.id, { dataInicio, dataFim, refeicoes, ...conduta })
        : await criarPlano({ pacienteId, dataInicio, dataFim, refeicoes, ...conduta })
      onSaved(salvo)
      onClose()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSalvando(false)
    }
  }

  const opcoesAlimento = [
    { value: '', label: 'Selecione o alimento' },
    ...catalogo.map((a) => ({ value: a.id, label: `${a.nome} — ${a.porcaoG} g` })),
  ]

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {}
        <div style={header}>
          <div>
            <div style={eyebrow}>{editando ? 'Editar' : 'Novo'} plano</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
              Plano alimentar
            </h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>

        {}
        <div style={body}>
          {erro && <AlertBanner message={erro} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {!editando && (
              <div style={{ gridColumn: '1 / -1' }}>
                <PatientPicker
                  patients={pacientes}
                  value={pacienteBusca}
                  label="Paciente"
                  placeholder="Buscar paciente..."
                  emptyMessage="Nenhum paciente encontrado."
                  onChange={(valor) => {
                    setPacienteBusca(valor)
                    // Se o texto não bate mais com o paciente escolhido, a seleção é desfeita
                    // até que outro resultado seja clicado.
                    if (!pacientes.some((p) => p.nome === valor)) setPacienteId('')
                  }}
                  onSelect={(p) => {
                    setPacienteBusca(p.nome)
                    setPacienteId(p.id)
                  }}
                />
                {pacienteId && (
                  <div style={pacienteEscolhido}>
                    Paciente selecionado:{' '}
                    <strong>{pacientes.find((p) => p.id === pacienteId)?.nome ?? pacienteBusca}</strong>
                  </div>
                )}
              </div>
            )}

            <Input
              label="Início"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <Input
              label="Término (opcional)"
              type="date"
              min={dataInicio}
              value={dataFim ?? ''}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          {}
          <div style={secao}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={tituloSecao}>Necessidade energética</div>
              <Btn
                variant="secondary"
                size="sm"
                type="button"
                loading={calculando}
                onClick={handleCalcular}
                disabled={!pacienteId}
              >
                Calcular pelo cadastro
              </Btn>
            </div>

            <div style={grade}>
              <Select
                label="Fórmula"
                value={formulaVet}
                onChange={(e) => setFormulaVet(e.target.value)}
                options={
                  referencias?.formulas.map((f) => ({ value: f.valor, label: f.rotulo })) ?? [
                    { value: 'mifflin_st_jeor', label: 'Mifflin-St Jeor' },
                  ]
                }
              />
              <Select
                label="Nível de atividade"
                value={nivelAtividade}
                onChange={(e) => setNivelAtividade(e.target.value)}
                options={
                  referencias?.niveisAtividade.map((n) => ({
                    value: n.valor,
                    label: `${n.rotulo} (×${n.fator})`,
                  })) ?? []
                }
              />
              <Input
                label="VET (kcal/dia)"
                type="number"
                min="0"
                step="10"
                value={vetKcal}
                onChange={(e) => setVetKcal(e.target.value)}
              />
            </div>

            {calculo && (
              <div style={resumoCalculo}>
                Metabolismo basal de {calculo.tmb} kcal × fator {calculo.fatorAtividade} ={' '}
                <strong>{calculo.vet} kcal/dia</strong>
                {calculo.dadosUsados.origem === 'cadastro'
                  ? ` — com peso ${calculo.dadosUsados.peso} kg, altura ${calculo.dadosUsados.altura} m e ${calculo.dadosUsados.idade} anos do cadastro.`
                  : ' — a partir dos dados simulados.'}
              </div>
            )}

            <div style={grade}>
              <Input
                label={`Carboidratos (%)${gramasDoMacro(percCarboidratos, 4) ? ` — ${gramasDoMacro(percCarboidratos, 4)}` : ''}`}
                type="number"
                min="0"
                max="100"
                step="1"
                value={percCarboidratos}
                onChange={(e) => setPercCarboidratos(e.target.value)}
              />
              <Input
                label={`Proteínas (%)${gramasDoMacro(percProteinas, 4) ? ` — ${gramasDoMacro(percProteinas, 4)}` : ''}`}
                type="number"
                min="0"
                max="100"
                step="1"
                value={percProteinas}
                onChange={(e) => setPercProteinas(e.target.value)}
              />
              <Input
                label={`Lipídios (%)${gramasDoMacro(percLipidios, 9) ? ` — ${gramasDoMacro(percLipidios, 9)}` : ''}`}
                type="number"
                min="0"
                max="100"
                step="1"
                value={percLipidios}
                onChange={(e) => setPercLipidios(e.target.value)}
              />
            </div>

            {/* A API recusa uma distribuição que não fecha 100%; o aviso aparece antes de salvar. */}
            {somaPercentuais > 0 && Math.round(somaPercentuais) !== 100 && (
              <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                Os percentuais somam {arredondar(somaPercentuais)}% — precisam somar 100%.
              </div>
            )}

            {referencias?.observacao && (
              <div style={aviso}>{referencias.observacao}</div>
            )}
          </div>

          {}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>
              Refeições ({refeicoes.length})
            </div>
            <Btn variant="ghost" size="sm" onClick={adicionarRefeicao} type="button">
              + Adicionar
            </Btn>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {refeicoes.map((r, i) => {
              const totais = totaisDa(r)
              const itens = r.alimentos ?? []

              return (
                <div key={i} style={refeicaoCard}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 10, alignItems: 'end' }}>
                    <Input
                      label="Refeição"
                      placeholder="Ex: Café da manhã"
                      value={r.nome}
                      onChange={(e) => alterarRefeicao(i, 'nome', e.target.value)}
                    />
                    <Input
                      label="Horário"
                      type="time"
                      value={r.horario}
                      onChange={(e) => alterarRefeicao(i, 'horario', e.target.value)}
                    />
                    <Btn
                      variant="danger"
                      size="sm"
                      type="button"
                      onClick={() => removerRefeicao(i)}
                      disabled={refeicoes.length === 1}
                      style={{ marginBottom: 2 }}
                    >
                      Remover
                    </Btn>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Textarea
                      label="Itens"
                      placeholder="Ex: 1 fatia de pão integral, 1 ovo cozido, 200ml de leite desnatado"
                      value={r.itens}
                      onChange={(e) => alterarRefeicao(i, 'itens', e.target.value)}
                      style={{ minHeight: 64 }}
                    />
                  </div>

                  {}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={rotuloItens}>Alimentos da tabela (opcional)</div>
                      <Btn variant="ghost" size="sm" type="button" onClick={() => adicionarItem(i)}>
                        + Alimento
                      </Btn>
                    </div>

                    {itens.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {itens.map((item, j) => {
                          const alimento = item.alimentoId ? porId.get(item.alimentoId) : undefined
                          const kcalItem =
                            alimento && alimento.porcaoG && item.quantidadeG
                              ? Math.round((alimento.kcal * item.quantidadeG) / alimento.porcaoG)
                              : null

                          return (
                            <div key={j} style={itemLinha}>
                              <div style={{ flex: 3, minWidth: 180 }}>
                                <Select
                                  value={item.alimentoId ?? ''}
                                  onChange={(e) =>
                                    alterarItem(i, j, { alimentoId: e.target.value })
                                  }
                                  options={opcoesAlimento}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: 90 }}>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  placeholder="g"
                                  value={item.quantidadeG || ''}
                                  onChange={(e) =>
                                    alterarItem(i, j, { quantidadeG: Number(e.target.value) })
                                  }
                                />
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 62 }}>
                                {kcalItem === null ? '—' : `${kcalItem} kcal`}
                              </span>
                              <Btn variant="ghost" size="sm" type="button" onClick={() => removerItem(i, j)}>
                                ×
                              </Btn>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {totais.kcal > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <Badge label={`${Math.round(totais.kcal)} kcal`} tint="primary" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          C {totais.carboidratosG} g · P {totais.proteinasG} g · G{' '}
                          {totais.lipidiosG} g
                        </span>
                        {totais.semAnalise > 0 && (
                          <span style={{ fontSize: 12, color: 'var(--warning)' }}>
                            {totais.semAnalise} item sem análise
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {totalDoPlano.kcal > 0 && (
            <div style={totalCard}>
              <div>
                <div style={rotuloItens}>Total do dia pelos alimentos escolhidos</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  C {totalDoPlano.carboidratosG} g · P {totalDoPlano.proteinasG} g · G{' '}
                  {totalDoPlano.lipidiosG} g
                  {totalDoPlano.semAnalise > 0 &&
                    ` · ${totalDoPlano.semAnalise} item sem análise`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
                  {Math.round(totalDoPlano.kcal)} kcal
                </div>
                {numero(vetKcal) !== undefined && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    meta de {numero(vetKcal)} kcal
                  </div>
                )}
              </div>
            </div>
          )}

          <Textarea
            label="Observações — opcional"
            placeholder="Orientações gerais, restrições, combinados da consulta."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            style={{ minHeight: 70 }}
          />
        </div>

        {}
        <div style={footer}>
          <Btn variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Btn>
          <Btn onClick={handleSalvar} loading={salvando} type="button">
            {editando ? 'Salvar alterações' : 'Criar plano'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(16, 24, 40, 0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  width: '100%', maxWidth: 760, maxHeight: '90vh',
  display: 'flex', flexDirection: 'column',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-raised)',
}
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid var(--border)',
}
const eyebrow: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4,
}
const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 26, lineHeight: 1, color: 'var(--text-muted)',
}
const body: React.CSSProperties = {
  padding: '20px 24px', overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: 14,
}
const secao: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  padding: 14, background: 'var(--bg)',
  display: 'flex', flexDirection: 'column', gap: 12,
}
const pacienteEscolhido: React.CSSProperties = {
  marginTop: 8, fontSize: 12, color: 'var(--text-soft)',
  background: 'var(--primary-soft)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '8px 10px',
}
const tituloSecao: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--text-soft)',
}
const grade: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
}
const resumoCalculo: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-soft)',
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '10px 12px',
}
const aviso: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)',
}
const refeicaoCard: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  padding: 14, background: 'var(--bg)',
}
const rotuloItens: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.4px', color: 'var(--text-muted)',
}
const itemLinha: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
}
const totalCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 12, flexWrap: 'wrap',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  padding: '14px 16px', background: 'var(--bg)',
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
