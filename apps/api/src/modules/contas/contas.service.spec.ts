import type { ConfigService } from '@nestjs/config';
import type { MailService } from '../mail/mail.service';
import { ContasService, VALIDADE_LINK_DIAS } from './contas.service';

function montar(env: Record<string, string>, mail: Partial<MailService> = {}) {
  const config = { get: (chave: string) => env[chave] } as unknown as ConfigService;
  const mailMock = {
    envioReal: Boolean(env.SMTP_HOST),
    enviarBoasVindas: jest.fn(async () => ({ enviado: true })),
    ...mail,
  };
  return { service: new ContasService(config, mailMock as unknown as MailService), mailMock };
}

const envio = {
  para: 'rita@email.com',
  nome: 'Rita',
  link: 'http://painel/redefinir-senha?token=abc&boasvindas=1',
  autor: 'Dra. Camila',
  perfil: 'paciente' as const,
};

describe('ContasService', () => {
  describe('gerarLinkDefinirSenha', () => {
    it('should store only the token hash, valid for days, in the transaction given', async () => {
      const { service } = montar({ WEB_APP_URL: 'https://painel.exemplo/' });
      const db = { query: jest.fn(async () => ({ rows: [], rowCount: 1 })) };

      const link = await service.gerarLinkDefinirSenha(db as never, '40');

      const token = new URL(link).searchParams.get('token')!;
      const [, params] = db.query.mock.calls[0] as unknown as [string, unknown[]];
      expect(link.startsWith('https://painel.exemplo/redefinir-senha?token=')).toBe(true);
      expect(link.endsWith('&boasvindas=1')).toBe(true);
      expect(params[0]).toBe('40');
      expect(params[1]).toMatch(/^[0-9a-f]{64}$/);
      expect(params[1]).not.toBe(token);
      expect(params[2]).toBe(VALIDADE_LINK_DIAS);
    });
  });

  describe('enviarBoasVindas', () => {
    it('should never hand the link back in production, even if asked', async () => {
      const { service } = montar({
        NODE_ENV: 'production',
        RESET_LINK_NA_RESPOSTA: 'true',
        SMTP_HOST: 'smtp.exemplo',
      });
      await expect(service.enviarBoasVindas(envio)).resolves.toEqual({ emailEnviado: true });
    });

    it('should never hand the link back unless the environment asks for it', async () => {
      // É o caso do Render: sem a variável, o link não pode voltar na resposta.
      const { service } = montar({ SMTP_HOST: 'smtp.exemplo' });
      await expect(service.enviarBoasVindas(envio)).resolves.toEqual({ emailEnviado: true });
    });

    it('should hand the link back in development when asked, for testing', async () => {
      const { service } = montar({ RESET_LINK_NA_RESPOSTA: 'true', SMTP_HOST: 'smtp.exemplo' });
      await expect(service.enviarBoasVindas(envio)).resolves.toEqual({
        emailEnviado: true,
        linkDefinirSenha: envio.link,
      });
    });

    it('should not claim the e-mail was sent without a real SMTP server', async () => {
      // Sem SMTP o envio cai no Ethereal: "deu certo", mas ninguém recebe.
      const { service } = montar({ NODE_ENV: 'production' });
      await expect(service.enviarBoasVindas(envio)).resolves.toEqual({ emailEnviado: false });
    });

    it('should report a failed delivery instead of failing the registration', async () => {
      const { service } = montar(
        { NODE_ENV: 'production', SMTP_HOST: 'smtp.exemplo' },
        { enviarBoasVindas: jest.fn(async () => Promise.reject(new Error('smtp fora'))) },
      );
      await expect(service.enviarBoasVindas(envio)).resolves.toEqual({ emailEnviado: false });
    });
  });
});
