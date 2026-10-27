/**
 * Pode a resposta trazer o link de criar ou redefinir senha?
 *
 * Só em desenvolvimento e teste, e só quando isso está dito. Antes a regra
 * era "tudo que não for produção", e o render.yaml não define NODE_ENV: no
 * ambiente publicado, qualquer pessoa que pedisse "esqueci a senha" com o
 * e-mail de outra recebia na resposta o link para trocar a senha dela.
 * Variável ausente agora conta como produção.
 */
export function expoeLinksDeTeste(nodeEnv: string | undefined): boolean {
  const ambiente = (nodeEnv ?? '').trim().toLowerCase();
  return ambiente === 'development' || ambiente === 'test';
}
