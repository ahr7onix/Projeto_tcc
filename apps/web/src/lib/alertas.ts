import { api } from './api'

export type Severidade = 'critico' | 'atencao' | 'normal'

export type Classificacao =
  | 'hipoglicemia_grave'
  | 'hipoglicemia'
  | 'normal'
  | 'hiperglicemia'
  | 'hiperglicemia_grave'

export interface Alerta {
  id: string
  valor: number
  momento: string
  observacao: string | null
  dataHora: string
  pacienteId: string
  pacienteNome: string
  classificacao: Classificacao
  severidade: Severidade
  mensagem: string
  faixaReferencia: { min: number; max: number }
}

export interface ResumoAlertas {
  dias: number
  totalRegistros: number
  criticos: number
  atencao: number
  normais: number
  percentualNaFaixa: number | null
  foraDaFaixa: number
  pacientes: {
    pacienteId: string
    pacienteNome: string
    criticos: number
    atencao: number
  }[]
}

export const CLASSIFICACAO_LABEL: Record<Classificacao, string> = {
  hipoglicemia_grave: 'Hipoglicemia grave',
  hipoglicemia: 'Hipoglicemia',
  normal: 'Normal',
  hiperglicemia: 'Hiperglicemia',
  hiperglicemia_grave: 'Hiperglicemia grave',
}

export const MOMENTO_LABEL: Record<string, string> = {
  jejum: 'Jejum',
  pre_prandial: 'Pré-refeição',
  pos_prandial: 'Pós-refeição',
  antes_dormir: 'Antes de dormir',
  madrugada: 'Madrugada',
  aleatorio: 'Aleatório',
}

export async function listarAlertas(params: {
  dias?: number
  pacienteId?: string
  severidade?: Severidade
} = {}): Promise<Alerta[]> {
  const { data } = await api.get('/alertas', { params })
  return data.data
}

export async function resumoAlertas(dias = 7): Promise<ResumoAlertas> {
  const { data } = await api.get('/alertas/resumo', { params: { dias } })
  return data
}
