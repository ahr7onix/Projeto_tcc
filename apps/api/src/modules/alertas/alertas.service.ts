import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import {
  avaliarGlicemia,
  type SeveridadeAlerta,
} from '../../common/glicemia/glicemia';

interface GlicemiaRow {
  id_glicemia: string;
  valor: string;
  momento: string;
  observacao: string | null;
  data_hora: Date;
  paciente_id: string;
  paciente_nome: string;
}

const DIAS_PADRAO = 7;
const DIAS_MAXIMO = 90;

@Injectable()
export class AlertasService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private normalizarDias(dias?: number): number {
    if (!dias || Number.isNaN(dias) || dias <= 0) return DIAS_PADRAO;
    return Math.min(dias, DIAS_MAXIMO);
  }

  private async buscarRegistros(
    user: JwtPayload,
    dias: number,
    pacienteId?: string,
  ): Promise<GlicemiaRow[]> {
    const params: unknown[] = [dias];
    const conditions = [`rg.data_hora > NOW() - ($1 || ' days')::INTERVAL`];
    let join = '';

    if (user.role === 'paciente') {
      params.push(user.sub);
      conditions.push(`u.id_usuario = $${params.length}`);
    } else {
      join = `JOIN nutricionista_paciente np
                ON np.id_paciente = p.id_paciente AND np.ativo = TRUE
              JOIN nutricionista n
                ON n.id_nutricionista = np.id_nutricionista
              JOIN usuario un
                ON un.id_usuario = n.id_usuario`;
      params.push(user.sub);
      conditions.push(`un.id_usuario = $${params.length}`);

      if (pacienteId) {
        params.push(pacienteId);
        conditions.push(`u.id_usuario = $${params.length}`);
      }
    }

    const { rows } = await this.pool.query<GlicemiaRow>(
      `SELECT rg.id_glicemia,
              rg.valor,
              rg.momento,
              rg.observacao,
              rg.data_hora,
              u.id_usuario AS paciente_id,
              u.nome       AS paciente_nome
         FROM registro_glicemia rg
         JOIN paciente p ON p.id_paciente = rg.id_paciente
         JOIN usuario  u ON u.id_usuario = p.id_usuario
         ${join}
        WHERE ${conditions.join(' AND ')}
        ORDER BY rg.data_hora DESC`,
      params,
    );

    return rows;
  }

  async findAll(
    user: JwtPayload,
    filtros: { dias?: number; pacienteId?: string; severidade?: string } = {},
  ) {
    const dias = this.normalizarDias(filtros.dias);
    const registros = await this.buscarRegistros(user, dias, filtros.pacienteId);

    const alertas = registros
      .map((r) => {
        const valor = Number(r.valor);
        const avaliacao = avaliarGlicemia(valor, r.momento);
        return {
          id: String(r.id_glicemia),
          valor,
          momento: r.momento,
          observacao: r.observacao,
          dataHora: r.data_hora,
          pacienteId: String(r.paciente_id),
          pacienteNome: r.paciente_nome,
          ...avaliacao,
        };
      })
      .filter((a) => a.severidade !== 'normal')
      .filter((a) => !filtros.severidade || a.severidade === filtros.severidade);

    return {
      data: alertas,
      meta: {
        dias,
        total: alertas.length,
        criticos: alertas.filter((a) => a.severidade === 'critico').length,
        atencao: alertas.filter((a) => a.severidade === 'atencao').length,
      },
    };
  }

  async resumo(user: JwtPayload, dias?: number) {
    const diasNormalizados = this.normalizarDias(dias);
    const registros = await this.buscarRegistros(user, diasNormalizados);

    const contagem: Record<SeveridadeAlerta, number> = {
      critico: 0,
      atencao: 0,
      normal: 0,
    };
    const porPaciente = new Map<
      string,
      { pacienteId: string; pacienteNome: string; criticos: number; atencao: number }
    >();

    for (const r of registros) {
      const { severidade } = avaliarGlicemia(Number(r.valor), r.momento);
      contagem[severidade] += 1;

      if (severidade === 'normal') continue;

      const chave = String(r.paciente_id);
      if (!porPaciente.has(chave)) {
        porPaciente.set(chave, {
          pacienteId: chave,
          pacienteNome: r.paciente_nome,
          criticos: 0,
          atencao: 0,
        });
      }
      const item = porPaciente.get(chave)!;
      if (severidade === 'critico') item.criticos += 1;
      else item.atencao += 1;
    }

    const totalRegistros = registros.length;
    const foraDaFaixa = contagem.critico + contagem.atencao;

    return {
      dias: diasNormalizados,
      totalRegistros,
      criticos: contagem.critico,
      atencao: contagem.atencao,
      normais: contagem.normal,
      percentualNaFaixa:
        totalRegistros > 0
          ? Number(((contagem.normal / totalRegistros) * 100).toFixed(1))
          : null,
      foraDaFaixa,
      pacientes: [...porPaciente.values()].sort(
        (a, b) => b.criticos - a.criticos || b.atencao - a.atencao,
      ),
    };
  }
}
