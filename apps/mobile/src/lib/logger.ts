/**
 * Log do aplicativo: só informação técnica.
 *
 * Registra rota, status HTTP, tipo do erro e o `requestId` devolvido pela API
 * no cabeçalho `X-Request-Id`, que amarra a falha vista no celular à linha
 * correspondente no log do servidor.
 *
 * Nunca entram: token, senha, corpo de requisição ou resposta, dado de saúde,
 * conteúdo de mensagem — nada pessoal do usuário.
 */

type Nivel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// `__DEV__` é definido pelo Metro: `true` no Expo Go, `false` no APK de release.
const DEV = typeof __DEV__ !== 'undefined' && __DEV__;

function escrever(nivel: Nivel, mensagem: string, dados?: Record<string, unknown>) {
  // Em release o console fica só com o que indica defeito.
  if (!DEV && nivel !== 'ERROR' && nivel !== 'WARN') return;

  const linha = `[NutriCare] ${nivel} ${mensagem}`;
  if (nivel === 'ERROR') console.error(linha, dados ?? '');
  else if (nivel === 'WARN') console.warn(linha, dados ?? '');
  else console.log(linha, dados ?? '');
}

export const log = {
  debug: (m: string, d?: Record<string, unknown>) => escrever('DEBUG', m, d),
  info: (m: string, d?: Record<string, unknown>) => escrever('INFO', m, d),
  warn: (m: string, d?: Record<string, unknown>) => escrever('WARN', m, d),
  error: (m: string, d?: Record<string, unknown>) => escrever('ERROR', m, d),
};

interface ErroHttp {
  code?: string;
  config?: { method?: string; url?: string };
  response?: { status?: number; headers?: Record<string, unknown> };
}

/**
 * Uma linha por chamada que falhou. 401 é rotina (a sessão está sendo
 * renovada) e sai como WARN; 5xx e falta de rede são ERROR — no celular a
 * queda de rede é o caso mais comum e precisa aparecer.
 */
export function registrarErroDeApi(erro: unknown, contexto?: string) {
  const e = (erro ?? {}) as ErroHttp;
  const status = e.response?.status ?? 0;
  const rota = `${(e.config?.method ?? 'GET').toUpperCase()} ${e.config?.url ?? '?'}`;
  const requestId = e.response?.headers?.['x-request-id'];

  const dados: Record<string, unknown> = { status: status || 'sem resposta' };
  if (requestId) dados.requestId = requestId;
  if (contexto) dados.contexto = contexto;
  if (!status) dados.motivo = e.code ?? 'rede';

  if (status === 401) log.warn(`sessão recusada em ${rota}`, dados);
  else if (status >= 500 || status === 0) log.error(`falha em ${rota}`, dados);
  else log.warn(`erro em ${rota}`, dados);
}

/**
 * Erro de JavaScript que ninguém tratou. O handler anterior continua sendo
 * chamado — em desenvolvimento é ele que mostra a tela vermelha, e em release
 * é ele que encerra o app; aqui só registramos o tipo antes disso.
 */
export function capturarErrosGlobais() {
  const utils = (globalThis as { ErrorUtils?: {
    getGlobalHandler?: () => (erro: Error, fatal?: boolean) => void;
    setGlobalHandler?: (h: (erro: Error, fatal?: boolean) => void) => void;
  } }).ErrorUtils;

  if (!utils?.setGlobalHandler || !utils.getGlobalHandler) return;

  const anterior = utils.getGlobalHandler();
  utils.setGlobalHandler((erro, fatal) => {
    log.error('erro não tratado', { tipo: erro?.name ?? 'Error', fatal: Boolean(fatal) });
    anterior?.(erro, fatal);
  });
}
