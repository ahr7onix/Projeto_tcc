import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EnvioEmailResultado {
  enviado: boolean;
  previewUrl?: string;
}

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
      });
    }

    // Sem SMTP: conta de teste Ethereal (e-mail "falso" com link de prévia).
    this.logger.warn(
      'SMTP não configurado — usando Ethereal (prévia no log). Defina SMTP_HOST/SMTP_USER/SMTP_PASS para e-mail real.',
    );
    const test = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: test.smtp.host,
      port: test.smtp.port,
      secure: test.smtp.secure,
      auth: { user: test.user, pass: test.pass },
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
