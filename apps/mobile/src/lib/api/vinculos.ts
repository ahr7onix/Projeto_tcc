import { api } from '@/lib/api';

/**
 * Consentimento no vínculo: o nutricionista só vê os dados de saúde do
 * paciente depois que o paciente aceita o convite aqui pelo aplicativo, e o
 * paciente pode encerrar o acompanhamento quando quiser.
 */
export interface NutricionistaResumo {
  id: string;
  nome: string;
  crn: string | null;
  especialidade: string | null;
}

export interface ConviteRecebido {
  id: string;
  nutricionista: NutricionistaResumo;
  criadoEm: string;
}

export interface NutricionistaVinculado extends NutricionistaResumo {
  vinculadoEm: string;
}

export async function listarConvites(): Promise<ConviteRecebido[]> {
  const { data } = await api.get('/vinculos/convites');
  return data.data;
}

export async function aceitarConvite(id: string): Promise<void> {
  await api.patch(`/vinculos/convites/${id}/aceitar`);
}

export async function recusarConvite(id: string): Promise<void> {
  await api.patch(`/vinculos/convites/${id}/recusar`);
}

export async function listarMeusNutricionistas(): Promise<NutricionistaVinculado[]> {
  const { data } = await api.get('/vinculos/nutricionistas');
  return data.data;
}

export async function encerrarAcompanhamento(nutricionistaId: string): Promise<void> {
  await api.delete(`/vinculos/nutricionistas/${nutricionistaId}`);
}
