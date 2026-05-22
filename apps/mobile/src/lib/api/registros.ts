import { api } from '@/lib/api';

export interface GlicemiaInput {
  valor: number;
  momento: 'jejum' | 'pre' | 'pos' | 'aleatorio';
  observacao?: string;
}

export interface RefeicaoInput {
  descricao: string;
  tipo_refeicao: string;
  carboidratos?: number;
  observacao?: string;
}

export async function createGlicemia(input: GlicemiaInput) {
  const { data } = await api.post('/registros/glicemia', input);
  return data;
}

export async function createRefeicao(input: RefeicaoInput) {
  const { data } = await api.post('/registros/refeicao', input);
  return data;
}
