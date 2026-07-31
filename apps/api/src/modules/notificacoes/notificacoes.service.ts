import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';

export const TIPOS_NOTIFICACAO = [
  'alerta_glicemia',
  'lembrete',
  'conteudo',
  'sistema',
] as const;

export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[number];

@Injectable()
export class NotificacoesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private mapNotificacao(r: Record<string, any>) {
    return {
      id: String(r.id_notificacao),
      tipo: r.tipo,
      titulo: r.titulo,
      mensagem: r.mensagem,
      lida: r.lida,
      criadoEm: r.criado_em,
    };
  }

  /**
   * Chamada por outros módulos (alertas de glicemia, publicação de conteúdo).
   * Guarda o histórico do que foi avisado — o push_token só diz para onde
   * enviar, não o que foi enviado.
   */
  async registrar(dados: {
    idUsuario: string;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO notificacao (id_usuario, tipo, titulo, mensagem)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [dados.idUsuario, dados.tipo, dados.titulo, dados.mensagem],
    );
    return this.mapNotificacao(rows[0]);
  }

  async listar(
    user: JwtPayload,
    filtros: { apenasNaoLidas?: boolean; limite?: number },
  ) {
    const limite = Math.min(Math.max(filtros.limite ?? 50, 1), 200);

    const { rows } = await this.pool.query(
      `SELECT * FROM notificacao
        WHERE id_usuario = $1
          ${filtros.apenasNaoLidas ? 'AND lida = FALSE' : ''}
        ORDER BY criado_em DESC
        LIMIT $2`,
      [user.sub, limite],
    );

    return { data: rows.map((r) => this.mapNotificacao(r)) };
  }

  /** Usado pelo badge da tela inicial: só o número, sem carregar a lista. */
  async naoLidas(user: JwtPayload) {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*)::int AS total FROM notificacao WHERE id_usuario = $1 AND lida = FALSE',
      [user.sub],
    );
    return { total: rows[0].total };
  }

  async marcarLida(user: JwtPayload, id: string) {
    const { rows } = await this.pool.query(
      `UPDATE notificacao SET lida = TRUE
        WHERE id_notificacao = $1 AND id_usuario = $2 RETURNING *`,
      [id, user.sub],
    );
    if (!rows.length) throw new NotFoundException('Notificação não encontrada');
    return this.mapNotificacao(rows[0]);
  }

  async marcarTodasLidas(user: JwtPayload) {
    const { rowCount } = await this.pool.query(
      'UPDATE notificacao SET lida = TRUE WHERE id_usuario = $1 AND lida = FALSE',
      [user.sub],
    );
    return { atualizadas: rowCount ?? 0 };
  }

  async remover(user: JwtPayload, id: string) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM notificacao WHERE id_notificacao = $1 AND id_usuario = $2',
      [id, user.sub],
    );
    if (!rowCount) throw new NotFoundException('Notificação não encontrada');
    return { mensagem: 'Notificação removida' };
  }
}
