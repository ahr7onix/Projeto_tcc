import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { CreateMensagemDto } from './dto/create-mensagem.dto';
import { PushService } from '../push/push.service';

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 200;

interface MensagemRow {
  id_mensagem: string;
  id_vinculo: string;
  id_remetente: string;
  remetente_nome: string;
  remetente_tipo: string;
  conteudo: string;
  lida_em: Date | null;
  criado_em: Date;
}

@Injectable()
export class MensagensService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly push: PushService,
  ) {}

  private async buscarVinculo(user: JwtPayload, contraparteId: string) {
    const coluna =
      user.role === 'paciente'
        ? { proprio: 'up.id_usuario', outro: 'un.id_usuario' }
        : { proprio: 'un.id_usuario', outro: 'up.id_usuario' };

    const { rows } = await this.pool.query(
      `SELECT np.id_vinculo,
              up.id_usuario AS paciente_id,
              up.nome       AS paciente_nome,
              un.id_usuario AS nutricionista_id,
              un.nome       AS nutricionista_nome
         FROM nutricionista_paciente np
         JOIN paciente p      ON p.id_paciente = np.id_paciente
         JOIN usuario  up     ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN usuario  un     ON un.id_usuario = n.id_usuario
        WHERE np.ativo = TRUE
          AND ${coluna.proprio} = $1
          AND ${coluna.outro} = $2
        LIMIT 1`,
      [user.sub, contraparteId],
    );

    if (!rows[0]) {
      throw new ForbiddenException(
        'Não existe vínculo ativo com este usuário',
      );
    }
    return rows[0];
  }

  private mapMensagem(r: MensagemRow, user: JwtPayload) {
    return {
      id: String(r.id_mensagem),
      conteudo: r.conteudo,
      remetenteId: String(r.id_remetente),
      remetenteNome: r.remetente_nome,
      remetenteTipo: r.remetente_tipo,
      propria: String(r.id_remetente) === user.sub,
      lida: r.lida_em !== null,
      criadoEm: r.criado_em,
    };
  }

  async listarConversas(user: JwtPayload) {
    const coluna = user.role === 'paciente' ? 'up.id_usuario' : 'un.id_usuario';
    const contraparte =
      user.role === 'paciente'
        ? { id: 'un.id_usuario', nome: 'un.nome' }
        : { id: 'up.id_usuario', nome: 'up.nome' };

    const { rows } = await this.pool.query(
      `SELECT np.id_vinculo,
              ${contraparte.id}   AS contraparte_id,
              ${contraparte.nome} AS contraparte_nome,
              (SELECT m.conteudo FROM mensagem m
                WHERE m.id_vinculo = np.id_vinculo
                ORDER BY m.criado_em DESC LIMIT 1) AS ultima_mensagem,
              (SELECT m.criado_em FROM mensagem m
                WHERE m.id_vinculo = np.id_vinculo
                ORDER BY m.criado_em DESC LIMIT 1) AS ultima_em,
              (SELECT COUNT(*) FROM mensagem m
                WHERE m.id_vinculo = np.id_vinculo
                  AND m.id_remetente <> $1
                  AND m.lida_em IS NULL) AS nao_lidas
         FROM nutricionista_paciente np
         JOIN paciente p      ON p.id_paciente = np.id_paciente
         JOIN usuario  up     ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN usuario  un     ON un.id_usuario = n.id_usuario
        WHERE np.ativo = TRUE AND ${coluna} = $1
        ORDER BY ultima_em DESC NULLS LAST, contraparte_nome`,
      [user.sub],
    );

    return {
      data: rows.map((r) => ({
        vinculoId: String(r.id_vinculo),
        contraparteId: String(r.contraparte_id),
        contraparteNome: r.contraparte_nome,
        ultimaMensagem: r.ultima_mensagem ?? null,
        ultimaEm: r.ultima_em ?? null,
        naoLidas: Number(r.nao_lidas),
      })),
    };
  }

  async listarMensagens(
    user: JwtPayload,
    contraparteId: string,
    limite?: number,
  ) {
    const vinculo = await this.buscarVinculo(user, contraparteId);
    const max = Math.min(limite && limite > 0 ? limite : LIMITE_PADRAO, LIMITE_MAXIMO);

    const { rows } = await this.pool.query<MensagemRow>(
      `SELECT m.id_mensagem, m.id_vinculo, m.id_remetente,
              u.nome AS remetente_nome,
              u.tipo AS remetente_tipo,
              m.conteudo, m.lida_em, m.criado_em
         FROM mensagem m
         JOIN usuario u ON u.id_usuario = m.id_remetente
        WHERE m.id_vinculo = $1
        ORDER BY m.criado_em DESC
        LIMIT $2`,
      [vinculo.id_vinculo, max],
    );

    await this.pool.query(
      `UPDATE mensagem
          SET lida_em = NOW()
        WHERE id_vinculo = $1
          AND id_remetente <> $2
          AND lida_em IS NULL`,
      [vinculo.id_vinculo, user.sub],
    );

    return {
      contraparte: {
        id: String(contraparteId),
        nome:
          user.role === 'paciente'
            ? vinculo.nutricionista_nome
            : vinculo.paciente_nome,
      },
      data: rows.reverse().map((r) => this.mapMensagem(r, user)),
    };
  }

  async enviar(user: JwtPayload, dto: CreateMensagemDto) {
    const vinculo = await this.buscarVinculo(user, dto.destinatarioId);

    const { rows } = await this.pool.query<MensagemRow>(
      `INSERT INTO mensagem (id_vinculo, id_remetente, conteudo)
       VALUES ($1, $2, $3)
       RETURNING id_mensagem, id_vinculo, id_remetente, conteudo, lida_em, criado_em`,
      [vinculo.id_vinculo, user.sub, dto.conteudo.trim()],
    );

    const r = rows[0];
    if (!r) throw new NotFoundException('Falha ao enviar mensagem');

    this.push
      .enviarPara(dto.destinatarioId, {
        titulo: 'Nova mensagem',
        corpo: dto.conteudo.trim().slice(0, 120),
        dados: { tipo: 'mensagem', remetenteId: user.sub },
      })
      .catch(() => undefined);

    return this.mapMensagem(
      { ...r, remetente_nome: '', remetente_tipo: user.role },
      user,
    );
  }

  async contarNaoLidas(user: JwtPayload) {
    const coluna = user.role === 'paciente' ? 'up.id_usuario' : 'un.id_usuario';

    const { rows } = await this.pool.query(
      `SELECT COUNT(*) AS total
         FROM mensagem m
         JOIN nutricionista_paciente np ON np.id_vinculo = m.id_vinculo
         JOIN paciente p      ON p.id_paciente = np.id_paciente
         JOIN usuario  up     ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN usuario  un     ON un.id_usuario = n.id_usuario
        WHERE np.ativo = TRUE
          AND ${coluna} = $1
          AND m.id_remetente <> $1
          AND m.lida_em IS NULL`,
      [user.sub],
    );

    return { naoLidas: Number(rows[0].total) };
  }
}
