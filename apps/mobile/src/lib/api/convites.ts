import { api } from '@/lib/api';

export interface ConviteRecebido {
  conviteId: string;
  nutricionistaNome: string;
  crn: string | null;
  especialidade: string | null;
  enviadoEm: string;
}

/** Convites de nutricionistas que ainda aguardam a resposta do paciente. */
export async function listarConvites(): Promise<ConviteRecebido[]> {
  const { data } = await api.get('/convites');
  return data.data;
}

export async function responderConvite(conviteId: string, aceitar: boolean): Promise<void> {
  await api.post(`/convites/${conviteId}/${aceitar ? 'aceitar' : 'recusar'}`);
}
