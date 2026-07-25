import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

@Injectable()
export class VinculosService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async resolveNutricionistaId(idUsuario: string): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT id_nutricionista FROM nutricionista WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Nutricionista não encontrado');
    return String(rows[0].id_nutricionista);
  }

  async resolvePacienteId(idUsuario: string): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT id_paciente FROM paciente WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Paciente não encontrado');
    return String(rows[0].id_paciente);
  }

  async existeVinculo(
    idUsuarioNutri: string,
    idUsuarioPaciente: string,
  ): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1
         FROM nutricionista_paciente np
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN paciente p      ON p.id_paciente = np.id_paciente
        WHERE n.id_usuario = $1
          AND p.id_usuario = $2
          AND np.ativo = TRUE
        LIMIT 1`,
      [idUsuarioNutri, idUsuarioPaciente],
    );
    return rows.length > 0;
  }

  async garantirVinculo(idUsuarioNutri: string, idUsuarioPaciente: string) {
    const vinculado = await this.existeVinculo(idUsuarioNutri, idUsuarioPaciente);
    if (!vinculado) {
      throw new BadRequestException(
        'Este paciente não está vinculado a você. Vincule-o antes de continuar.',
      );
    }
  }

  async listarPacientes(idUsuarioNutri: string) {
    const { rows } = await this.pool.query(
      `SELECT np.id_vinculo,
              np.criado_em,
              u.id_usuario,
              u.nome,
              u.email
         FROM nutricionista_paciente np
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN paciente p      ON p.id_paciente = np.id_paciente
         JOIN usuario u       ON u.id_usuario = p.id_usuario
        WHERE n.id_usuario = $1
          AND np.ativo = TRUE
        ORDER BY u.nome`,
      [idUsuarioNutri],
    );

    return {
      data: rows.map((r) => ({
        vinculoId: String(r.id_vinculo),
        pacienteId: String(r.id_usuario),
        nome: r.nome,
        email: r.email,
        vinculadoEm: r.criado_em,
      })),
    };
  }

  async vincular(idUsuarioNutri: string, idUsuarioPaciente: string) {
    const idNutricionista = await this.resolveNutricionistaId(idUsuarioNutri);
    const idPaciente = await this.resolvePacienteId(idUsuarioPaciente);

    const { rows: existentes } = await this.pool.query(
      `SELECT id_vinculo FROM nutricionista_paciente
        WHERE id_nutricionista = $1 AND id_paciente = $2 AND ativo = TRUE`,
      [idNutricionista, idPaciente],
    );
    if (existentes.length) {
      throw new ConflictException('Paciente já vinculado a você');
    }

    const { rows } = await this.pool.query(
      `INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente)
       VALUES ($1, $2)
       RETURNING id_vinculo, criado_em`,
      [idNutricionista, idPaciente],
    );

    return {
      vinculoId: String(rows[0].id_vinculo),
      pacienteId: idUsuarioPaciente,
      vinculadoEm: rows[0].criado_em,
    };
  }

  async desvincular(idUsuarioNutri: string, idUsuarioPaciente: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE nutricionista_paciente np
          SET ativo = FALSE, encerrado_em = NOW()
         FROM nutricionista n, paciente p
        WHERE np.id_nutricionista = n.id_nutricionista
          AND np.id_paciente = p.id_paciente
          AND n.id_usuario = $1
          AND p.id_usuario = $2
          AND np.ativo = TRUE`,
      [idUsuarioNutri, idUsuarioPaciente],
    );

    if (!rowCount) throw new NotFoundException('Vínculo não encontrado');
    return { desvinculado: true };
  }
}
