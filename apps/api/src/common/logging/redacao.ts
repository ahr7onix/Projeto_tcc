/**
 * Higiene dos logs.
 *
 * O NutriCare trafega dado pessoal e dado de saúde. Nada que passe por aqui
 * pode carregar senha, token, cabeçalho Authorization, cookie, CPF, glicemia,
 * conteúdo de mensagem ou prontuário. A regra é lista de bloqueio por nome de
 * campo: se o nome bate, o valor nem chega a ser lido.
 */

/**
 * Nomes de campo cujo valor nunca é escrito em log. Comparação por trecho, em
 * minúsculas — `senhaAtual`, `nova_senha` e `SENHA` caem todos aqui.
 */
const CAMPOS_PROIBIDOS = [
  'senha',
  'password',
  'token',
  'jwt',
  'authorization',
  'cookie',
  'secret',
  'segredo',
  'chave',
  'apikey',
  'api_key',
  'credential',
  'hash',
  'cpf',
  'rg',
  'conteudo',
  'mensagem',
  'prontuario',
  'anotacao',
  'observacao',
  'glicemia',
  'glicose',
  'peso',
  'altura',
  'imc',
  'medicamento',
  'diagnostico',
  'nascimento',
  'telefone',
  'celular',
  'endereco',
];

const MARCA = '[REDACTED]';
const LIMITE_TEXTO = 200;
const LIMITE_CAMPOS = 25;
const PROFUNDIDADE_MAXIMA = 3;

export function campoProibido(nome: string): boolean {
  const alvo = nome.toLowerCase();
  return CAMPOS_PROIBIDOS.some((proibido) => alvo.includes(proibido));
}

/**
 * `joao@gmail.com` -> `jo***@gmail.com`. O domínio fica porque ajuda a
 * distinguir contas de teste das reais sem identificar a pessoa.
 */
export function mascararEmail(email: unknown): string {
  if (typeof email !== 'string' || !email.includes('@')) return MARCA;
  const [local, dominio] = email.split('@');
  const visivel = local.slice(0, local.length > 2 ? 2 : 1);
  return `${visivel}***@${dominio}`;
}

/** Só os primeiros caracteres, para correlacionar sessões sem permitir reuso. */
export function mascararToken(token: unknown): string {
  if (typeof token !== 'string' || token.length < 8) return MARCA;
  return `${token.slice(0, 4)}…(${token.length})`;
}

/**
 * Varre um objeto antes de ele virar log: apaga campo proibido, corta texto
 * longo, limita profundidade e quantidade de campos. Corta ciclos.
 */
export function limparDados(valor: unknown, profundidade = 0): unknown {
  if (valor === null || valor === undefined) return valor;

  if (typeof valor === 'string') {
    return valor.length > LIMITE_TEXTO ? `${valor.slice(0, LIMITE_TEXTO)}…` : valor;
  }

  if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
  if (valor instanceof Date) return valor.toISOString();

  if (profundidade >= PROFUNDIDADE_MAXIMA) return '[…]';

  if (Array.isArray(valor)) {
    return valor.slice(0, 5).map((item) => limparDados(item, profundidade + 1));
  }

  if (typeof valor === 'object') {
    const saida: Record<string, unknown> = {};
    let contados = 0;
    for (const [chave, item] of Object.entries(valor as Record<string, unknown>)) {
      if (contados >= LIMITE_CAMPOS) {
        saida['…'] = 'campos omitidos';
        break;
      }
      contados += 1;
      if (campoProibido(chave)) {
        saida[chave] = MARCA;
      } else if (chave.toLowerCase().includes('email')) {
        saida[chave] = mascararEmail(item);
      } else {
        saida[chave] = limparDados(item, profundidade + 1);
      }
    }
    return saida;
  }

  return MARCA;
}

/**
 * Query string também vai para o log junto da rota. `?email=joao@x.com` não
 * pode aparecer inteiro, então cada valor passa pela mesma regra.
 */
export function limparUrl(url: string): string {
  const corte = url.indexOf('?');
  if (corte === -1) return url;

  const caminho = url.slice(0, corte);
  const parametros = new URLSearchParams(url.slice(corte + 1));
  const limpos: string[] = [];

  for (const [chave, valor] of parametros.entries()) {
    if (campoProibido(chave)) limpos.push(`${chave}=${MARCA}`);
    else if (chave.toLowerCase().includes('email')) limpos.push(`${chave}=${mascararEmail(valor)}`);
    else limpos.push(`${chave}=${valor.slice(0, 40)}`);
  }

  return limpos.length ? `${caminho}?${limpos.join('&')}` : caminho;
}
