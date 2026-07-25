import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 200;

@Injectable()
export class AdminService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async metricas() {
    const { rows } = await this.pool.query(
      `SELECT
         (SELECT COUNT(*) FROM usuario WHERE tipo = 'paciente')       AS pacientes,
         (SELECT COUNT(*) FROM usuario WHERE tipo = 'nutricionista')  AS nutricionistas,
         (SELECT COUNT(*) FROM usuario WHERE tipo = 'administrador')  AS administradores,
         (SELECT COUNT(*) FROM nutricionista_paciente WHERE ativo)    AS vinculos,
         (SELECT COUNT(*) FROM plano_alimentar)                       AS planos,
         (SELECT COUNT(*) FROM registro_glicemia
           WHERE data_hora > NOW() - INTERVAL '30 days')              AS glicemias30d,
         (SELECT COUNT(*) FROM registro_refeicao
           WHERE data_hora > NOW() - INTERVAL '30 days')              AS refeicoes30d,
         (SELECT COUNT(*) FROM conteudo_educativo WHERE publicado)    AS conteudos,
         (SELECT COUNT(DISTINCT p.id_paciente)
            FROM paciente p
            JOIN registro_glicemia rg ON rg.id_paciente = p.id_paciente
           WHERE rg.data_hora > NOW() - INTERVAL '7 days')            AS pacientes_ativos_7d,
         (SELECT COUNT(*) FROM nutricionista WHERE NOT perfil_completo) AS nutris_sem_crn`,
    );

    const r = rows[0];
    return {
      pacientes: Number(r.pacientes),
      nutricionistas: Number(r.nutricionistas),
      administradores: Number(r.administradores),
      vinculos: Number(r.vinculos),
      planos: Number(r.planos),
      glicemias30d: Number(r.glicemias30d),
      refeicoes30d: Number(r.refeicoes30d),
      conteudos: Number(r.conteudos),
      pacientesAtivos7d: Number(r.pacientes_ativos_7d),
      nutricionistasSemCrn: Number(r.nutris_sem_crn),
    };
  }

  async listarUsuarios(filtros: {
    tipo?: string;
    busca?: string;
    limite?: number;
  } = {}) {
    const params: unknown[] = [];
    const condicoes: string[] = [];

    if (filtros.tipo && ['paciente', 'nutricionista', 'administrador'].includes(filtros.tipo)) {
      params.push(filtros.tipo);
      condicoes.push(`u.tipo = $${params.length}::tipo_usuario`);
    }
    if (filtros.busca) {
      params.push(`%${filtros.busca}%`);
      condicoes.push(`(u.nome ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const limite = Math.min(filtros.limite && filtros.limite > 0 ? filtros.limite : LIMITE_PADRAO, LIMITE_MAXIMO);
    params.push(limite);

    const { rows } = await this.pool.query(
      `SELECT u.id_usuario, u.nome, u.email, u.tipo, u.criado_em,
              n.crn, n.perfil_completo,
              (SELECT COUNT(*) FROM nutricionista_paciente np
                WHERE np.ativo
                  AND (np.id_nutricionista = n.id_nutricionista
                       OR np.id_paciente = p.id_paciente)) AS vinculos
         FROM usuario u
         LEFT JOIN nutricionista n ON n.id_usuario = u.id_usuario
         LEFT JOIN paciente p      ON p.id_usuario = u.id_usuario
         ${where}
         ORDER BY u.criado_em DESC
         LIMIT $${params.length}`,
      params,
    );

    return {
      data: rows.map((r) => ({
        id: String(r.id_usuario),
        nome: r.nome,
        email: r.email,
        tipo: r.tipo,
        criadoEm: r.criado_em,
        crn: r.crn ?? null,
        perfilCompleto: r.perfil_completo ?? null,
        vinculos: Number(r.vinculos ?? 0),
      })),
    };
  }

  async removerUsuario(idAdmin: string, idUsuario: string) {
    if (idAdmin === idUsuario) {
      throw new BadRequestException('Você não pode remover a própria conta');
    }

    const { rows } = await this.pool.query(
      `SELECT tipo FROM usuario WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Usuário não encontrado');

    if (rows[0].tipo === 'administrador') {
      const { rows: totalRows } = await this.pool.query(
        `SELECT COUNT(*) AS total FROM usuario WHERE tipo = 'administrador'`,
      );
      if (Number(totalRows[0].total) <= 1) {
        throw new BadRequestException(
          'Não é possível remover o último administrador do sistema',
        );
      }
    }

    await this.pool.query(`DELETE FROM usuario WHERE id_usuario = $1`, [idUsuario]);
    return { removido: true };
  }
}
