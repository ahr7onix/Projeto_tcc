import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import { CreateRestricaoDto } from './dto/create-restricao.dto';
import { UpdateRestricaoDto } from './dto/update-restricao.dto';

@Injectable()
export class RestricoesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private mapRestricao(r: Record<string, any>) {
    return {
      id: String(r.id_restricao),
      descricao: r.descricao,
      criadoEm: r.criado_em,
    };
  }

  async listar(user: JwtPayload, pacienteId?: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);

    const { rows } = await this.pool.query(
      `SELECT * FROM restricao_alimentar
        WHERE id_paciente = $1
        ORDER BY criado_em DESC`,
      [idPaciente],
    );

    return { data: rows.map((r) => this.mapRestricao(r)) };
  }

  async criar(user: JwtPayload, dto: CreateRestricaoDto) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, dto.pacienteId);

    const { rows } = await this.pool.query(
      `INSERT INTO restricao_alimentar (id_paciente, descricao)
       VALUES ($1, $2)
       RETURNING *`,
      [idPaciente, dto.descricao.trim()],
    );

    return this.mapRestricao(rows[0]);
  }

  private async buscarDoPaciente(idPaciente: string, id: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM restricao_alimentar WHERE id_restricao = $1 AND id_paciente = $2',
      [id, idPaciente],
    );
    if (!rows.length) throw new NotFoundException('Restrição não encontrada');
    return rows[0];
  }

  async atualizar(
    user: JwtPayload,
    id: string,
    dto: UpdateRestricaoDto,
    pacienteId?: string,
  ) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    await this.buscarDoPaciente(idPaciente, id);

    const { rows } = await this.pool.query(
      `UPDATE restricao_alimentar SET descricao = $3
       WHERE id_restricao = $1 AND id_paciente = $2
       RETURNING *`,
      [id, idPaciente, dto.descricao.trim()],
    );

    return this.mapRestricao(rows[0]);
  }

  /**
   * Remoção física: diferente do medicamento, isto não é histórico clínico,
   * só uma lista de preferências que o paciente mantém atualizada.
   */
  async remover(user: JwtPayload, id: string, pacienteId?: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    await this.buscarDoPaciente(idPaciente, id);

    await this.pool.query(
      'DELETE FROM restricao_alimentar WHERE id_restricao = $1 AND id_paciente = $2',
      [id, idPaciente],
    );

    return { ok: true };
  }
}
