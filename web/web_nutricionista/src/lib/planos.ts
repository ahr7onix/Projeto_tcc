import { api } from './api'

/** Item da refeição: ou um alimento da tabela, ou texto livre. */
export interface ItemRefeicao {
  id?: string
  alimentoId?: string | null
  /** Nome exibido — vem do alimento da tabela ou da descrição livre. */
  nome?: string | null
  descricao?: string | null
  quantidadeG: number
  valores?: ValoresNutricionais | null
}

export interface ValoresNutricionais {
  kcal: number
  carboidratosG: number
  proteinasG: number
  lipidiosG: number
  fibrasG: number | null
}

/** Soma do que dá para calcular, mais quantos itens ficaram de fora. */
export interface TotaisRefeicao {
  kcal: number
  carboidratosG: number
  proteinasG: number
  lipidiosG: number
  fibrasG: number
  itensSemAnalise: number
}

export interface RefeicaoPlano {
  id?: string
  nome: string
  horario: string
  itens: string
  alimentos?: ItemRefeicao[]
  totais?: TotaisRefeicao
}

export interface PlanoAlimentar {
  id: string
  pacienteId: string
  pacienteNome: string
  nutricionistaNome: string
  dataInicio: string
  dataFim: string | null
  ativo: boolean
  vetKcal: number | null
  formulaVet: string | null
  fatorAtividade: number | null
  percCarboidratos: number | null
  percProteinas: number | null
  percLipidios: number | null
  observacoes: string | null
  criadoEm: string
  refeicoes: RefeicaoPlano[]
  totais: TotaisRefeicao
}

export interface PlanoPayload {
  pacienteId: string
  dataInicio: string
  dataFim?: string | null
  vetKcal?: number | null
  formulaVet?: string | null
  fatorAtividade?: number | null
  percCarboidratos?: number | null
  percProteinas?: number | null
  percLipidios?: number | null
  observacoes?: string | null
  refeicoes: RefeicaoPlano[]
}

/**
 * A API aceita a refeição como texto, como lista de alimentos ou as duas
 * coisas. Só é enviado o que a nutricionista preencheu.
 */
const limparRefeicoes = (refeicoes: RefeicaoPlano[]) =>
  refeicoes.map(({ nome, horario, itens, alimentos }) => {
    const lista = (alimentos ?? [])
      .filter((item) => item.alimentoId || item.descricao?.trim())
      .map((item) => ({
        alimentoId: item.alimentoId || undefined,
        descricao: item.alimentoId ? undefined : item.descricao?.trim(),
        quantidadeG: item.quantidadeG,
      }))

    return {
      nome: nome.trim(),
      horario,
      itens: itens.trim() || undefined,
      alimentos: lista.length ? lista : undefined,
    }
  })

/** Campos numéricos vazios viram undefined: a API trata ausência, não "". */
const numeroOuIndefinido = (valor: number | null | undefined) =>
  valor === null || valor === undefined || Number.isNaN(valor) ? undefined : valor

const camposDaConduta = (payload: Partial<PlanoPayload>) => ({
  vetKcal: numeroOuIndefinido(payload.vetKcal),
  formulaVet: payload.formulaVet || undefined,
  fatorAtividade: numeroOuIndefinido(payload.fatorAtividade),
  percCarboidratos: numeroOuIndefinido(payload.percCarboidratos),
  percProteinas: numeroOuIndefinido(payload.percProteinas),
  percLipidios: numeroOuIndefinido(payload.percLipidios),
  observacoes: payload.observacoes?.trim() || undefined,
})

export async function listarPlanos(pacienteId?: string): Promise<PlanoAlimentar[]> {
  const { data } = await api.get('/planos', {
    params: pacienteId ? { pacienteId } : undefined,
  })
  return data.data
}

export async function criarPlano(payload: PlanoPayload): Promise<PlanoAlimentar> {
  const { data } = await api.post('/planos', {
    pacienteId: payload.pacienteId,
    dataInicio: payload.dataInicio,
    dataFim: payload.dataFim || undefined,
    ...camposDaConduta(payload),
    refeicoes: limparRefeicoes(payload.refeicoes),
  })
  return data
}

export async function atualizarPlano(
  id: string,
  payload: Omit<PlanoPayload, 'pacienteId'>,
): Promise<PlanoAlimentar> {
  const { data } = await api.patch(`/planos/${id}`, {
    dataInicio: payload.dataInicio,
    dataFim: payload.dataFim || null,
    ...camposDaConduta(payload),
    refeicoes: limparRefeicoes(payload.refeicoes),
  })
  return data
}

export async function excluirPlano(id: string): Promise<void> {
  await api.delete(`/planos/${id}`)
}

const ROTULO_FORMULA: Record<string, string> = {
  mifflin_st_jeor: 'Mifflin-St Jeor',
  harris_benedict: 'Harris-Benedict',
  manual: 'Definido pelo nutricionista',
}

export const rotuloFormula = (formula: string | null): string | null =>
  formula === null ? null : (ROTULO_FORMULA[formula] ?? formula)
