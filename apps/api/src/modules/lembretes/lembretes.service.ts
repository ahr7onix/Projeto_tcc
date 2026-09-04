import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import { CreateLembreteDto } from './dto/create-lembrete.dto';
import { UpdateLembreteDto } from './dto/update-lembrete.dto';

const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

@Injectable()
export class LembretesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private descreverQuando(r: Record<string, any>): string {
    if (!r.recorrente) {
      // Sem os segundos: um lembrete marcado para as 8h aparecia na tela do
      // paciente como "21/08/2026, 08:00:25", que ninguem programou.
      return r.data_hora
        ? new Date(r.data_hora).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'sem data';
    }
    const hora = String(r.hora).slice(0, 5);
    const dias: number[] = r.dias_semana ?? [];
    if (!dias.length) return `Todos os dias às ${hora}`;
    if (dias.length === 7) return `Todos os dias às ${hora}`;
    return `${dias.map((d) => NOMES_DIAS[d]).join(', ')} às ${hora}`;
  }

  private mapLembrete(r: Record<string, any>) {
    return {
      id: String(r.id_lembrete),
      tipo: r.tipo_lembrete,
      titulo: r.titulo ?? null,
      descricao: r.descricao ?? null,
      recorrente: r.recorrente,
      hora: r.hora ? String(r.hora).slice(0, 5) : null,
      dataHora: r.data_hora,
      diasSemana: r.dias_semana ?? [],
      ativo: r.ativo,
      concluido: r.concluido,
      medicamentoId: r.id_uso === null ? null : String(r.id_uso),
      quando: this.descreverQuando(r),
      criadoEm: r.criado_em,
    };
  }

  /**
   * O CHECK do banco (chk_lembrete_quando) já barra a combinação inválida, mas
   * o erro que chegaria ao usuário seria de constraint. Aqui a mensagem diz o
   * que fazer.
   */
  private validarQuando(recorrente: boolean, hora?: string, dataHora?: string) {
    if (recorrente && !hora) {
      throw new BadRequestException('Lembrete recorrente precisa de hora (HH:MM)');
    }
    if (!recorrente && !dataHora) {
      throw new BadRequestException('Lembrete avulso precisa de data e hora');
    }
  }

  async listar(
    user: JwtPayload,
    filtros: { pacienteId?: string; apenasAtivos?: boolean },
  ) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      filtros.pacienteId,
    );

    const { rows } = await this.pool.query(
      `SELECT * FROM lembrete
        WHERE id_paciente = $1
          ${filtros.apenasAtivos ? 'AND ativo = TRUE' : ''}
        ORDER BY recorrente DESC, hora NULLS LAST, data_hora`,
      [idPaciente],
    );

    return { data: rows.map((r) => this.mapLembrete(r)) };
  }

  /**
   * Lembretes que caem hoje: os recorrentes cujo dia da semana bate (ou que não
   * escolheram dias, valendo todos) e os avulsos marcados para hoje.
   * O dia da semana vem do banco para não depender do fuso do celular.
   */
  async doDia(user: JwtPayload, pacienteId?: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);

    const { rows } = await this.pool.query(
      `SELECT * FROM lembrete
        WHERE id_paciente = $1
          AND ativo = TRUE
          AND (
            (recorrente = TRUE AND (
              dias_semana IS NULL
              OR cardinality(dias_semana) = 0
              OR EXTRACT(DOW FROM CURRENT_DATE)::smallint = ANY(dias_semana)
            ))
            OR (recorrente = FALSE AND data_hora::date = CURRENT_DATE)
          )
        ORDER BY COALESCE(hora, data_hora::time)`,
      [idPaciente],
    );

    return { data: rows.map((r) => this.mapLembrete(r)) };
  }

  async criar(user: JwtPayload, dto: CreateLembreteDto) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      dto.pacienteId,
    );

    const recorrente = dto.recorrente ?? false;
    this.validarQuando(recorrente, dto.hora, dto.dataHora);

    if (dto.tipo === 'medicamento' && dto.medicamentoId) {
      const { rowCount } = await this.pool.query(
        'SELECT 1 FROM medicamento WHERE id_uso = $1 AND id_paciente = $2',
        [dto.medicamentoId, idPaciente],
      );
      if (!rowCount) {
        throw new BadRequestException('Medicamento não encontrado para este paciente');
      }
    }

    const { rows } = await this.pool.query(
      `INSERT INTO lembrete
        (id_paciente, tipo_lembrete, titulo, descricao, recorrente,
         hora, data_hora, dias_semana, id_uso)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        idPaciente,
        dto.tipo,
        dto.titulo.trim(),
        dto.descricao?.trim() ?? null,
        recorrente,
        recorrente ? dto.hora : null,
        recorrente ? null : dto.dataHora,
        dto.diasSemana?.length ? dto.diasSemana : null,
        dto.tipo === 'medicamento' ? dto.medicamentoId ?? null : null,
      ],
    );

    return this.mapLembrete(rows[0]);
  }

  private async buscarDoPaciente(idPaciente: string, id: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM lembrete WHERE id_lembrete = $1 AND id_paciente = $2',
      [id, idPaciente],
    );
    if (!rows.length) throw new NotFoundException('Lembrete não encontrado');
    return rows[0];
  }

  async atualizar(
    user: JwtPayload,
    id: string,
    dto: UpdateLembreteDto,
    pacienteId?: string,
  ) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    const atual = await this.buscarDoPaciente(idPaciente, id);

    const recorrente = dto.recorrente ?? atual.recorrente;
    const hora = dto.hora ?? (atual.hora ? String(atual.hora).slice(0, 5) : undefined);
    const dataHora = dto.dataHora ?? atual.data_hora ?? undefined;
    this.validarQuando(recorrente, hora, dataHora ? String(dataHora) : undefined);

    const { rows } = await this.pool.query(
      `UPDATE lembrete SET
         titulo = $3, descricao = $4, recorrente = $5, hora = $6,
         data_hora = $7, dias_semana = $8, ativo = $9, concluido = $10
       WHERE id_lembrete = $1 AND id_paciente = $2
       RETURNING *`,
      [
        id,
        idPaciente,
        dto.titulo?.trim() ?? atual.titulo,
        dto.descricao !== undefined ? dto.descricao?.trim() ?? null : atual.descricao,
        recorrente,
        recorrente ? hora : null,
        recorrente ? null : dataHora,
        dto.diasSemana !== undefined
          ? dto.diasSemana.length
            ? dto.diasSemana
            : null
          : atual.dias_semana,
        dto.ativo ?? atual.ativo,
        dto.concluido ?? atual.concluido,
      ],
    );

    return this.mapLembrete(rows[0]);
  }

  /**
   * Concluir um recorrente não faz sentido — ele volta amanhã. Nesse caso o
   * que o usuário quer é desativar, e é isso que o app oferece.
   */
  async concluir(user: JwtPayload, id: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user);
    const atual = await this.buscarDoPaciente(idPaciente, id);
    if (atual.recorrente) {
      throw new BadRequestException(
        'Lembrete recorrente não é concluído: desative-o quando não precisar mais',
      );
    }
    const { rows } = await this.pool.query(
      `UPDATE lembrete SET concluido = TRUE
        WHERE id_lembrete = $1 AND id_paciente = $2 RETURNING *`,
      [id, idPaciente],
    );
    return this.mapLembrete(rows[0]);
  }

  async remover(user: JwtPayload, id: string, pacienteId?: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    const { rowCount } = await this.pool.query(
      'DELETE FROM lembrete WHERE id_lembrete = $1 AND id_paciente = $2',
      [id, idPaciente],
    );
    if (!rowCount) throw new NotFoundException('Lembrete não encontrado');
    return { mensagem: 'Lembrete removido' };
  }
}
