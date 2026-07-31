import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import { CreateMedicamentoDto } from './dto/create-medicamento.dto';
import { UpdateMedicamentoDto } from './dto/update-medicamento.dto';

@Injectable()
export class MedicamentosService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private mapMedicamento(r: Record<string, any>) {
    return {
      id: String(r.id_uso),
      nome: r.nome_medicamento,
      dosagem: r.dosagem,
      frequencia: r.frequencia,
      horarioInicial: String(r.horario_inicial).slice(0, 5),
      ativo: r.ativo,
      criadoEm: r.criado_em,
    };
  }

  async listar(
    user: JwtPayload,
    filtros: { pacienteId?: string; incluirInativos?: boolean },
  ) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      filtros.pacienteId,
    );

    const { rows } = await this.pool.query(
      `SELECT * FROM medicamento
        WHERE id_paciente = $1
          ${filtros.incluirInativos ? '' : 'AND ativo = TRUE'}
        ORDER BY ativo DESC, horario_inicial`,
      [idPaciente],
    );

    return { data: rows.map((r) => this.mapMedicamento(r)) };
  }

  async criar(user: JwtPayload, dto: CreateMedicamentoDto) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      dto.pacienteId,
    );

    const { rows } = await this.pool.query(
      `INSERT INTO medicamento
        (id_paciente, nome_medicamento, dosagem, frequencia, horario_inicial)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        idPaciente,
        dto.nome.trim(),
        dto.dosagem.trim(),
        dto.frequencia.trim(),
        dto.horarioInicial,
      ],
    );

    return this.mapMedicamento(rows[0]);
  }

  private async buscarDoPaciente(idPaciente: string, id: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM medicamento WHERE id_uso = $1 AND id_paciente = $2',
      [id, idPaciente],
    );
    if (!rows.length) throw new NotFoundException('Medicamento não encontrado');
    return rows[0];
  }

  async atualizar(
    user: JwtPayload,
    id: string,
    dto: UpdateMedicamentoDto,
    pacienteId?: string,
  ) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    const atual = await this.buscarDoPaciente(idPaciente, id);

    const { rows } = await this.pool.query(
      `UPDATE medicamento SET
         nome_medicamento = $3, dosagem = $4, frequencia = $5,
         horario_inicial = $6, ativo = $7
       WHERE id_uso = $1 AND id_paciente = $2
       RETURNING *`,
      [
        id,
        idPaciente,
        dto.nome?.trim() ?? atual.nome_medicamento,
        dto.dosagem?.trim() ?? atual.dosagem,
        dto.frequencia?.trim() ?? atual.frequencia,
        dto.horarioInicial ?? String(atual.horario_inicial).slice(0, 5),
        dto.ativo ?? atual.ativo,
      ],
    );

    return this.mapMedicamento(rows[0]);
  }

  /**
   * Suspender em vez de apagar: o histórico do paciente precisa continuar
   * mostrando o que ele usava, e os lembretes ligados ao medicamento seriam
   * apagados junto (ON DELETE CASCADE).
   */
  async suspender(user: JwtPayload, id: string, pacienteId?: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    await this.buscarDoPaciente(idPaciente, id);

    const { rows } = await this.pool.query(
      `UPDATE medicamento SET ativo = FALSE
        WHERE id_uso = $1 AND id_paciente = $2 RETURNING *`,
      [id, idPaciente],
    );

    return this.mapMedicamento(rows[0]);
  }
}
