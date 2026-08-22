import { api } from '@/lib/api';

export interface Restricao {
  id: string;
  descricao: string;
  criadoEm: string;
}

/** Restrições do próprio paciente — a API recorta pelo usuário do token. */
export async function listarRestricoes(): Promise<Restricao[]> {
  const { data } = await api.get('/restricoes');
  return data.data;
}

export async function criarRestricao(descricao: string): Promise<Restricao> {
  const { data } = await api.post('/restricoes', { descricao });
  return data;
}

export async function atualizarRestricao(id: string, descricao: string): Promise<Restricao> {
  const { data } = await api.patch(`/restricoes/${id}`, { descricao });
  return data;
}

export async function removerRestricao(id: string): Promise<void> {
  await api.delete(`/restricoes/${id}`);
}
