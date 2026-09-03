import { api } from './api'

export interface Conversa {
  vinculoId: string
  contraparteId: string
  contraparteNome: string
  ultimaMensagem: string | null
  ultimaEm: string | null
  naoLidas: number
}

export interface Mensagem {
  id: string
  conteudo: string
  remetenteId: string
  remetenteNome: string
  remetenteTipo: string
  propria: boolean
  lida: boolean
  criadoEm: string
}

export interface ContrapartePerfil {
  dataNascimento: string | null
  tipoDiabetes: string | null
  genero: string | null
  peso: number | null
  altura: number | null
}

export interface Thread {
  contraparte: { id: string; nome: string; perfil?: ContrapartePerfil }
  data: Mensagem[]
}

export async function listarConversas(): Promise<Conversa[]> {
  const { data } = await api.get('/mensagens')
  return data.data
}

export async function abrirConversa(contraparteId: string): Promise<Thread> {
  const { data } = await api.get(`/mensagens/${contraparteId}`)
  return data
}

export async function enviarMensagem(
  destinatarioId: string,
  conteudo: string,
): Promise<Mensagem> {
  const { data } = await api.post('/mensagens', { destinatarioId, conteudo })
  return data
}

export async function contarNaoLidas(): Promise<number> {
  const { data } = await api.get('/mensagens/nao-lidas')
  return data.naoLidas
}

/**
 * Avisa a outra ponta que o usuário está (ou parou de) escrever. É só um
 * sinal: se a chamada falhar, a conversa segue normal.
 */
export async function sinalizarDigitando(
  contraparteId: string,
  digitando: boolean,
): Promise<void> {
  await api
    .post(`/mensagens/${contraparteId}/digitando`, { digitando })
    .catch(() => undefined)
}
