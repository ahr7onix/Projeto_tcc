import { api } from '@/lib/api';

export interface RefeicaoPlano {
  id: string;
  nome: string;
  horario: string;
  itens: string;
}

export interface PlanoAlimentar {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  nutricionistaNome: string;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
  criadoEm: string;
  refeicoes: RefeicaoPlano[];
}

export async function getPlanoAtivo(): Promise<PlanoAlimentar | null> {
  const { data } = await api.get('/planos/ativo');
  if (!data || typeof data !== 'object' || !('id' in data)) return null;
  return data as PlanoAlimentar;
}

export async function listarPlanos(): Promise<PlanoAlimentar[]> {
  const { data } = await api.get('/planos');
  return data.data;
}
