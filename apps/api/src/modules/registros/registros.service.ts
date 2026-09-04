import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { avaliarGlicemia } from '../../common/glicemia/glicemia';
import { valoresParaQuantidade } from '../../common/nutricao/nutricao';
import { AlimentosService } from '../alimentos/alimentos.service';
import { PushService } from '../push/push.service';
import { VinculosService } from '../vinculos/vinculos.service';
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
    private readonly vinculos: VinculosService,
    private readonly alimentos: AlimentosService,
  ) {}

  async findAll(
    usuario: { sub: string; role: string },
    filters: { pacienteId?: string; dias?: number; tipo?: string },
  ) {
    const { pacienteId, dias = 30, tipo } = filters;
    const params: unknown[] = [dias];
    const escopo = await this.montarEscopo(usuario, pacienteId, params);
    const conditions: string[] = [
      'rg.data_hora > NOW() - ($1 || \' days\')::INTERVAL',
      escopo,
    ];

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

    const refeicaoConditions = [
      `rr.data_hora > NOW() - ($1 || ' days')::INTERVAL`,
      escopo,
    ];

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
                 rr.proteinas,
                 rr.lipidios,
                 rr.kcal,
                 rr.quantidade_g,
                 a.id_alimento,
                 a.nome AS alimento_nome,
                 rr.observacao,
                 rr.data_hora,
                 u.id_usuario AS paciente_id,
                 u.nome AS paciente_nome
               FROM registro_refeicao rr
               LEFT JOIN alimento a ON a.id_alimento = rr.id_alimento
               JOIN paciente p ON p.id_paciente = rr.id_paciente
               JOIN usuario u ON u.id_usuario = p.id_usuario
               WHERE ${refeicaoConditions.join(' AND ')}
               ORDER BY rr.data_hora DESC`,
              params,
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
        proteinas: r.proteinas != null ? Number(r.proteinas) : null,
        lipidios: r.lipidios != null ? Number(r.lipidios) : null,
        kcal: r.kcal != null ? Number(r.kcal) : null,
        quantidadeG: r.quantidade_g != null ? Number(r.quantidade_g) : null,
        // Sem alimento vinculado o registro veio de texto livre, e aí os
        // macronutrientes acima são o que o paciente informou, não uma conta.
        alimento:
          r.id_alimento != null
            ? { id: String(r.id_alimento), nome: r.alimento_nome }
            : null,
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

  /**
   * Última glicemia registrada, sem o corte de dias que `findAll` aplica —
   * para não esconder o único dado que existe de quem não registra há mais
   * de 30 dias (o alerta precisa saber que o dado está velho, não sumir com ele).
   */
  async ultimaGlicemia(
    usuario: { sub: string; role: string },
    pacienteId?: string,
  ) {
    const params: unknown[] = [];
    const escopo = await this.montarEscopo(usuario, pacienteId, params);

    const result = await this.pool.query(
      `SELECT rg.valor, rg.momento, rg.data_hora
         FROM registro_glicemia rg
         JOIN paciente p ON p.id_paciente = rg.id_paciente
         JOIN usuario u ON u.id_usuario = p.id_usuario
        WHERE ${escopo}
        ORDER BY rg.data_hora DESC
        LIMIT 1`,
      params,
    );

    const r = result.rows[0];
    if (!r) return { registro: null };

    const valor = Number(r.valor);
    const dataHora: Date = r.data_hora;
    const minutosDesdeRegistro = Math.floor(
      (Date.now() - new Date(dataHora).getTime()) / 60000,
    );

    return {
      registro: {
        valor,
        momento: r.momento,
        dataHora,
        minutosDesdeRegistro,
        avaliacao: avaliarGlicemia(valor, r.momento),
      },
    };
  }

  /**
   * Recorta a consulta ao que o usuário logado tem direito de ver.
   *
   * Antes disso o `pacienteId` vinha solto da query string e ninguém o conferia:
   * qualquer conta autenticada lia a glicemia de qualquer paciente, e sem
   * `pacienteId` a resposta trazia os registros do sistema inteiro. Como são
   * dados de saúde, o filtro tem que nascer aqui no servidor.
   *
   * A expressão devolvida entra no WHERE das duas consultas (glicemia e
   * refeição), que fazem o mesmo JOIN com `paciente p` e `usuario u`.
   */
  private async montarEscopo(
    usuario: { sub: string; role: string },
    pacienteId: string | undefined,
    params: unknown[],
  ): Promise<string> {
    if (usuario.role === 'paciente') {
      if (pacienteId && pacienteId !== usuario.sub) {
        throw new ForbiddenException('Você só pode consultar os seus registros');
      }
      params.push(usuario.sub);
      return `u.id_usuario = $${params.length}`;
    }

    if (usuario.role === 'nutricionista') {
      if (pacienteId) {
        const vinculado = await this.vinculos.existeVinculo(usuario.sub, pacienteId);
        if (!vinculado) {
          throw new ForbiddenException('Paciente não vinculado a você');
        }
        params.push(pacienteId);
        return `u.id_usuario = $${params.length}`;
      }
      // Sem filtro explícito, a tela de registros mostra os pacientes ativos dele.
      params.push(usuario.sub);
      return `p.id_paciente IN (
                SELECT np.id_paciente
                  FROM nutricionista_paciente np
                  JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
                 WHERE n.id_usuario = $${params.length}
                   AND np.ativo = TRUE)`;
    }

    // O administrador cuida de contas, não de prontuário.
    throw new ForbiddenException('Perfil sem acesso a registros clínicos');
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

  /**
   * Registro de refeição em dois caminhos:
   *
   * - texto livre, com os carboidratos que o paciente informa de cabeça;
   * - alimento da tabela nutricional mais a quantidade, e aí a conta é do
   *   sistema. É este segundo caminho que sustenta a contagem de carboidratos
   *   do briefing: o paciente escolhe "pão integral, 50 g" e não precisa saber
   *   quantos gramas de carboidrato isso dá.
   */
  async createRefeicao(idUsuario: string, dto: CreateRefeicaoDto) {
    const pacienteResult = await this.pool.query<{ id_paciente: string }>(
      'SELECT id_paciente FROM paciente WHERE id_usuario = $1',
      [idUsuario],
    );
    if (!pacienteResult.rows[0]) throw new NotFoundException('Perfil de paciente não encontrado');
    const idPaciente = pacienteResult.rows[0].id_paciente;

    let descricao = dto.descricao?.trim() || null;
    let idAlimento: string | null = null;
    let quantidadeG: number | null = null;
    let carboidratos = dto.carboidratos ?? null;
    let proteinas: number | null = null;
    let lipidios: number | null = null;
    let kcal: number | null = null;

    if (dto.alimentoId) {
      if (!dto.quantidadeG) {
        throw new BadRequestException(
          'Informe a quantidade consumida do alimento escolhido',
        );
      }
      // `buscar` recusa alimento inexistente ou desativado, então o registro
      // nunca aponta para uma linha que sumiu da tabela.
      const alimento = await this.alimentos.buscar(dto.alimentoId);
      const calculado = valoresParaQuantidade(alimento, dto.quantidadeG);

      idAlimento = alimento.id;
      quantidadeG = calculado.quantidadeG;
      // O que o paciente digitou não compete com a tabela: vale a conta.
      carboidratos = calculado.carboidratosG;
      proteinas = calculado.proteinasG;
      lipidios = calculado.lipidiosG;
      kcal = calculado.kcal;
      descricao = descricao ?? `${alimento.nome} (${calculado.quantidadeG} g)`;
    }

    if (!descricao) {
      throw new BadRequestException(
        'Descreva a refeição ou escolha um alimento da tabela',
      );
    }

    const result = await this.pool.query(
      `INSERT INTO registro_refeicao
         (id_paciente, descricao, tipo_refeicao, carboidratos, proteinas,
          lipidios, kcal, id_alimento, quantidade_g, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id_registro, descricao, tipo_refeicao, carboidratos, proteinas,
                 lipidios, kcal, id_alimento, quantidade_g, observacao, data_hora`,
      [
        idPaciente,
        descricao,
        dto.tipo_refeicao,
        carboidratos,
        proteinas,
        lipidios,
        kcal,
        idAlimento,
        quantidadeG,
        dto.observacao ?? null,
      ],
    );

    const r = result.rows[0];
    return {
      id: String(r.id_registro),
      tipo: 'refeicao',
      descricao: r.descricao,
      tipoRefeicao: r.tipo_refeicao,
      carboidratos: r.carboidratos != null ? Number(r.carboidratos) : null,
      proteinas: r.proteinas != null ? Number(r.proteinas) : null,
      lipidios: r.lipidios != null ? Number(r.lipidios) : null,
      kcal: r.kcal != null ? Number(r.kcal) : null,
      alimentoId: r.id_alimento != null ? String(r.id_alimento) : null,
      quantidadeG: r.quantidade_g != null ? Number(r.quantidade_g) : null,
      observacao: r.observacao,
      dataHora: r.data_hora,
    };
  }
}
