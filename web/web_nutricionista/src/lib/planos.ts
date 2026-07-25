import { api } from './api'

export interface RefeicaoPlano {
  id?: string
  nome: string
  horario: string
  itens: string
}

export interface PlanoAlimentar {
  id: string
  pacienteId: string
  pacienteNome: string
  nutricionistaNome: string
  dataInicio: string
  dataFim: string | null
  ativo: boolean
  criadoEm: string
  refeicoes: RefeicaoPlano[]
}

export interface PlanoPayload {
  pacienteId: string
  dataInicio: string
  dataFim?: string | null
  refeicoes: RefeicaoPlano[]
}

const limparRefeicoes = (refeicoes: RefeicaoPlano[]): RefeicaoPlano[] =>
  refeicoes.map(({ nome, horario, itens }) => ({
    nome: nome.trim(),
    horario,
    itens: itens.trim(),
  }))

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
    refeicoes: limparRefeicoes(payload.refeicoes),
  })
  return data
}

export async function excluirPlano(id: string): Promise<void> {
  await api.delete(`/planos/${id}`)
}
