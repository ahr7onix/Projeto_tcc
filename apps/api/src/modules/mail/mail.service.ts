import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EnvioEmailResultado {
  enviado: boolean;
  previewUrl?: string;
}

/**
 * Tempo máximo para falar com o servidor de e-mail. O padrão do nodemailer é
 * 2 minutos: com a porta bloqueada (o plano gratuito do Render bloqueia 25,
 * 465 e 587), o "esqueci a senha" ficava 2 minutos carregando antes de
 * responder — conferido no servidor publicado, 121 segundos.
 */
export const LIMITES_SMTP = {
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporterPromise: Promise<Transporter> | null = null;

  constructor(private readonly config: ConfigService) {}

  async enviarRedefinicaoSenha(opts: {
    para: string;
    nome: string;
    resetUrl: string;
  }): Promise<EnvioEmailResultado> {
    const transporter = await this.getTransporter();
    const from =
      this.config.get<string>('SMTP_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      'NutriCare <onboarding@resend.dev>';

    const primeiroNome = opts.nome.trim().split(/\s+/)[0] || opts.nome;
    const info = await transporter.sendMail({
      from,
      to: opts.para,
      subject: 'NutriCare — redefinir sua senha',
      text: [
        `Olá, ${primeiroNome}.`,
        '',
        'Recebemos um pedido para redefinir a senha do painel profissional NutriCare (nutricionistas e administradores).',
        'Abra o link abaixo (válido por 1 hora):',
        opts.resetUrl,
        '',
        'Se você não pediu isso, ignore este e-mail.',
        '',
        '— Equipe NutriCare',
      ].join('\n'),
      html: buildResetEmailHtml({
        nome: primeiroNome,
        resetUrl: opts.resetUrl,
      }),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      this.logger.log(`Prévia do e-mail (Ethereal): ${previewUrl}`);
    }
    this.logger.log(`E-mail de redefinição enviado para ${opts.para}`);
    return { enviado: true, previewUrl: previewUrl || undefined };
  }

  /**
   * Há servidor de e-mail de verdade? Sem SMTP o envio cai no Ethereal, que
   * só gera uma prévia no log: a tela não pode dizer "enviamos" nesse caso.
   */
  get envioReal(): boolean {
    return Boolean(this.config.get<string>('SMTP_HOST')?.trim());
  }

  /** Conta criada por outra pessoa: o link serve para o dono criar a senha. */
  async enviarBoasVindas(opts: {
    para: string;
    nome: string;
    link: string;
    autor: string;
    perfil: 'paciente' | 'nutricionista';
    validadeDias: number;
  }): Promise<EnvioEmailResultado> {
    const transporter = await this.getTransporter();
    const from =
      this.config.get<string>('SMTP_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      'NutriCare <onboarding@resend.dev>';
    const primeiroNome = opts.nome.trim().split(/\s+/)[0] || opts.nome;

    const paragrafos =
      opts.perfil === 'paciente'
        ? [
            `${opts.autor} cadastrou você no NutriCare, o aplicativo de acompanhamento nutricional para pessoas com diabetes.`,
            `Crie sua senha pelo link abaixo (válido por ${opts.validadeDias} dias). Depois, entre no aplicativo NutriCare com este e-mail e a senha criada.`,
            `No aplicativo, você decide se aceita o acompanhamento de ${opts.autor}: nada dos seus dados de saúde fica visível antes disso.`,
          ]
        : [
            `${opts.autor} cadastrou você no painel profissional do NutriCare.`,
            `Crie sua senha pelo link abaixo (válido por ${opts.validadeDias} dias) e depois entre no painel com este e-mail.`,
          ];

    const info = await transporter.sendMail({
      from,
      to: opts.para,
      subject: 'NutriCare — crie sua senha',
      text: [
        `Olá, ${primeiroNome}.`,
        '',
        ...paragrafos.flatMap((p) => [p, '']),
        opts.link,
        '',
        'Se você não esperava este e-mail, pode ignorá-lo.',
        '',
        '— Equipe NutriCare',
      ].join('\n'),
      html: buildBoasVindasHtml({ nome: primeiroNome, paragrafos, link: opts.link }),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      this.logger.log(`Prévia do e-mail (Ethereal): ${previewUrl}`);
    }
    this.logger.log(`E-mail de boas-vindas enviado para ${opts.para}`);
    return { enviado: true, previewUrl: previewUrl || undefined };
  }

  private getTransporter(): Promise<Transporter> {
    if (!this.transporterPromise) {
      this.transporterPromise = this.createTransporter();
    }
    return this.transporterPromise;
  }

  private async createTransporter(): Promise<Transporter> {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    const port = Number(this.config.get<string>('SMTP_PORT') || 587);

    if (host) {
      this.logger.log(`SMTP configurado: ${host}:${port}`);
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        ...(user && pass ? { auth: { user, pass } } : {}),
        ...LIMITES_SMTP,
      });
    }

    // Em produção, sem SMTP não há para onde mandar: a prévia do Ethereal só
    // vai para o log, que ninguém lê, e a porta dele é bloqueada no Render.
    // Desiste na hora, e quem chamou trata como "e-mail não enviado".
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.warn(
        'SMTP não configurado em produção — nenhum e-mail será enviado. Ver docs/PUBLICAR.md, seção "E-mail".',
      );
      throw new Error('SMTP não configurado');
    }

    // Em desenvolvimento: conta de teste Ethereal (e-mail "falso" com link de prévia).
    this.logger.warn(
      'SMTP não configurado — usando Ethereal (prévia no log). Defina SMTP_HOST/SMTP_USER/SMTP_PASS para e-mail real.',
    );
    const test = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: test.smtp.host,
      port: test.smtp.port,
      secure: test.smtp.secure,
      auth: { user: test.user, pass: test.pass },
      ...LIMITES_SMTP,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBoasVindasHtml(opts: { nome: string; paragrafos: string[]; link: string }): string {
  const link = escapeHtml(opts.link);
  const corpo = opts.paragrafos
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#475467;">${escapeHtml(p)}</p>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Crie sua senha — NutriCare</title></head>
<body style="margin:0;padding:24px 12px;background:#f5f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e7ee;border-radius:12px;">
        <tr><td style="padding:32px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#005eb8;">NutriCare</p>
          <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#101828;">Olá, ${escapeHtml(opts.nome)}</h1>
          ${corpo}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 24px;">
            <tr><td bgcolor="#005eb8" style="border-radius:999px;">
              <a href="${link}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Criar minha senha</a>
            </td></tr>
          </table>
          <p style="margin:0 0 6px;font-size:12px;color:#78829d;">Se o botão não funcionar, copie este link no navegador:</p>
          <p style="margin:0 0 20px;font-size:12px;word-break:break-all;"><a href="${link}" style="color:#005eb8;">${link}</a></p>
          <p style="margin:0;font-size:13px;color:#78829d;">Se você não esperava este e-mail, pode ignorá-lo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildResetEmailHtml(opts: { nome: string; resetUrl: string }): string {
  const nome = escapeHtml(opts.nome);
  const resetUrl = escapeHtml(opts.resetUrl);

  // Layout em tabelas + estilos inline: melhor compatibilidade com Gmail.
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinir senha — NutriCare</title>
</head>
<body style="margin:0;padding:0;background:#0b001a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(160deg,#0b001a 0%,#1a0b2e 45%,#2d124d 100%);background-color:#0b001a;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-collapse:separate;">

          <!-- Marca -->
          <tr>
            <td align="center" style="padding:0 0 18px;">
              <span style="display:inline-block;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.7);font-weight:700;">◆ NutriCare</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.35);">

              <!-- Faixa superior -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#6c22bd,#9d4edd);background-color:#6c22bd;height:6px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:36px 32px 28px;color:#1a1030;">

                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9d4edd;">
                      Painel do nutricionista
                    </p>

                    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:700;color:#14101f;letter-spacing:-0.02em;">
                      Redefinir sua senha
                    </h1>

                    <p style="margin:0 0 10px;font-size:16px;line-height:1.55;color:#3b3550;">
                      Olá, <strong style="color:#14101f;">${nome}</strong>
                    </p>

                    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#5c5670;">
                      Recebemos um pedido para redefinir a senha do
                      <strong style="color:#14101f;">painel profissional NutriCare</strong>
                      (acesso de nutricionistas e administradores).
                      Se foi você, clique no botão abaixo.
                    </p>

                    <!-- Botão -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
                      <tr>
                        <td align="center" bgcolor="#6c22bd" style="border-radius:999px;background:linear-gradient(90deg,#6c22bd,#9d4edd);background-color:#6c22bd;">
                          <a href="${opts.resetUrl}"
                             style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:999px;">
                            Redefinir senha
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Aviso -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
                      <tr>
                        <td style="background:#f6f1ff;border:1px solid #e6daf8;border-radius:14px;padding:14px 16px;">
                          <p style="margin:0;font-size:13px;line-height:1.5;color:#5b4a78;">
                            ⏱️ Este link é válido por <strong>1 hora</strong>. Depois disso, peça um novo em “Esqueceu a senha?”.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#8a849c;">
                      Se o botão não funcionar, copie e cole este link no navegador:
                    </p>
                    <p style="margin:0 0 22px;font-size:12px;line-height:1.5;word-break:break-all;">
                      <a href="${opts.resetUrl}" style="color:#6c22bd;text-decoration:underline;">${resetUrl}</a>
                    </p>

                    <p style="margin:0;font-size:13px;line-height:1.55;color:#8a849c;">
                      Não foi você? Pode ignorar este e-mail com segurança — sua senha atual continua a mesma.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Rodapé do card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:18px 32px 24px;border-top:1px solid #efeaf7;background:#fbf9ff;">
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#9a93ad;text-align:center;">
                      NutriCare · painel do nutricionista · pacientes usam o aplicativo mobile
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Rodapé externo -->
          <tr>
            <td align="center" style="padding:20px 8px 8px;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:rgba(255,255,255,0.45);">
                Este e-mail foi enviado automaticamente. Não responda esta mensagem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
