import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import { CreateAnotacaoDto } from './dto/create-anotacao.dto';

@Injectable()
export class AnotacoesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private map(row: Record<string, any>) {
    return {
      id: String(row.id_anotacao),
      tipo: row.tipo,
      texto: row.texto,
      criadoEm: row.criado_em,
      autorNome: row.autor_nome,
    };
  }

  async listar(user: JwtPayload, pacienteId: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    const { rows } = await this.pool.query(
      `SELECT a.*, u.nome AS autor_nome
         FROM anotacao_paciente a
         JOIN usuario u ON u.id_usuario = a.id_autor
        WHERE a.id_paciente = $1
        ORDER BY a.criado_em DESC`,
      [idPaciente],
    );
    return { data: rows.map((row) => this.map(row)) };
  }

  async criar(user: JwtPayload, dto: CreateAnotacaoDto) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, dto.pacienteId);
    const { rows } = await this.pool.query(
      `INSERT INTO anotacao_paciente (id_paciente, id_autor, tipo, texto)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [idPaciente, user.sub, dto.tipo, dto.texto.trim()],
    );
    return this.map(rows[0]);
  }
}
