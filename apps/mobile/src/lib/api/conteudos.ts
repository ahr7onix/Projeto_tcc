import { api } from '@/lib/api';

export type PublicoAlvo = 'todos' | 'pacientes_diabetes' | 'adultos';

export interface Conteudo {
  id: string;
  titulo: string;
  resumo: string | null;
  categoria: string;
  publicado: boolean;
  /**
   * A API já entrega só o que serve a este paciente — o filtro por público-alvo
   * e por agendamento é feito no servidor. Os campos vêm junto mesmo assim,
   * porque a resposta é a mesma para o painel, que precisa deles para editar.
   */
  publico: PublicoAlvo;
  agendadoEm: string | null;
  imagemCapa: string | null;
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
