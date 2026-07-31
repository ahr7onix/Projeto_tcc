import { api } from './api'

export interface NivelAtividadeRef {
  valor: string
  fator: number
  rotulo: string
}

export interface Referencias {
  niveisAtividade: NivelAtividadeRef[]
  formulas: { valor: string; rotulo: string }[]
  distribuicaoPadrao: { carboidratos: number; proteinas: number; lipidios: number }
  observacao: string
}

export interface MacroCalculado {
  percentual: number
  kcal: number
  gramas: number
}

export interface ResultadoCalculo {
  paciente: { id: string; nome: string }
  dadosUsados: {
    peso: number
    altura: number
    idade: number
    sexo: 'feminino' | 'masculino'
    nivelAtividade: string
    rotuloAtividade: string
    /** "cadastro" quando os dados vieram da ficha; "simulacao" quando foram digitados. */
    origem: 'cadastro' | 'simulacao'
  }
  formula: string
  tmb: number
  fatorAtividade: number
  vet: number
  macros: {
    carboidratos: MacroCalculado
    proteinas: MacroCalculado
    lipidios: MacroCalculado
  }
  observacao: string
}

export interface CalculoPayload {
  pacienteId: string
  peso?: number
  altura?: number
  idade?: number
  sexo?: 'feminino' | 'masculino'
  nivelAtividade?: string
  formula?: string
  percCarboidratos?: number
  percProteinas?: number
  percLipidios?: number
}

export async function buscarReferencias(): Promise<Referencias> {
  const { data } = await api.get('/nutricional/referencias')
  return data
}

export async function calcularNecessidade(
  payload: CalculoPayload,
): Promise<ResultadoCalculo> {
  const { data } = await api.post('/nutricional/calcular', payload)
  return data
}
