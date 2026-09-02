import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { VinculosService } from '../vinculos/vinculos.service';

@Injectable()
export class PacientesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  async findAll(idUsuarioNutri: string, busca?: string) {
    const params: string[] = [idUsuarioNutri];
    let where = '';
    if (busca) {
      params.push(`%${busca}%`);
      where = `AND (u.nome ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

  /**
   * Media e ultimo registro saem de subconsultas, nao de LEFT JOIN + GROUP BY.
   *
   * Com os dois LEFT JOIN (glicemia e refeicao) na mesma consulta o banco
   * montava o produto das duas tabelas antes de agrupar: um paciente com 500
   * glicemias e 500 refeicoes gerava 250 mil linhas intermediarias so para
   * devolver uma. O resultado final era o mesmo; o custo, nao.
   */
    const result = await this.pool.query(
      `SELECT
         u.id_usuario,
         u.nome,
         u.email,
         (SELECT ROUND(AVG(rg.valor), 1)
            FROM registro_glicemia rg
           WHERE rg.id_paciente = p.id_paciente
             AND rg.data_hora > NOW() - INTERVAL '30 days') AS glicemia_media,
         GREATEST(
           (SELECT MAX(rg.data_hora) FROM registro_glicemia rg
             WHERE rg.id_paciente = p.id_paciente),
           (SELECT MAX(rr.data_hora) FROM registro_refeicao rr
             WHERE rr.id_paciente = p.id_paciente)
         ) AS ultimo_registro
       FROM usuario u
       JOIN paciente p ON p.id_usuario = u.id_usuario
       JOIN nutricionista_paciente np
         ON np.id_paciente = p.id_paciente AND np.ativo = TRUE
       JOIN nutricionista n
         ON n.id_nutricionista = np.id_nutricionista
       WHERE u.tipo = 'paciente' AND u.desativado_em IS NULL
         AND n.id_usuario = $1 ${where}
       ORDER BY u.nome`,
      params,
    );

    return { data: result.rows.map((r) => this.mapResumo(r)) };
  }

  async findDisponiveis(idUsuarioNutri: string, busca?: string) {
    const params: string[] = [idUsuarioNutri];
    let where = '';
    if (busca) {
      params.push(`%${busca}%`);
      where = `AND (u.nome ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    const result = await this.pool.query(
      `SELECT u.id_usuario, u.nome, u.email
         FROM usuario u
         JOIN paciente p ON p.id_usuario = u.id_usuario
        WHERE u.tipo = 'paciente'
          AND u.desativado_em IS NULL
          AND NOT EXISTS (
            SELECT 1
              FROM nutricionista_paciente np
              JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
             WHERE np.id_paciente = p.id_paciente
               AND np.ativo = TRUE
               AND n.id_usuario = $1
          )
          ${where}
        ORDER BY u.nome
        LIMIT 50`,
      params,
    );

    return {
      data: result.rows.map((r) => ({
        id: String(r.id_usuario),
        nome: r.nome,
        email: r.email,
      })),
    };
  }

  async findOne(idUsuarioNutri: string, idUsuarioPaciente: string) {
    const vinculado = await this.vinculos.existeVinculo(
      idUsuarioNutri,
      idUsuarioPaciente,
    );
    if (!vinculado) {
      throw new ForbiddenException('Paciente não vinculado a você');
    }

    // Mesmo motivo do findAll: subconsulta no lugar do produto das duas tabelas.
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
         (SELECT ROUND(AVG(rg.valor), 1)
            FROM registro_glicemia rg
           WHERE rg.id_paciente = p.id_paciente
             AND rg.data_hora > NOW() - INTERVAL '30 days') AS glicemia_media,
         GREATEST(
           (SELECT MAX(rg.data_hora) FROM registro_glicemia rg
             WHERE rg.id_paciente = p.id_paciente),
           (SELECT MAX(rr.data_hora) FROM registro_refeicao rr
             WHERE rr.id_paciente = p.id_paciente)
         ) AS ultimo_registro
       FROM usuario u
       JOIN paciente p ON p.id_usuario = u.id_usuario
       WHERE u.id_usuario = $1`,
      [idUsuarioPaciente],
    );

    const r = result.rows[0];
    if (!r) return null;

    return {
      ...this.mapResumo(r),
      peso: r.peso ? Number(r.peso) : null,
      altura: r.altura ? Number(r.altura) : null,
      imc:
        r.peso && r.altura
          ? Number((Number(r.peso) / Number(r.altura) ** 2).toFixed(1))
          : null,
      tipoDiabetes: r.tipo_diabetes ?? null,
      genero: r.genero ?? null,
      dataNascimento: r.data_nascimento ?? null,
      restricoesAlergias: r.restricoes_alergias ?? null,
    };
  }

  private mapResumo(r: Record<string, any>) {
    const ativo =
      r.ultimo_registro &&
      new Date(r.ultimo_registro) > new Date(Date.now() - 7 * 86400_000);

    return {
      id: String(r.id_usuario),
      nome: r.nome,
      email: r.email,
      glicemiaMedia: r.glicemia_media ? Number(r.glicemia_media) : null,
      ultimoRegistro: r.ultimo_registro ?? null,
      status: ativo ? 'ativo' : 'inativo',
    };
  }
}
