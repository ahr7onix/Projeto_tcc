/**
 * Log do painel: só informação técnica.
 *
 * O que aparece aqui é rota, status HTTP, tipo do erro e o `requestId` que a
 * API devolve no cabeçalho `X-Request-Id` — é ele que liga o erro visto na
 * tela à linha correspondente no log do servidor.
 *
 * Nunca entram: token, senha, corpo da requisição, corpo da resposta, dado de
 * paciente ou conteúdo de mensagem.
 */

import { iniciarMonitoramento, registrarNaCentral } from './monitoring-client'

type Nivel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const DEV = import.meta.env.DEV

function escrever(nivel: Nivel, mensagem: string, dados?: Record<string, unknown>) {
  // Em produção o console fica só com o que indica defeito.
  if (!DEV && nivel !== 'ERROR' && nivel !== 'WARN') return

  const linha = `[NutriCare] ${nivel} ${mensagem}`
  if (nivel === 'ERROR') console.error(linha, dados ?? '')
  else if (nivel === 'WARN') console.warn(linha, dados ?? '')
  else console.log(linha, dados ?? '')
}

export const log = {
  debug: (m: string, d?: Record<string, unknown>) => escrever('DEBUG', m, d),
  info: (m: string, d?: Record<string, unknown>) => escrever('INFO', m, d),
  warn: (m: string, d?: Record<string, unknown>) => escrever('WARN', m, d),
  error: (m: string, d?: Record<string, unknown>) => escrever('ERROR', m, d),
}

interface ErroHttp {
  code?: string
  message?: string
  config?: { method?: string; url?: string }
  response?: { status?: number; headers?: Record<string, unknown> }
}

/**
 * Uma linha por chamada que falhou. 401 é rotina (sessão expirando e sendo
 * renovada) e sai como WARN; 5xx e queda de rede são ERROR.
 */
export function registrarErroDeApi(erro: unknown, contexto?: string) {
  const e = (erro ?? {}) as ErroHttp
  const status = e.response?.status ?? 0
  const rota = `${(e.config?.method ?? 'GET').toUpperCase()} ${e.config?.url ?? '?'}`
  const requestId = e.response?.headers?.['x-request-id']

  const dados: Record<string, unknown> = { status: status || 'sem resposta' }
  if (requestId) dados.requestId = requestId
  if (contexto) dados.contexto = contexto
  if (!status) dados.motivo = e.code ?? 'rede'

  if (status === 401) log.warn(`sessão recusada em ${rota}`, dados)
  else if (status >= 500 || status === 0) log.error(`falha em ${rota}`, dados)
  else log.warn(`erro em ${rota}`, dados)

  // Mesma informação, agora também para a central de monitoramento. 401 é
  // rotina de renovação de sessão e não vira erro lá.
  if (status !== 401) {
    registrarNaCentral({
      nivel: status >= 500 || status === 0 ? 'ERROR' : 'WARNING',
      tipo: status === 0 ? `REDE_${e.code ?? 'FALHA'}` : `HTTP_${status}`,
      mensagem: status === 0 ? `API inacessível em ${rota}` : `Falha em ${rota}`,
      statusHttp: status || null,
      metodo: (e.config?.method ?? 'GET').toUpperCase(),
      endpoint: e.config?.url ?? null,
    })
  }
}

/**
 * Erro de JavaScript que escapou de um componente e promessa rejeitada sem
 * tratamento — os dois casos em que a tela quebra sem ninguém registrar nada.
 */
export function capturarErrosGlobais() {
  window.addEventListener('error', (evento) => {
    log.error('erro não tratado', {
      tipo: evento.error?.name ?? 'Error',
      origem: `${evento.filename ?? '?'}:${evento.lineno ?? 0}`,
    })
    registrarNaCentral({
      nivel: 'ERROR',
      tipo: evento.error?.name ?? 'Error',
      mensagem: evento.message || 'Erro não tratado na interface',
      endpoint: window.location.pathname,
      stack: evento.error?.stack ?? null,
    })
  })

  window.addEventListener('unhandledrejection', (evento) => {
    const motivo = evento.reason as { name?: string; message?: string; stack?: string } | undefined
    log.error('promessa rejeitada sem tratamento', { tipo: motivo?.name ?? 'Error' })
    registrarNaCentral({
      nivel: 'ERROR',
      tipo: motivo?.name ?? 'UnhandledRejection',
      mensagem: motivo?.message || 'Promessa rejeitada sem tratamento',
      endpoint: window.location.pathname,
      stack: motivo?.stack ?? null,
    })
  })

  // Registra a descarga da fila ao sair da página; sem isso o último erro
  // antes de fechar a aba se perderia.
  iniciarMonitoramento()
}
