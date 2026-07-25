import { api } from '@/lib/api';

export interface Conteudo {
  id: string;
  titulo: string;
  resumo: string | null;
  categoria: string;
  publicado: boolean;
  autorNome: string | null;
  criadoEm: string;
  atualizadoEm: string;
  conteudo?: string;
}

export async function listarConteudos(categoria?: string): Promise<Conteudo[]> {
  const { data } = await api.get('/conteudos', {
    params: categoria ? { categoria } : undefined,
  });
  return data.data;
}

export async function buscarConteudo(id: string): Promise<Conteudo> {
  const { data } = await api.get(`/conteudos/${id}`);
  return data;
}
