import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { avaliarGlicemia } from '../../common/glicemia/glicemia';
import { PushService } from '../push/push.service';
import type { CreateGlicemiaDto } from './dto/create-glicemia.dto';
import type { CreateRefeicaoDto } from './dto/create-refeicao.dto';

const MOMENTO_MAP: Record<string, string> = {
  pre: 'pre_prandial',
  pos: 'pos_prandial',
};

@Injectable()
export class RegistrosService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly push: PushService,
  ) {}

  async findAll(filters: { pacienteId?: string; dias?: number; tipo?: string }) {
    const { pacienteId, dias = 30, tipo } = filters;
    const params: unknown[] = [dias];
    const conditions: string[] = ['rg.data_hora > NOW() - ($1 || \' days\')::INTERVAL'];

    if (pacienteId) {
      params.push(pacienteId);
      conditions.push(`u.id_usuario = $${params.length}`);
    }

    const glicemiaRows =
      tipo === 'refeicao'
        ? []
        : (
            await this.pool.query(
              `SELECT
                 rg.id_glicemia AS id,
                 'glicemia' AS tipo,
                 rg.valor,
                 rg.momento,
                 rg.observacao,
                 rg.data_hora,
                 u.id_usuario AS paciente_id,
                 u.nome AS paciente_nome
               FROM registro_glicemia rg
               JOIN paciente p ON p.id_paciente = rg.id_paciente
               JOIN usuario u ON u.id_usuario = p.id_usuario
               WHERE ${conditions.join(' AND ')}
               ORDER BY rg.data_hora DESC`,
              params,
            )
          ).rows;

    const refeicaoParams = [...params];
    const refeicaoConditions = [
      `rr.data_hora > NOW() - ($1 || ' days')::INTERVAL`,
    ];
    if (pacienteId) {
      refeicaoConditions.push(`u.id_usuario = $${refeicaoParams.length}`);
    }

    const refeicaoRows =
      tipo === 'glicemia'
        ? []
        : (
            await this.pool.query(
              `SELECT
                 rr.id_registro AS id,
                 'refeicao' AS tipo,
                 rr.descricao,
                 rr.tipo_refeicao,
                 rr.carboidratos,
                 rr.observacao,
                 rr.data_hora,
                 u.id_usuario AS paciente_id,
                 u.nome AS paciente_nome
               FROM registro_refeicao rr
               JOIN paciente p ON p.id_paciente = rr.id_paciente
               JOIN usuario u ON u.id_usuario = p.id_usuario
               WHERE ${refeicaoConditions.join(' AND ')}
               ORDER BY rr.data_hora DESC`,
              refeicaoParams,
            )
          ).rows;

    const data = [...glicemiaRows, ...refeicaoRows].sort(
      (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime(),
    );

    return {
      data: data.map((r) => ({
        id: String(r.id),
        tipo: r.tipo,
        valor: r.valor != null ? Number(r.valor) : null,
        alerta:
          r.tipo === 'glicemia' && r.valor != null
            ? avaliarGlicemia(Number(r.valor), r.momento)
            : null,
        momento: r.momento ?? null,
        descricao: r.descricao ?? null,
        tipoRefeicao: r.tipo_refeicao ?? null,
        carboidratos: r.carboidratos != null ? Number(r.carboidratos) : null,
        observacao: r.observacao ?? null,
        dataHora: r.data_hora,
        pacienteId: String(r.paciente_id),
        pacienteNome: r.paciente_nome,
      })),
      meta: {
        glicemiaCount: glicemiaRows.length,
        refeicaoCount: refeicaoRows.length,
        total: data.length,
      },
    };
  }

  async createGlicemia(idUsuario: string, dto: CreateGlicemiaDto) {
    const pacienteResult = await this.pool.query<{ id_paciente: string }>(
      'SELECT id_paciente FROM paciente WHERE id_usuario = $1',
      [idUsuario],
    );
    if (!pacienteResult.rows[0]) throw new NotFoundException('Perfil de paciente não encontrado');
    const idPaciente = pacienteResult.rows[0].id_paciente;

    const momento = MOMENTO_MAP[dto.momento] ?? dto.momento;

    const result = await this.pool.query(
      `INSERT INTO registro_glicemia (id_paciente, valor, momento, observacao)
       VALUES ($1, $2, $3, $4)
       RETURNING id_glicemia, valor, momento, observacao, data_hora`,
      [idPaciente, dto.valor, momento, dto.observacao ?? null],
    );

    const r = result.rows[0];
    const valor = Number(r.valor);
    const alerta = avaliarGlicemia(valor, r.momento);

    if (alerta.severidade === 'critico') {
      this.push
        .notificarNutricionistasDoPaciente(idUsuario, {
          titulo: 'Alerta glicêmico crítico',
          corpo: `Um paciente registrou ${valor} mg/dL (${alerta.classificacao.replace('_', ' ')}).`,
          dados: { tipo: 'alerta_glicemia', pacienteId: idUsuario, valor },
        })
        .catch(() => undefined);
    }

    return {
      id: String(r.id_glicemia),
      tipo: 'glicemia',
      valor,
      momento: r.momento,
      observacao: r.observacao,
      dataHora: r.data_hora,
      alerta,
    };
  }

  async createRefeicao(idUsuario: string, dto: CreateRefeicaoDto) {
    const pacienteResult = await this.pool.query<{ id_paciente: string }>(
      'SELECT id_paciente FROM paciente WHERE id_usuario = $1',
      [idUsuario],
    );
    if (!pacienteResult.rows[0]) throw new NotFoundException('Perfil de paciente não encontrado');
    const idPaciente = pacienteResult.rows[0].id_paciente;

    const result = await this.pool.query(
      `INSERT INTO registro_refeicao (id_paciente, descricao, tipo_refeicao, carboidratos, observacao)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_registro, descricao, tipo_refeicao, carboidratos, observacao, data_hora`,
      [idPaciente, dto.descricao, dto.tipo_refeicao, dto.carboidratos ?? null, dto.observacao ?? null],
    );

    const r = result.rows[0];
    return {
      id: String(r.id_registro),
      tipo: 'refeicao',
      descricao: r.descricao,
      tipoRefeicao: r.tipo_refeicao,
      carboidratos: r.carboidratos != null ? Number(r.carboidratos) : null,
      observacao: r.observacao,
      dataHora: r.data_hora,
    };
  }
}
