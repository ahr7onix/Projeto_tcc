import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

@Injectable()
export class PacientesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(busca?: string) {
    const params: string[] = [];
    const where = busca
      ? `AND (u.nome ILIKE $1 OR u.email ILIKE $1)`
      : '';
    if (busca) params.push(`%${busca}%`);

    const result = await this.pool.query(
      `SELECT
         u.id_usuario,
         u.nome,
         u.email,
         ROUND(AVG(rg.valor) FILTER (
           WHERE rg.data_hora > NOW() - INTERVAL '30 days'
         ), 1) AS glicemia_media,
         GREATEST(
           MAX(rg.data_hora),
           MAX(rr.data_hora)
         ) AS ultimo_registro
       FROM usuario u
       JOIN paciente p ON p.id_usuario = u.id_usuario
       LEFT JOIN registro_glicemia rg ON rg.id_paciente = p.id_paciente
       LEFT JOIN registro_refeicao rr ON rr.id_paciente = p.id_paciente
       WHERE u.tipo = 'paciente' ${where}
       GROUP BY u.id_usuario, u.nome, u.email
       ORDER BY u.nome`,
      params,
    );

    return {
      data: result.rows.map((r) => ({
        id: String(r.id_usuario),
        nome: r.nome,
        email: r.email,
        glicemiaMedia: r.glicemia_media ? Number(r.glicemia_media) : null,
        ultimoRegistro: r.ultimo_registro ?? null,
        status:
          r.ultimo_registro &&
          new Date(r.ultimo_registro) > new Date(Date.now() - 7 * 86400_000)
            ? 'ativo'
            : 'inativo',
      })),
    };
  }

  async findOne(idUsuario: string) {
    const result = await this.pool.query(
      `SELECT
         u.id_usuario,
         u.nome,
         u.email,
         p.peso,
         p.altura,
         p.tipo_diabetes,
         p.genero,
         p.data_nascimento,
         p.restricoes_alergias,
         ROUND(AVG(rg.valor) FILTER (
           WHERE rg.data_hora > NOW() - INTERVAL '30 days'
         ), 1) AS glicemia_media,
         GREATEST(MAX(rg.data_hora), MAX(rr.data_hora)) AS ultimo_registro
       FROM usuario u
       JOIN paciente p ON p.id_usuario = u.id_usuario
       LEFT JOIN registro_glicemia rg ON rg.id_paciente = p.id_paciente
       LEFT JOIN registro_refeicao rr ON rr.id_paciente = p.id_paciente
       WHERE u.id_usuario = $1
       GROUP BY u.id_usuario, u.nome, u.email,
                p.peso, p.altura, p.tipo_diabetes, p.genero,
                p.data_nascimento, p.restricoes_alergias`,
      [idUsuario],
    );

    const r = result.rows[0];
    if (!r) return null;

    return {
      id: String(r.id_usuario),
      nome: r.nome,
      email: r.email,
      peso: r.peso ? Number(r.peso) : null,
      altura: r.altura ? Number(r.altura) : null,
      imc:
        r.peso && r.altura
          ? Number((Number(r.peso) / (Number(r.altura) ** 2)).toFixed(1))
          : null,
      tipoDiabetes: r.tipo_diabetes ?? null,
      genero: r.genero ?? null,
      dataNascimento: r.data_nascimento ?? null,
      restricoesAlergias: r.restricoes_alergias ?? null,
      glicemiaMedia: r.glicemia_media ? Number(r.glicemia_media) : null,
      ultimoRegistro: r.ultimo_registro ?? null,
      status:
        r.ultimo_registro &&
        new Date(r.ultimo_registro) > new Date(Date.now() - 7 * 86400_000)
          ? 'ativo'
          : 'inativo',
    };
  }
}
