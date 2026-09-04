import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { avaliarGlicemia } from '../../common/glicemia/glicemia';
import { VinculosService } from '../vinculos/vinculos.service';
import { CreateEmocionalDto } from './dto/create-emocional.dto';

const ROTULOS: Record<string, string> = {
  muito_bem: 'Muito bem',
  bem: 'Bem',
  neutro: 'Neutro',
  mal: 'Mal',
  muito_mal: 'Muito mal',
};

/**
 * Escala numérica usada apenas para calcular média e tendência. Não é nota:
 * serve para dizer se a semana foi melhor ou pior que a anterior.
 */
const PESOS: Record<string, number> = {
  muito_mal: 1,
  mal: 2,
  neutro: 3,
  bem: 4,
  muito_bem: 5,
};

@Injectable()
export class EmocionalService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private mapRegistro(r: Record<string, any>) {
    return {
      id: String(r.id_emocional),
      dataHora: r.data_hora,
      estado: r.estado,
      rotuloEstado: ROTULOS[r.estado] ?? r.estado,
      intensidade: r.intensidade === null ? null : Number(r.intensidade),
      fatores: r.fatores ?? null,
      observacao: r.observacao ?? null,
    };
  }

  async listar(
    user: JwtPayload,
    filtros: { pacienteId?: string; dias?: number; limite?: number },
  ) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      filtros.pacienteId,
    );

    const params: unknown[] = [idPaciente];
    let filtroData = '';
    if (filtros.dias) {
      params.push(Math.min(Math.max(filtros.dias, 1), 365));
      filtroData = `AND data_hora >= NOW() - ($${params.length} || ' days')::interval`;
    }

    params.push(Math.min(Math.max(filtros.limite ?? 60, 1), 500));

    const { rows } = await this.pool.query(
      `SELECT * FROM registro_emocional
        WHERE id_paciente = $1 ${filtroData}
        ORDER BY data_hora DESC
        LIMIT $${params.length}`,
      params,
    );

    return { data: rows.map((r) => this.mapRegistro(r)) };
  }

  /**
   * Resumo do período: quantas vezes cada estado apareceu, a média na escala e
   * os fatores mais citados. É o que dá contexto ao nutricionista na consulta —
   * uma glicemia alta acompanhada de "noite mal dormida" se lê diferente.
   */
  async resumo(user: JwtPayload, pacienteId?: string, dias = 30) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    const janela = Math.min(Math.max(dias, 1), 365);

    const { rows } = await this.pool.query(
      `SELECT estado, COUNT(*)::int AS total
         FROM registro_emocional
        WHERE id_paciente = $1
          AND data_hora >= NOW() - ($2 || ' days')::interval
        GROUP BY estado`,
      [idPaciente, janela],
    );

    const total = rows.reduce((s, r) => s + r.total, 0);
    const somaPesos = rows.reduce((s, r) => s + (PESOS[r.estado] ?? 3) * r.total, 0);

    const { rows: fatores } = await this.pool.query(
      `SELECT fatores
         FROM registro_emocional
        WHERE id_paciente = $1
          AND fatores IS NOT NULL
          AND data_hora >= NOW() - ($2 || ' days')::interval`,
      [idPaciente, janela],
    );

    const contagemFatores = new Map<string, number>();
    for (const row of fatores) {
      for (const bruto of String(row.fatores).split(',')) {
        const fator = bruto.trim().toLowerCase();
        if (fator) contagemFatores.set(fator, (contagemFatores.get(fator) ?? 0) + 1);
      }
    }

    return {
      periodoDias: janela,
      total,
      mediaEscala: total ? Math.round((somaPesos / total) * 10) / 10 : null,
      porEstado: Object.keys(PESOS)
        .reverse()
        .map((estado) => ({
          estado,
          rotulo: ROTULOS[estado],
          total: rows.find((r) => r.estado === estado)?.total ?? 0,
        })),
      fatoresFrequentes: [...contagemFatores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([fator, vezes]) => ({ fator, vezes })),
    };
  }

  /**
   * Humor e glicemia lado a lado, dia a dia.
   *
   * O briefing pede o registro emocional "para análise de possíveis relações
   * com alterações glicêmicas". Os dois dados existiam em tabelas separadas e
   * nunca se encontravam — este método os põe na mesma linha.
   *
   * O agrupamento e a média são feitos aqui, e não em SQL, porque contar
   * quantas medições ficaram fora da faixa exige o alvo de cada momento do
   * dia, que mora em common/glicemia. Refazer aquelas regras em SQL seria ter
   * duas fontes de verdade para a mesma decisão clínica.
   *
   * ATENÇÃO: isto é descrição, não correlação. O número de dias costuma ser
   * pequeno e nada aqui estabelece causa. Quem interpreta é o profissional.
   */
  async porDia(user: JwtPayload, pacienteId?: string, dias = 30) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    const janela = Math.min(Math.max(dias, 1), 365);

    const [emocionais, glicemias] = await Promise.all([
      this.pool.query(
        // `data_hora::date` volta como objeto Date do driver, e "2026-09-02"
        // virava "Wed Sep 02" ao ser recortado -- o que quebrava a ordenacao
        // dos dias e a formatacao na tela. `to_char` devolve o texto ISO.
        `SELECT to_char(data_hora, 'YYYY-MM-DD') AS dia, estado, fatores
           FROM registro_emocional
          WHERE id_paciente = $1
            AND data_hora >= NOW() - ($2 || ' days')::interval
          ORDER BY data_hora`,
        [idPaciente, janela],
      ),
      this.pool.query(
        `SELECT to_char(data_hora, 'YYYY-MM-DD') AS dia, valor, momento
           FROM registro_glicemia
          WHERE id_paciente = $1
            AND data_hora >= NOW() - ($2 || ' days')::interval
          ORDER BY data_hora`,
        [idPaciente, janela],
      ),
    ]);

    const porDia = new Map<
      string,
      {
        estados: string[];
        fatores: Set<string>;
        valores: number[];
        foraDaFaixa: number;
      }
    >();

    const garantir = (dia: string) => {
      if (!porDia.has(dia)) {
        porDia.set(dia, { estados: [], fatores: new Set(), valores: [], foraDaFaixa: 0 });
      }
      return porDia.get(dia)!;
    };

    for (const r of emocionais.rows) {
      const dia = String(r.dia);
      const entrada = garantir(dia);
      entrada.estados.push(r.estado);
      for (const bruto of String(r.fatores ?? '').split(',')) {
        const fator = bruto.trim().toLowerCase();
        if (fator) entrada.fatores.add(fator);
      }
    }

    for (const r of glicemias.rows) {
      const dia = String(r.dia);
      // Só interessam os dias que têm humor registrado: sem os dois lados não
      // há o que comparar, e a lista encheria de dias sem informação nenhuma.
      if (!porDia.has(dia)) continue;
      const entrada = porDia.get(dia)!;
      const valor = Number(r.valor);
      entrada.valores.push(valor);
      if (avaliarGlicemia(valor, r.momento).severidade !== 'normal') {
        entrada.foraDaFaixa += 1;
      }
    }

    const media = (valores: number[]) =>
      valores.length
        ? Math.round(valores.reduce((s, v) => s + v, 0) / valores.length)
        : null;

    const linhas = [...porDia.entries()]
      .map(([dia, d]) => {
        const somaPesos = d.estados.reduce((s, e) => s + (PESOS[e] ?? 3), 0);
        const escalaDoDia = d.estados.length
          ? Math.round((somaPesos / d.estados.length) * 10) / 10
          : null;
        return {
          dia,
          estados: d.estados.map((estado) => ({
            estado,
            rotulo: ROTULOS[estado] ?? estado,
          })),
          escalaDoDia,
          fatores: [...d.fatores],
          glicemia: d.valores.length
            ? {
                total: d.valores.length,
                media: media(d.valores),
                minima: Math.min(...d.valores),
                maxima: Math.max(...d.valores),
                foraDaFaixa: d.foraDaFaixa,
              }
            : null,
        };
      })
      .sort((a, b) => (a.dia < b.dia ? 1 : -1));

    // Comparativo grosseiro entre os dias bons e os ruins. Vem acompanhado da
    // contagem de dias justamente para o profissional ver sobre quantos dias
    // cada média foi calculada antes de dar qualquer peso a ela.
    const comDados = linhas.filter((l) => l.glicemia && l.escalaDoDia !== null);
    const bem = comDados.filter((l) => (l.escalaDoDia as number) >= 4);
    const mal = comDados.filter((l) => (l.escalaDoDia as number) <= 2);

    return {
      periodoDias: janela,
      dias: linhas,
      comparativo: {
        diasComparaveis: comDados.length,
        diasBem: bem.length,
        diasMal: mal.length,
        mediaGlicemiaDiasBem: media(bem.map((l) => l.glicemia!.media as number)),
        mediaGlicemiaDiasMal: media(mal.map((l) => l.glicemia!.media as number)),
      },
    };
  }

  /** Só o paciente registra como se sente — não é medida que outro informe. */
  async criar(user: JwtPayload, dto: CreateEmocionalDto) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      dto.pacienteId,
    );

    const { rows } = await this.pool.query(
      `INSERT INTO registro_emocional
        (id_paciente, data_hora, estado, intensidade, fatores, observacao)
       VALUES ($1, COALESCE($2::timestamptz, NOW()), $3, $4, $5, $6)
       RETURNING *`,
      [
        idPaciente,
        dto.dataHora ?? null,
        dto.estado,
        dto.intensidade ?? null,
        dto.fatores?.trim() ?? null,
        dto.observacao?.trim() ?? null,
      ],
    );

    return this.mapRegistro(rows[0]);
  }

  async remover(user: JwtPayload, id: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user);
    const { rowCount } = await this.pool.query(
      'DELETE FROM registro_emocional WHERE id_emocional = $1 AND id_paciente = $2',
      [id, idPaciente],
    );
    if (!rowCount) throw new NotFoundException('Registro não encontrado');
    return { mensagem: 'Registro removido' };
  }
}
