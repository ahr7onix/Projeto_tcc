import { expoeLinkDeSenha } from './ambiente';

const config = (env: Record<string, string>) => ({ get: (chave: string) => env[chave] as never });

describe('expoeLinkDeSenha', () => {
  it('should hide the link unless the environment asks for it, as on the published server', () => {
    expect(expoeLinkDeSenha(config({}))).toBe(false);
    expect(expoeLinkDeSenha(config({ NODE_ENV: 'development' }))).toBe(false);
  });

  it('should never show the link in production, even if asked', () => {
    expect(
      expoeLinkDeSenha(config({ RESET_LINK_NA_RESPOSTA: 'true', NODE_ENV: 'production' })),
    ).toBe(false);
  });

  it('should show the link when development asks for it', () => {
    expect(expoeLinkDeSenha(config({ RESET_LINK_NA_RESPOSTA: 'true' }))).toBe(true);
    expect(
      expoeLinkDeSenha(config({ RESET_LINK_NA_RESPOSTA: 'true', NODE_ENV: 'development' })),
    ).toBe(true);
  });
});
