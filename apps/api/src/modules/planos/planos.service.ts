import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { VinculosService } from '../vinculos/vinculos.service';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { CreatePlanoDto, RefeicaoPlanoDto } from './dto/create-plano.dto';
import type { UpdatePlanoDto } from './dto/update-plano.dto';

interface PlanoRow {
  id_plano: string;
  id_paciente: string;
  id_nutricionista: string;
  data_inicio: Date;
  data_fim: Date | null;
  criado_em: Date;
  paciente_usuario_id: string;
  paciente_nome: string;
  nutricionista_nome: string;
}

interface RefeicaoRow {
  id_refeicao: string;
  id_plano: string;
  nome_refeicao: string;
  horario: string;
  itens: string;
}

@Injectable()
export class PlanosService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private async resolvePacienteId(idUsuario: string): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT id_paciente FROM paciente WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Paciente não encontrado');
    return String(rows[0].id_paciente);
  }

  private async resolveNutricionistaId(idUsuario: string): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT id_nutricionista FROM nutricionista WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Nutricionista não encontrado');
    return String(rows[0].id_nutricionista);
  }

  private mapPlano(row: PlanoRow, refeicoes: RefeicaoRow[] = []) {
    const hoje = new Date().toISOString().slice(0, 10);
    const inicio = this.toDateString(row.data_inicio);
    const fim = row.data_fim ? this.toDateString(row.data_fim) : null;

    return {
      id: String(row.id_plano),
      pacienteId: String(row.paciente_usuario_id),
      pacienteNome: row.paciente_nome,
      nutricionistaNome: row.nutricionista_nome,
      dataInicio: inicio,
      dataFim: fim,
      ativo: inicio <= hoje && (fim === null || fim >= hoje),
      criadoEm: row.criado_em,
      refeicoes: refeicoes.map((r) => ({
        id: String(r.id_refeicao),
        nome: r.nome_refeicao,
        horario: String(r.horario).slice(0, 5),
        itens: r.itens,
      })),
    };
  }

  private toDateString(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);
  }

  private validarPeriodo(dataInicio: string, dataFim?: string | null) {
    if (dataFim && dataFim < dataInicio) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial',
      );
    }
  }

  private async inserirRefeicoes(
    client: PoolClient,
    idPlano: string,
    refeicoes: RefeicaoPlanoDto[],
  ) {
    for (const r of refeicoes) {
      await client.query(
        `INSERT INTO refeicao (id_plano, nome_refeicao, horario, itens)
         VALUES ($1, $2, $3, $4)`,
        [idPlano, r.nome.trim(), r.horario, r.itens.trim()],
      );
    }
  }

  private async buscarPlanoAutorizado(idPlano: string, user: JwtPayload) {
    const { rows } = await this.pool.query<PlanoRow>(
      `SELECT pa.*,
              up.id_usuario AS paciente_usuario_id,
              up.nome       AS paciente_nome,
              un.nome       AS nutricionista_nome,
              n.id_usuario  AS nutricionista_usuario_id
         FROM plano_alimentar pa
         JOIN paciente p       ON p.id_paciente = pa.id_paciente
         JOIN usuario  up      ON up.id_usuario = p.id_usuario
         JOIN nutricionista n  ON n.id_nutricionista = pa.id_nutricionista
         JOIN usuario  un      ON un.id_usuario = n.id_usuario
        WHERE pa.id_plano = $1`,
      [idPlano],
    );

    const row = rows[0] as (PlanoRow & { nutricionista_usuario_id: string }) | undefined;
    if (!row) throw new NotFoundException('Plano alimentar não encontrado');

    if (user.role === 'paciente' && String(row.paciente_usuario_id) !== user.sub) {
      throw new ForbiddenException('Acesso negado a este plano');
    }

    if (
      user.role === 'nutricionista' &&
      String(row.nutricionista_usuario_id) !== user.sub
    ) {
      throw new ForbiddenException(
        'Este plano pertence a outro nutricionista',
      );
    }

    return row;
  }

  async findAll(user: JwtPayload, pacienteId?: string) {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (user.role === 'paciente') {
      params.push(user.sub);
      conditions.push(`up.id_usuario = $${params.length}`);
    } else {
      params.push(user.sub);
      conditions.push(`un.id_usuario = $${params.length}`);
      if (pacienteId) {
        params.push(pacienteId);
        conditions.push(`up.id_usuario = $${params.length}`);
      }
    }

    const { rows } = await this.pool.query<PlanoRow>(
      `SELECT pa.*,
              up.id_usuario AS paciente_usuario_id,
              up.nome       AS paciente_nome,
              un.nome       AS nutricionista_nome
         FROM plano_alimentar pa
         JOIN paciente p      ON p.id_paciente = pa.id_paciente
         JOIN usuario  up     ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = pa.id_nutricionista
         JOIN usuario  un     ON un.id_usuario = n.id_usuario
        WHERE ${conditions.join(' AND ')}
        ORDER BY pa.data_inicio DESC`,
      params,
    );

    if (!rows.length) return { data: [] };

    const ids = rows.map((r) => r.id_plano);
    const { rows: refeicoes } = await this.pool.query<RefeicaoRow>(
      `SELECT id_refeicao, id_plano, nome_refeicao, horario, itens
         FROM refeicao
        WHERE id_plano = ANY($1::bigint[])
        ORDER BY horario`,
      [ids],
    );

    const porPlano = new Map<string, RefeicaoRow[]>();
    for (const r of refeicoes) {
      const key = String(r.id_plano);
      if (!porPlano.has(key)) porPlano.set(key, []);
      porPlano.get(key)!.push(r);
    }

    return {
      data: rows.map((row) =>
        this.mapPlano(row, porPlano.get(String(row.id_plano)) ?? []),
      ),
    };
  }

  async findOne(idPlano: string, user: JwtPayload) {
    const row = await this.buscarPlanoAutorizado(idPlano, user);
    const { rows: refeicoes } = await this.pool.query<RefeicaoRow>(
      `SELECT id_refeicao, id_plano, nome_refeicao, horario, itens
         FROM refeicao
        WHERE id_plano = $1
        ORDER BY horario`,
      [idPlano],
    );
    return this.mapPlano(row, refeicoes);
  }

  async findAtivo(user: JwtPayload, pacienteId?: string) {
    const alvo = user.role === 'paciente' ? user.sub : pacienteId;
    if (!alvo) throw new BadRequestException('Informe o pacienteId');

    const { rows } = await this.pool.query<PlanoRow>(
      `SELECT pa.*,
              up.id_usuario AS paciente_usuario_id,
              up.nome       AS paciente_nome,
              un.nome       AS nutricionista_nome
         FROM plano_alimentar pa
         JOIN paciente p      ON p.id_paciente = pa.id_paciente
         JOIN usuario  up     ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = pa.id_nutricionista
         JOIN usuario  un     ON un.id_usuario = n.id_usuario
        WHERE up.id_usuario = $1
          AND pa.data_inicio <= CURRENT_DATE
          AND (pa.data_fim IS NULL OR pa.data_fim >= CURRENT_DATE)
        ORDER BY pa.data_inicio DESC
        LIMIT 1`,
      [alvo],
    );

    const row = rows[0];
    if (!row) return null;

    const { rows: refeicoes } = await this.pool.query<RefeicaoRow>(
      `SELECT id_refeicao, id_plano, nome_refeicao, horario, itens
         FROM refeicao WHERE id_plano = $1 ORDER BY horario`,
      [row.id_plano],
    );
    return this.mapPlano(row, refeicoes);
  }

  async create(idUsuarioNutri: string, dto: CreatePlanoDto) {
    this.validarPeriodo(dto.dataInicio, dto.dataFim);

    await this.vinculos.garantirVinculo(idUsuarioNutri, dto.pacienteId);

    const idNutricionista = await this.resolveNutricionistaId(idUsuarioNutri);
    const idPaciente = await this.resolvePacienteId(dto.pacienteId);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO plano_alimentar
           (id_paciente, id_nutricionista, data_inicio, data_fim)
         VALUES ($1, $2, $3, $4)
         RETURNING id_plano`,
        [idPaciente, idNutricionista, dto.dataInicio, dto.dataFim ?? null],
      );

      const idPlano = String(rows[0].id_plano);
      await this.inserirRefeicoes(client, idPlano, dto.refeicoes);

      await client.query('COMMIT');
      return this.findOne(idPlano, {
        sub: idUsuarioNutri,
        email: '',
        role: 'nutricionista',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(idPlano: string, user: JwtPayload, dto: UpdatePlanoDto) {
    const atual = await this.buscarPlanoAutorizado(idPlano, user);

    const dataInicio = dto.dataInicio ?? this.toDateString(atual.data_inicio);
    const dataFim =
      dto.dataFim !== undefined
        ? dto.dataFim
        : atual.data_fim
          ? this.toDateString(atual.data_fim)
          : null;
    this.validarPeriodo(dataInicio, dataFim);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE plano_alimentar
            SET data_inicio = $1, data_fim = $2
          WHERE id_plano = $3`,
        [dataInicio, dataFim, idPlano],
      );

      if (dto.refeicoes) {
        await client.query(`DELETE FROM refeicao WHERE id_plano = $1`, [
          idPlano,
        ]);
        await this.inserirRefeicoes(client, idPlano, dto.refeicoes);
      }

      await client.query('COMMIT');
      return this.findOne(idPlano, user);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async remove(idPlano: string, user: JwtPayload) {
    await this.buscarPlanoAutorizado(idPlano, user);

    await this.pool.query(`DELETE FROM plano_alimentar WHERE id_plano = $1`, [
      idPlano,
    ]);
    return { deleted: true };
  }
}
