import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import { CreateEmocionalDto } from './dto/create-emocional.dto';

const ROTULOS: Record<string, string> = {
  muito_bem: 'Muito bem',
  bem: 'Bem',
  neutro: 'Neutro',
  mal: 'Mal',
  muito_mal: 'Muito mal',
};

/**
 * Escala numérica usada apenas para calcular média e tendência. Não é nota:
 * serve para dizer se a semana foi melhor ou pior que a anterior.
 */
const PESOS: Record<string, number> = {
  muito_mal: 1,
  mal: 2,
  neutro: 3,
  bem: 4,
  muito_bem: 5,
};

@Injectable()
export class EmocionalService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private mapRegistro(r: Record<string, any>) {
    return {
      id: String(r.id_emocional),
      dataHora: r.data_hora,
      estado: r.estado,
      rotuloEstado: ROTULOS[r.estado] ?? r.estado,
      intensidade: r.intensidade === null ? null : Number(r.intensidade),
      fatores: r.fatores ?? null,
      observacao: r.observacao ?? null,
    };
  }

  async listar(
    user: JwtPayload,
    filtros: { pacienteId?: string; dias?: number; limite?: number },
  ) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      filtros.pacienteId,
    );

    const params: unknown[] = [idPaciente];
    let filtroData = '';
    if (filtros.dias) {
      params.push(Math.min(Math.max(filtros.dias, 1), 365));
      filtroData = `AND data_hora >= NOW() - ($${params.length} || ' days')::interval`;
    }

    params.push(Math.min(Math.max(filtros.limite ?? 60, 1), 500));

    const { rows } = await this.pool.query(
      `SELECT * FROM registro_emocional
        WHERE id_paciente = $1 ${filtroData}
        ORDER BY data_hora DESC
        LIMIT $${params.length}`,
      params,
    );

    return { data: rows.map((r) => this.mapRegistro(r)) };
  }

  /**
   * Resumo do período: quantas vezes cada estado apareceu, a média na escala e
   * os fatores mais citados. É o que dá contexto ao nutricionista na consulta —
   * uma glicemia alta acompanhada de "noite mal dormida" se lê diferente.
   */
  async resumo(user: JwtPayload, pacienteId?: string, dias = 30) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    const janela = Math.min(Math.max(dias, 1), 365);

    const { rows } = await this.pool.query(
      `SELECT estado, COUNT(*)::int AS total
         FROM registro_emocional
        WHERE id_paciente = $1
          AND data_hora >= NOW() - ($2 || ' days')::interval
        GROUP BY estado`,
      [idPaciente, janela],
    );

    const total = rows.reduce((s, r) => s + r.total, 0);
    const somaPesos = rows.reduce((s, r) => s + (PESOS[r.estado] ?? 3) * r.total, 0);

    const { rows: fatores } = await this.pool.query(
      `SELECT fatores
         FROM registro_emocional
        WHERE id_paciente = $1
          AND fatores IS NOT NULL
          AND data_hora >= NOW() - ($2 || ' days')::interval`,
      [idPaciente, janela],
    );

    const contagemFatores = new Map<string, number>();
    for (const row of fatores) {
      for (const bruto of String(row.fatores).split(',')) {
        const fator = bruto.trim().toLowerCase();
        if (fator) contagemFatores.set(fator, (contagemFatores.get(fator) ?? 0) + 1);
      }
    }

    return {
      periodoDias: janela,
      total,
      mediaEscala: total ? Math.round((somaPesos / total) * 10) / 10 : null,
      porEstado: Object.keys(PESOS)
        .reverse()
        .map((estado) => ({
          estado,
          rotulo: ROTULOS[estado],
          total: rows.find((r) => r.estado === estado)?.total ?? 0,
        })),
      fatoresFrequentes: [...contagemFatores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([fator, vezes]) => ({ fator, vezes })),
    };
  }

  /** Só o paciente registra como se sente — não é medida que outro informe. */
  async criar(user: JwtPayload, dto: CreateEmocionalDto) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      dto.pacienteId,
    );

    const { rows } = await this.pool.query(
      `INSERT INTO registro_emocional
        (id_paciente, data_hora, estado, intensidade, fatores, observacao)
       VALUES ($1, COALESCE($2::timestamptz, NOW()), $3, $4, $5, $6)
       RETURNING *`,
      [
        idPaciente,
        dto.dataHora ?? null,
        dto.estado,
        dto.intensidade ?? null,
        dto.fatores?.trim() ?? null,
        dto.observacao?.trim() ?? null,
      ],
    );

    return this.mapRegistro(rows[0]);
  }

  async remover(user: JwtPayload, id: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user);
    const { rowCount } = await this.pool.query(
      'DELETE FROM registro_emocional WHERE id_emocional = $1 AND id_paciente = $2',
      [id, idPaciente],
    );
    if (!rowCount) throw new NotFoundException('Registro não encontrado');
    return { mensagem: 'Registro removido' };
  }
}
