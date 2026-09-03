import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';

@Injectable()
export class SaudeService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  async findByPaciente(user: JwtPayload, pacienteIdInformado?: string) {
    // Paciente só enxerga o próprio resumo; nutricionista só o de quem está
    // vinculado a ele. Quem resolve isso é o serviço de vínculos, que já é a
    // referência única de propriedade no projeto.
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      pacienteIdInformado,
    );

    const result = await this.pool.query(
      `SELECT
         p.peso,
         p.altura,
         p.tipo_diabetes,
         p.genero,
         ROUND(AVG(rg.valor) FILTER (WHERE rg.data_hora > NOW() - INTERVAL '30 days'), 1) AS glicemia_media_30d,
         ROUND(AVG(rg.valor) FILTER (WHERE rg.data_hora > NOW() - INTERVAL '7 days'), 1) AS glicemia_media_7d,
         MAX(rg.valor) FILTER (WHERE rg.data_hora > NOW() - INTERVAL '30 days') AS glicemia_max,
         MIN(rg.valor) FILTER (WHERE rg.data_hora > NOW() - INTERVAL '30 days') AS glicemia_min,
         COUNT(rg.id_glicemia) FILTER (WHERE rg.data_hora > NOW() - INTERVAL '30 days') AS total_medicoes
       FROM paciente p
       LEFT JOIN registro_glicemia rg ON rg.id_paciente = p.id_paciente
       WHERE p.id_paciente = $1
       GROUP BY p.peso, p.altura, p.tipo_diabetes, p.genero`,
      [idPaciente],
    );

    if (!result.rows[0]) throw new NotFoundException('Paciente não encontrado');
    const r = result.rows[0];

    const peso = r.peso ? Number(r.peso) : null;
    const altura = r.altura ? Number(r.altura) : null;

    const ultimaGlicemia = await this.pool.query(
      `SELECT valor, momento, data_hora
       FROM registro_glicemia
       WHERE id_paciente = $1
       ORDER BY data_hora DESC
       LIMIT 1`,
      [idPaciente],
    );

    return {
      peso,
      altura,
      imc: peso && altura ? Number((peso / altura ** 2).toFixed(1)) : null,
      tipoDiabetes: r.tipo_diabetes ?? null,
      genero: r.genero ?? null,
      // As médias, o máximo, o mínimo e a contagem seguem todos a mesma janela
      // que o nome promete. Antes a média de 30 dias e o total de medições não
      // tinham recorte nenhum: vinham do histórico inteiro do paciente.
      glicemiaMedia30d: r.glicemia_media_30d ? Number(r.glicemia_media_30d) : null,
      glicemiaMedia7d: r.glicemia_media_7d ? Number(r.glicemia_media_7d) : null,
      glicemiaMax: r.glicemia_max ? Number(r.glicemia_max) : null,
      glicemiaMin: r.glicemia_min ? Number(r.glicemia_min) : null,
      totalMedicoes: Number(r.total_medicoes),
      ultimaGlicemia: ultimaGlicemia.rows[0]
        ? {
            valor: Number(ultimaGlicemia.rows[0].valor),
            momento: ultimaGlicemia.rows[0].momento,
            dataHora: ultimaGlicemia.rows[0].data_hora,
          }
        : null,
    };
  }
}
