import type { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LIMITES_SMTP, MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn(async () => ({})) })),
  createTestAccount: jest.fn(async () => ({
    smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
    user: 'teste',
    pass: 'teste',
  })),
  getTestMessageUrl: jest.fn(() => false),
}));

const config = (env: Record<string, string>) =>
  ({ get: (chave: string) => env[chave] }) as unknown as ConfigService;

const envio = {
  para: 'rita@email.com',
  nome: 'Rita',
  link: 'http://painel/redefinir-senha?token=x',
  autor: 'Dra. Camila',
  perfil: 'paciente' as const,
  validadeDias: 7,
};

describe('MailService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should give up at once in production without SMTP, without trying Ethereal', async () => {
    // No Render a porta do Ethereal é bloqueada: tentar fazia a requisição
    // esperar 2 minutos antes de responder.
    const service = new MailService(config({ NODE_ENV: 'production' }));

    await expect(service.enviarBoasVindas(envio)).rejects.toThrow('SMTP não configurado');
    expect(nodemailer.createTestAccount).not.toHaveBeenCalled();
  });

  it('should still use Ethereal in development, for testing', async () => {
    const service = new MailService(config({ NODE_ENV: 'development' }));

    await expect(service.enviarBoasVindas(envio)).resolves.toEqual({
      enviado: true,
      previewUrl: undefined,
    });
    expect(nodemailer.createTestAccount).toHaveBeenCalled();
  });

  it('should put a time limit on every SMTP connection', async () => {
    const service = new MailService(
      config({ NODE_ENV: 'production', SMTP_HOST: 'smtp-relay.brevo.com', SMTP_PORT: '2525' }),
    );

    await service.enviarBoasVindas(envio);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp-relay.brevo.com', port: 2525, secure: false, ...LIMITES_SMTP }),
    );
  });
});
