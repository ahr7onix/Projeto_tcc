/**
 * Cliente mínimo da central de monitoramento (lado navegador).
 *
 * A central é outro projeto (`monitoramento-nutricare`); aqui existe só o
 * enfileirador. Regras que valem para todo o arquivo:
 *
 *   - nada de bloquear a tela: envio em lote, fora do caminho do render;
 *   - fila pequena e com teto, para não crescer numa aba deixada aberta;
 *   - throttle e deduplicação: um erro que se repete a cada render não pode
 *     virar dezenas de requisições (era o risco explícito do requisito);
 *   - a chave usada aqui é a PÚBLICA. Chave em bundle de navegador é pública
 *     na prática; por isso a central só aceita dela origem `frontend`, com
 *     limite de taxa menor e sem nenhum acesso de leitura ao painel;
 *   - nunca enviar token, senha, corpo de requisição ou dado de paciente.
 */

type Nivel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

interface Evento {
  nivel: Nivel
  mensagem: string
  tipo?: string
  statusHttp?: number | null
  metodo?: string | null
  endpoint?: string | null
  duracaoMs?: number | null
  stack?: string | null
}

const ATIVO =
  import.meta.env.VITE_MONITORING_ENABLED === 'true' &&
  Boolean(import.meta.env.VITE_MONITORING_API_URL) &&
  Boolean(import.meta.env.VITE_MONITORING_PUBLIC_KEY)

const BASE = String(import.meta.env.VITE_MONITORING_API_URL ?? '').replace(/\/+$/, '')
const CHAVE = String(import.meta.env.VITE_MONITORING_PUBLIC_KEY ?? '')

const TETO_DA_FILA = 30
const INTERVALO_MS = 8000
const TIMEOUT_MS = 2000
/** Mesmo erro dentro desta janela conta uma vez só. */
const JANELA_DE_REPETICAO_MS = 60_000
/** Teto duro por sessão: protege contra laço de render que erra sem parar. */
const MAXIMO_POR_SESSAO = 100

const fila: Record<string, unknown>[] = []
const vistos = new Map<string, number>()
let enviados = 0
let temporizador: number | null = null
let pausadoAte = 0

/** Redação local. A central sanitiza de novo, mas nada sensível deve sair daqui. */
const PADROES: [RegExp, string][] = [
  [/\b(senha|password|token|api[_-]?key|secret|authorization)"?\s*[=:]\s*("[^"]*"|[^\s,;&)]+)/gi, '$1=[REDACTED]'],
  [/\beyJ[A-Za-z0-9._-]{10,}/g, '[REDACTED]'],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[REDACTED]'],
  [/\b([A-Za-z0-9._%+-]{1,2})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '$1***@$2'],
]

function limpar(texto: string): string {
  return PADROES.reduce((acc, [padrao, troca]) => acc.replace(padrao, troca), texto).slice(0, 1000)
}

/** Query string pode carregar e-mail e token: fica só o caminho. */
function limparRota(valor: string): string {
  const semQuery = valor.split('?')[0]
  return limpar(semQuery).slice(0, 300)
}

function assinatura(evento: Evento): string {
  return [evento.nivel, evento.tipo, evento.statusHttp, evento.endpoint, evento.mensagem].join('|')
}

function agendar() {
  if (temporizador !== null) return
  temporizador = window.setTimeout(() => {
    temporizador = null
    void esvaziar()
  }, INTERVALO_MS)
}

async function esvaziar(saindo = false) {
  if (fila.length === 0 || !ATIVO) return
  if (!saindo && Date.now() < pausadoAte) return

  const lote = fila.splice(0, fila.length)
  const corpo = JSON.stringify({ events: lote })

  // `keepalive` deixa a requisição terminar mesmo com a aba fechando — é o
  // que `sendBeacon` faria, mas mantendo o cabeçalho `X-API-Key`. Com beacon a
  // chave teria de ir na URL e acabaria no log de acesso de todo intermediário.
  try {
    const resposta = await fetch(`${BASE}/api/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': CHAVE },
      body: corpo,
      keepalive: true,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    // Central fora do ar ou recusando: para de tentar por um tempo em vez de
    // insistir a cada erro da tela.
    if (!resposta.ok && resposta.status >= 500) pausadoAte = Date.now() + 120_000
  } catch {
    pausadoAte = Date.now() + 120_000
  }
}

/** Ponto de entrada. Síncrono, silencioso e à prova de erro. */
export function registrarNaCentral(evento: Evento): void {
  if (!ATIVO || enviados >= MAXIMO_POR_SESSAO) return

  try {
    const chave = assinatura(evento)
    const agora = Date.now()
    const ultimo = vistos.get(chave)
    if (ultimo && agora - ultimo < JANELA_DE_REPETICAO_MS) return
    vistos.set(chave, agora)
    if (vistos.size > 200) vistos.clear()

    if (fila.length >= TETO_DA_FILA) fila.shift()
    enviados += 1

    fila.push({
      application: import.meta.env.VITE_MONITORING_APP ?? 'nutricare',
      service: 'frontend-web',
      origin: 'frontend',
      environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
      level: evento.nivel,
      type: evento.tipo ?? null,
      message: limpar(evento.mensagem),
      statusCode: evento.statusHttp ?? null,
      method: evento.metodo ?? null,
      endpoint: evento.endpoint ? limparRota(evento.endpoint) : null,
      durationMs: evento.duracaoMs ?? null,
      version: import.meta.env.VITE_APP_VERSION ?? null,
      stack: evento.stack ? limpar(evento.stack.split('\n').slice(0, 10).join('\n')) : null,
      metadata: {
        // Contexto do requisito: página, rota, navegador e sistema. Nada disso
        // identifica a pessoa — é a mesma informação que qualquer servidor web
        // já registra.
        page: limparRota(window.location.pathname),
        userAgent: navigator.userAgent.slice(0, 200),
        language: navigator.language,
      },
      timestamp: new Date().toISOString(),
    })

    agendar()
  } catch {
    // Monitoramento não pode ser a causa de uma tela quebrada.
  }
}

/** Chamado uma vez no boot, junto de `capturarErrosGlobais`. */
export function iniciarMonitoramento(): void {
  if (!ATIVO) return
  // `pagehide` cobre também o navegador móvel, onde `beforeunload` não dispara.
  window.addEventListener('pagehide', () => void esvaziar(true))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void esvaziar(true)
  })
}

export const monitoramentoAtivo = ATIVO
