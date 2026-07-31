import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import {
  ROTULOS_IMC,
  classificarCircunferenciaCintura,
  classificarImc,
  classificarRcq,
  relacaoCinturaQuadril,
} from '../../common/nutricao/nutricao';
import type { SexoReferencia } from '../../common/nutricao/nutricao';
import { VinculosService } from '../vinculos/vinculos.service';
import { CreateAntropometriaDto } from './dto/create-antropometria.dto';

const CAMPOS_MEDIDA = [
  'peso',
  'altura',
  'circCintura',
  'circQuadril',
  'circBraco',
  'circPanturrilha',
  'circPescoco',
] as const;

@Injectable()
export class AntropometriaService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private numero(valor: unknown): number | null {
    return valor === null || valor === undefined ? null : Number(valor);
  }

  /**
   * As classificações vêm calculadas da API para o app e o painel exibirem o
   * mesmo texto. O IMC em si é coluna gerada no banco: aqui só se interpreta.
   */
  private mapRegistro(r: Record<string, any>, sexo: SexoReferencia | null) {
    const imc = this.numero(r.imc);
    const cintura = this.numero(r.circ_cintura);
    const quadril = this.numero(r.circ_quadril);
    const classificacaoImc = imc === null ? null : classificarImc(imc);
    const rcq = cintura && quadril ? relacaoCinturaQuadril(cintura, quadril) : null;

    return {
      id: String(r.id_antropometria),
      dataMedicao: r.data_medicao,
      peso: this.numero(r.peso),
      altura: this.numero(r.altura),
      imc,
      classificacaoImc,
      rotuloImc: classificacaoImc ? ROTULOS_IMC[classificacaoImc] : null,
      circCintura: cintura,
      circQuadril: quadril,
      circBraco: this.numero(r.circ_braco),
      circPanturrilha: this.numero(r.circ_panturrilha),
      circPescoco: this.numero(r.circ_pescoco),
      rcq,
      riscoRcq: rcq !== null && sexo ? classificarRcq(rcq, sexo) : null,
      riscoCintura:
        cintura && sexo ? classificarCircunferenciaCintura(cintura, sexo) : null,
      observacao: r.observacao ?? null,
      autorNome: r.autor_nome ?? null,
      criadoEm: r.criado_em,
    };
  }

  /**
   * As fórmulas de risco são baseadas em sexo biológico. Quem se declara
   * "outro" não recebe classificação automática — a leitura fica com o
   * profissional, em vez de o sistema escolher uma referência por conta.
   */
  private async sexoReferencia(idPaciente: string): Promise<SexoReferencia | null> {
    const { rows } = await this.pool.query(
      'SELECT genero FROM paciente WHERE id_paciente = $1',
      [idPaciente],
    );
    const genero = rows[0]?.genero;
    return genero === 'feminino' || genero === 'masculino' ? genero : null;
  }

  async listar(user: JwtPayload, pacienteId?: string, limite?: number) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);
    const sexo = await this.sexoReferencia(idPaciente);

    const max = Math.min(Math.max(limite ?? 50, 1), 365);
    const { rows } = await this.pool.query(
      `SELECT ra.*, u.nome AS autor_nome
         FROM registro_antropometrico ra
         LEFT JOIN usuario u ON u.id_usuario = ra.id_autor
        WHERE ra.id_paciente = $1
        ORDER BY ra.data_medicao DESC, ra.id_antropometria DESC
        LIMIT $2`,
      [idPaciente, max],
    );

    return { data: rows.map((r) => this.mapRegistro(r, sexo)) };
  }

  /**
   * Evolução em ordem cronológica, pronta para o gráfico: só as medições que
   * têm o valor pedido, para a linha não cair a zero num dia sem aquela medida.
   */
  async evolucao(user: JwtPayload, pacienteId?: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);

    const { rows } = await this.pool.query(
      `SELECT data_medicao, peso, imc, circ_cintura
         FROM registro_antropometrico
        WHERE id_paciente = $1
        ORDER BY data_medicao`,
      [idPaciente],
    );

    const serie = (campo: 'peso' | 'imc' | 'circ_cintura') =>
      rows
        .filter((r) => r[campo] !== null)
        .map((r) => ({ data: r.data_medicao, valor: Number(r[campo]) }));

    const peso = serie('peso');
    const primeiro = peso[0];
    const ultimo = peso[peso.length - 1];

    return {
      peso,
      imc: serie('imc'),
      circCintura: serie('circ_cintura'),
      variacaoPeso:
        primeiro && ultimo && peso.length > 1
          ? Math.round((ultimo.valor - primeiro.valor) * 10) / 10
          : null,
    };
  }

  async criar(user: JwtPayload, dto: CreateAntropometriaDto) {
    const informou = CAMPOS_MEDIDA.some(
      (campo) => dto[campo] !== undefined && dto[campo] !== null,
    );
    if (!informou) {
      throw new BadRequestException('Informe ao menos uma medida');
    }

    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      dto.pacienteId,
    );
    const sexo = await this.sexoReferencia(idPaciente);

    const { rows } = await this.pool.query(
      `INSERT INTO registro_antropometrico
        (id_paciente, id_autor, data_medicao, peso, altura, circ_cintura,
         circ_quadril, circ_braco, circ_panturrilha, circ_pescoco, observacao)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        idPaciente,
        user.sub,
        dto.dataMedicao ?? null,
        dto.peso ?? null,
        dto.altura ?? null,
        dto.circCintura ?? null,
        dto.circQuadril ?? null,
        dto.circBraco ?? null,
        dto.circPanturrilha ?? null,
        dto.circPescoco ?? null,
        dto.observacao?.trim() ?? null,
      ],
    );

    // Peso e altura atuais também ficam no cadastro, que é o que o cálculo de
    // VET lê. Sem isso o plano continuaria usando o peso de meses atrás.
    if (dto.peso !== undefined || dto.altura !== undefined) {
      await this.pool.query(
        `UPDATE paciente
            SET peso = COALESCE($2, peso), altura = COALESCE($3, altura)
          WHERE id_paciente = $1`,
        [idPaciente, dto.peso ?? null, dto.altura ?? null],
      );
    }

    return this.mapRegistro(rows[0], sexo);
  }

  async remover(user: JwtPayload, id: string, pacienteId?: string) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(user, pacienteId);

    const { rowCount } = await this.pool.query(
      'DELETE FROM registro_antropometrico WHERE id_antropometria = $1 AND id_paciente = $2',
      [id, idPaciente],
    );
    if (!rowCount) throw new NotFoundException('Medição não encontrada');
    return { mensagem: 'Medição removida' };
  }
}
