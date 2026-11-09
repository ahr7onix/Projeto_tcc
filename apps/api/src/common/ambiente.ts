/**
 * Pode a resposta da API trazer o link de criar ou redefinir senha?
 *
 * Só quando o ambiente pede (RESET_LINK_NA_RESPOSTA=true, no .env de
 * desenvolvimento) e nunca em produção. É um atalho para testar sem caixa de
 * e-mail. Antes bastava NODE_ENV não ser "production", e o render.yaml não
 * definia NODE_ENV: no servidor publicado, quem pedisse "esqueci a senha" com
 * o e-mail de outra pessoa recebia na resposta o link para trocar a senha dela.
 *
 * Vale para o "esqueci a senha" e para o link de boas-vindas dos cadastros
 * feitos pelo painel.
 */
export function expoeLinkDeSenha(config: { get<T = string>(chave: string): T | undefined }): boolean {
  return (
    config.get<string>('RESET_LINK_NA_RESPOSTA') === 'true' &&
    config.get<string>('NODE_ENV') !== 'production'
  );
}

/**
 * Cadastro aberto para teste (CADASTRO_TESTE_ABERTO=true), temporário.
 *
 * Quem se cadastra pelo painel entra sem esperar a aprovação da administração
 * e ganha uma conta de paciente de teste (mesmo e-mail com "+app" antes do @)
 * para usar o aplicativo. O vínculo entre as duas contas continua nascendo do
 * convite que o paciente aceita no app. Desligado por padrão; desligar antes de
 * qualquer uso com paciente de verdade.
 */
export function cadastroTesteAberto(config: { get<T = string>(chave: string): T | undefined }): boolean {
  return config.get<string>('CADASTRO_TESTE_ABERTO') === 'true';
}

/** E-mail da conta de paciente de teste: `ana@x.com` vira `ana+app@x.com`. */
export function emailDaContaDoApp(email: string): string {
  const arroba = email.lastIndexOf('@');
  return `${email.slice(0, arroba)}+app${email.slice(arroba)}`;
}
