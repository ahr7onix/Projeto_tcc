import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import type { Pool } from 'pg';
import { expoeLinkDeSenha } from '../../common/ambiente';
import { logger } from '../../common/logging/logger.service';
import { MailService } from '../mail/mail.service';

type Executor = { query: Pool['query'] };

/** A pessoa pode demorar a abrir o e-mail; depois disso, "Esqueci a senha". */
export const VALIDADE_LINK_DIAS = 7;

/**
 * Contas criadas por outra pessoa: o nutricionista cadastra o paciente, o
 * administrador cadastra o nutricionista. A conta nasce sem senha que alguém
 * conheça, e o dono cria a sua pelo link que chega no próprio e-mail.
 */
@Injectable()
export class ContasService {
  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /**
   * Usa a mesma tabela do "esqueci a senha", e por isso o mesmo uso único e o
   * mesmo hash — só a validade é maior. Recebe o executor para entrar na
   * transação de quem está criando a conta.
   */
  async gerarLinkDefinirSenha(db: Executor, idUsuario: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await db.query(
      `INSERT INTO senha_reset_token (id_usuario, token_hash, expira_em)
       VALUES ($1, $2, NOW() + make_interval(days => $3))`,
      [idUsuario, createHash('sha256').update(token).digest('hex'), VALIDADE_LINK_DIAS],
    );
    const webUrl = (this.config.get<string>('WEB_APP_URL') || 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    return `${webUrl}/redefinir-senha?token=${token}&boasvindas=1`;
  }

  /**
   * O link vai só para o e-mail do dono da conta e não volta para quem
   * cadastrou: com ele qualquer pessoa define a senha, e o nutricionista
   * poderia entrar como o paciente e aceitar o próprio convite.
   *
   * Em desenvolvimento, com RESET_LINK_NA_RESPOSTA=true, a resposta traz o
   * link, como o "esqueci a senha", para testar sem caixa de e-mail.
   */
  async enviarBoasVindas(opts: {
    para: string;
    nome: string;
    link: string;
    autor: string;
    perfil: 'paciente' | 'nutricionista';
  }): Promise<{ emailEnviado: boolean; linkDefinirSenha?: string }> {
    let emailEnviado = false;
    try {
      await this.mail.enviarBoasVindas({ ...opts, validadeDias: VALIDADE_LINK_DIAS });
      emailEnviado = this.mail.envioReal;
    } catch (err) {
      logger.escrever('WARN', 'contas: falha ao enviar e-mail de boas-vindas', {
        tipo: (err as Error)?.name ?? 'Error',
      });
    }

    return {
      emailEnviado,
      ...(expoeLinkDeSenha(this.config) ? { linkDefinirSenha: opts.link } : {}),
    };
  }
}
