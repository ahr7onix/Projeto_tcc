import { api } from './api'
import { log } from './logger'
import type { Mensagem } from './mensagens'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface EventoMensagem {
  /** Com quem é a conversa, do ponto de vista de quem recebe. */
  contraparteId: string
  mensagem: Mensagem
}

export interface EventoDigitando {
  contraparteId: string
  digitando: boolean
}

export interface EventoLeitura {
  contraparteId: string
  lidoEm: string
}

export interface OpcoesAssinatura {
  /** A contraparte começou ou parou de digitar. */
  aoDigitar?: (evento: EventoDigitando) => void
  /** A contraparte leu as mensagens até agora. */
  aoLer?: (evento: EventoLeitura) => void
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Divide o texto que chega no fluxo em eventos SSE completos.
 *
 * Um evento termina em linha em branco. O `resto` que sobra é o começo de um
 * evento ainda incompleto — a leitura corta em qualquer ponto, inclusive no
 * meio de um JSON, então ele precisa esperar o próximo pedaço.
 */
function separarEventos(buffer: string) {
  const partes = buffer.split('\n\n')
  const resto = partes.pop() ?? ''
  const eventos = partes.map((bloco) => {
    let tipo = 'message'
    const dados: string[] = []
    for (const linha of bloco.split('\n')) {
      if (linha.startsWith('event:')) tipo = linha.slice(6).trim()
      else if (linha.startsWith('data:')) dados.push(linha.slice(5).trim())
    }
    return { tipo, dados: dados.join('\n') }
  })
  return { eventos, resto }
}

/**
 * Mantém aberta uma conexão com `/mensagens/stream` e chama `aoReceber` a cada
 * mensagem nova, para o painel não depender de o usuário atualizar a página.
 *
 * Usa `fetch` em vez de `EventSource` porque o `EventSource` não deixa mandar
 * cabeçalho: com ele o token de acesso teria que ir na URL, onde acabaria
 * gravado em log de servidor e histórico do navegador.
 *
 * Devolve a função que encerra a assinatura.
 */
export function assinarMensagens(
  aoReceber: (evento: EventoMensagem) => void,
  opcoes: OpcoesAssinatura = {},
): () => void {
  const controller = new AbortController()
  let encerrado = false
  let falhasSeguidas = 0

  async function ler(corpo: ReadableStream<Uint8Array>) {
    const leitor = corpo.getReader()
    // `stream: true` guarda os bytes de um caractere multibyte que ficou
    // partido entre dois pedaços — acentos são a regra aqui.
    const decodificador = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await leitor.read()
      if (done) return
      buffer += decodificador.decode(value, { stream: true })
      const { eventos, resto } = separarEventos(buffer)
      buffer = resto
      for (const evento of eventos) {
        // O batimento só serve para segurar a conexão; não vira nada na tela.
        if (!evento.dados) continue
        try {
          if (evento.tipo === 'mensagem') {
            aoReceber(JSON.parse(evento.dados) as EventoMensagem)
          } else if (evento.tipo === 'digitando') {
            opcoes.aoDigitar?.(JSON.parse(evento.dados) as EventoDigitando)
          } else if (evento.tipo === 'lida') {
            opcoes.aoLer?.(JSON.parse(evento.dados) as EventoLeitura)
          }
        } catch {
          // Um evento malformado não pode derrubar o canal inteiro.
        }
      }
    }
  }

  async function conectar() {
    while (!encerrado) {
      try {
        const token = localStorage.getItem('@NutriCare:accessToken')
        if (!token) throw new Error('sem sessão')

        const resposta = await fetch(`${API_URL}/mensagens/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        })

        if (resposta.status === 401) {
          // A conexão fica aberta por horas e o token de acesso expira antes.
          // Esta chamada passa pelo interceptor do axios, que renova a sessão;
          // na volta do laço o token novo já está no localStorage.
          await api.get('/mensagens/nao-lidas').catch(() => undefined)
          throw new Error('sessão expirada')
        }
        if (!resposta.ok || !resposta.body) {
          throw new Error(`stream respondeu ${resposta.status}`)
        }

        falhasSeguidas = 0
        // Só o estado do canal: nada do que trafega por ele é registrado.
        log.info('realtime conectado')
        await ler(resposta.body)
        log.info('realtime desconectado')
      } catch (erro) {
        if (encerrado) return
        log.warn('realtime caiu', { tipo: (erro as Error)?.message ?? 'Error' })
      }

      // Recuo progressivo: se a API caiu, não adianta martelar de 1 em 1 s.
      falhasSeguidas += 1
      const espera = Math.min(1000 * 2 ** falhasSeguidas, 30_000)
      log.debug('realtime reconectando', { tentativa: falhasSeguidas, emMs: espera })
      await esperar(espera)
    }
  }

  void conectar()

  return () => {
    encerrado = true
    controller.abort()
  }
}
