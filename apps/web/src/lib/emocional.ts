import { api } from './api'

export interface RegistroEmocional {
  id: string
  dataHora: string
  estado: string
  rotuloEstado: string
  intensidade: number | null
  /** Texto livre com os fatores separados por vírgula ("noite mal dormida, prova"). */
  fatores: string | null
  observacao: string | null
}

export interface ResumoEmocional {
  periodoDias: number
  total: number
  /** Média na escala de 1 (muito mal) a 5 (muito bem). Não é nota: serve de tendência. */
  mediaEscala: number | null
  porEstado: { estado: string; rotulo: string; total: number }[]
  fatoresFrequentes: { fator: string; vezes: number }[]
}

export async function listarEmocional(
  pacienteId: string,
  dias?: number,
  limite?: number,
): Promise<RegistroEmocional[]> {
  const { data } = await api.get('/emocional', { params: { pacienteId, dias, limite } })
  return data.data
}

export async function buscarResumoEmocional(
  pacienteId: string,
  dias = 30,
): Promise<ResumoEmocional> {
  const { data } = await api.get('/emocional/resumo', { params: { pacienteId, dias } })
  return data
}

export interface DiaHumorGlicemia {
  dia: string
  estados: { estado: string; rotulo: string }[]
  /** Média do dia na escala de 1 (muito mal) a 5 (muito bem). */
  escalaDoDia: number | null
  fatores: string[]
  glicemia: {
    total: number
    media: number | null
    minima: number
    maxima: number
    foraDaFaixa: number
  } | null
}

export interface HumorGlicemia {
  periodoDias: number
  dias: DiaHumorGlicemia[]
  /**
   * Comparação descritiva entre os dias bons e os ruins. As contagens vêm
   * junto de propósito: uma média sobre dois dias não significa a mesma coisa
   * que uma média sobre trinta, e a tela precisa deixar isso visível.
   */
  comparativo: {
    diasComparaveis: number
    diasBem: number
    diasMal: number
    mediaGlicemiaDiasBem: number | null
    mediaGlicemiaDiasMal: number | null
  }
}

/** Humor e glicemia do mesmo dia, lado a lado — RF06 do briefing. */
export async function buscarHumorGlicemia(
  pacienteId: string,
  dias = 30,
): Promise<HumorGlicemia> {
  const { data } = await api.get('/emocional/glicemia', { params: { pacienteId, dias } })
  return data
}

/** Cor de cada estado, para as barras do resumo usarem a mesma escala da API. */
export const TINT_ESTADO: Record<string, 'success' | 'primary' | 'warning' | 'danger'> = {
  muito_bem: 'success',
  bem: 'success',
  neutro: 'primary',
  mal: 'warning',
  muito_mal: 'danger',
}
