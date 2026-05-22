import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

@Injectable()
export class SaudeService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByPaciente(idUsuario: string) {
    const result = await this.pool.query(
      `SELECT
         p.peso,
         p.altura,
         p.tipo_diabetes,
         p.genero,
         ROUND(AVG(rg.valor), 1) AS glicemia_media_30d,
         ROUND(AVG(rg.valor) FILTER (WHERE rg.data_hora > NOW() - INTERVAL '7 days'), 1) AS glicemia_media_7d,
         MAX(rg.valor) FILTER (WHERE rg.data_hora > NOW() - INTERVAL '30 days') AS glicemia_max,
         MIN(rg.valor) FILTER (WHERE rg.data_hora > NOW() - INTERVAL '30 days') AS glicemia_min,
         COUNT(rg.id_glicemia) AS total_medicoes
       FROM paciente p
       JOIN usuario u ON u.id_usuario = p.id_usuario
       LEFT JOIN registro_glicemia rg ON rg.id_paciente = p.id_paciente
       WHERE u.id_usuario = $1
       GROUP BY p.peso, p.altura, p.tipo_diabetes, p.genero`,
      [idUsuario],
    );

    if (!result.rows[0]) throw new NotFoundException('Paciente não encontrado');
    const r = result.rows[0];

    const peso = r.peso ? Number(r.peso) : null;
    const altura = r.altura ? Number(r.altura) : null;

    const ultimaGlicemia = await this.pool.query(
      `SELECT rg.valor, rg.momento, rg.data_hora
       FROM registro_glicemia rg
       JOIN paciente p ON p.id_paciente = rg.id_paciente
       JOIN usuario u ON u.id_usuario = p.id_usuario
       WHERE u.id_usuario = $1
       ORDER BY rg.data_hora DESC
       LIMIT 1`,
      [idUsuario],
    );

    return {
      peso,
      altura,
      imc: peso && altura ? Number((peso / altura ** 2).toFixed(1)) : null,
      tipoDiabetes: r.tipo_diabetes ?? null,
      genero: r.genero ?? null,
      glicemiaMedia30d: r.glicemia_media_30d ? Number(r.glicemia_media_30d) : null,
      glicemiaMedia7d: r.glicemia_media_7d ? Number(r.glicemia_media_7d) : null,
      glicemiaMax: r.glicemia_max ? Number(r.glicemia_max) : null,
      glicemiaMin: r.glicemia_min ? Number(r.glicemia_min) : null,
      totalMedicoes: Number(r.total_medicoes),
      ultimaGlicemia: ultimaGlicemia.rows[0]
        ? {
            valor: Number(ultimaGlicemia.rows[0].valor),
            momento: ultimaGlicemia.rows[0].momento,
            dataHora: ultimaGlicemia.rows[0].data_hora,
          }
        : null,
    };
  }
}
