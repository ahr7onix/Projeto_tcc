import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { VinculosService } from '../vinculos/vinculos.service';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import {
  somarPorcoes,
  valoresParaQuantidade,
} from '../../common/nutricao/nutricao';
import type { ValoresPorcao } from '../../common/nutricao/nutricao';
import type {
  CreatePlanoDto,
  ItemRefeicaoDto,
  RefeicaoPlanoDto,
} from './dto/create-plano.dto';
import type { UpdatePlanoDto } from './dto/update-plano.dto';

interface PlanoRow {
  id_plano: string;
  id_paciente: string;
  id_nutricionista: string;
  data_inicio: Date;
  data_fim: Date | null;
  vet_kcal: string | null;
  formula_vet: string | null;
  fator_atividade: string | null;
  perc_carboidratos: string | null;
  perc_proteinas: string | null;
  perc_lipidios: string | null;
  observacoes: string | null;
  criado_em: Date;
  paciente_usuario_id: string;
  paciente_nome: string;
  nutricionista_nome: string;
}

interface RefeicaoRow {
  id_refeicao: string;
  id_plano: string;
  nome_refeicao: string;
  horario: string;
  itens: string;
}

/** Item da refeição já com os valores do alimento da tabela (quando houver). */
interface ItemRow {
  id_item: string;
  id_refeicao: string;
  id_alimento: string | null;
  descricao: string | null;
  quantidade_g: string;
  alimento_nome: string | null;
  porcao_g: string | null;
  kcal: string | null;
  carboidratos_g: string | null;
  proteinas_g: string | null;
  lipidios_g: string | null;
  fibras_g: string | null;
}

const SELECT_ITENS = `
  SELECT ri.id_item, ri.id_refeicao, ri.id_alimento, ri.descricao,
         ri.quantidade_g,
         a.nome           AS alimento_nome,
         a.porcao_g, a.kcal, a.carboidratos_g, a.proteinas_g,
         a.lipidios_g, a.fibras_g
    FROM refeicao_item ri
    LEFT JOIN alimento a ON a.id_alimento = ri.id_alimento
   WHERE ri.id_refeicao = ANY($1::bigint[])
   ORDER BY ri.id_item`;

@Injectable()
export class PlanosService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private async resolvePacienteId(idUsuario: string): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT id_paciente FROM paciente WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Paciente não encontrado');
    return String(rows[0].id_paciente);
  }

  private async resolveNutricionistaId(idUsuario: string): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT id_nutricionista FROM nutricionista WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Nutricionista não encontrado');
    return String(rows[0].id_nutricionista);
  }

  private numero(valor: string | null): number | null {
    return valor === null || valor === undefined ? null : Number(valor);
  }

  /** Valores nutricionais do alimento da tabela; null quando o item é texto livre. */
  private valoresPorcaoDo(item: ItemRow): ValoresPorcao | null {
    if (item.id_alimento === null || item.porcao_g === null) return null;
    return {
      porcaoG: Number(item.porcao_g),
      kcal: Number(item.kcal),
      carboidratosG: Number(item.carboidratos_g),
      proteinasG: Number(item.proteinas_g),
      lipidiosG: Number(item.lipidios_g),
      fibrasG: item.fibras_g === null ? null : Number(item.fibras_g),
    };
  }

  private mapItem(item: ItemRow) {
    const alimento = this.valoresPorcaoDo(item);
    const quantidadeG = Number(item.quantidade_g);
    return {
      id: String(item.id_item),
      alimentoId: item.id_alimento === null ? null : String(item.id_alimento),
      nome: item.alimento_nome ?? item.descricao,
      descricao: item.descricao,
      quantidadeG,
      // Texto livre não entra no cálculo: não existe tabela para consultar.
      valores: alimento ? valoresParaQuantidade(alimento, quantidadeG) : null,
    };
  }

  /**
   * Soma o que é calculável e informa quantos itens ficaram de fora, para a
   * tela não apresentar um total incompleto como se fosse o total do plano.
   */
  private somarItens(itens: ItemRow[]) {
    const calculaveis: Array<{ alimento: ValoresPorcao; quantidadeG: number }> =
      [];
    for (const item of itens) {
      const alimento = this.valoresPorcaoDo(item);
      if (alimento) {
        calculaveis.push({ alimento, quantidadeG: Number(item.quantidade_g) });
      }
    }
    return {
      ...somarPorcoes(calculaveis),
      itensSemAnalise: itens.length - calculaveis.length,
    };
  }

  private mapPlano(
    row: PlanoRow,
    refeicoes: RefeicaoRow[] = [],
    itensPorRefeicao: Map<string, ItemRow[]> = new Map(),
  ) {
    const hoje = new Date().toISOString().slice(0, 10);
    const inicio = this.toDateString(row.data_inicio);
    const fim = row.data_fim ? this.toDateString(row.data_fim) : null;

    const todosItens: ItemRow[] = [];
    const refeicoesMapeadas = refeicoes.map((r) => {
      const itens = itensPorRefeicao.get(String(r.id_refeicao)) ?? [];
      todosItens.push(...itens);
      return {
        id: String(r.id_refeicao),
        nome: r.nome_refeicao,
        horario: String(r.horario).slice(0, 5),
        itens: r.itens,
        alimentos: itens.map((item) => this.mapItem(item)),
        totais: this.somarItens(itens),
      };
    });

    return {
      id: String(row.id_plano),
      pacienteId: String(row.paciente_usuario_id),
      pacienteNome: row.paciente_nome,
      nutricionistaNome: row.nutricionista_nome,
      dataInicio: inicio,
      dataFim: fim,
      ativo: inicio <= hoje && (fim === null || fim >= hoje),
      vetKcal: this.numero(row.vet_kcal),
      formulaVet: row.formula_vet,
      fatorAtividade: this.numero(row.fator_atividade),
      percCarboidratos: this.numero(row.perc_carboidratos),
      percProteinas: this.numero(row.perc_proteinas),
      percLipidios: this.numero(row.perc_lipidios),
      observacoes: row.observacoes,
      criadoEm: row.criado_em,
      refeicoes: refeicoesMapeadas,
      totais: this.somarItens(todosItens),
    };
  }

  private toDateString(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);
  }

  private validarPeriodo(dataInicio: string, dataFim?: string | null) {
    if (dataFim && dataFim < dataInicio) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial',
      );
    }
  }

  /**
   * Mesma regra do CHECK chk_plano_macros_100: ou os três percentuais vêm
   * juntos e somam 100, ou nenhum vem. A validação é repetida aqui para o
   * usuário receber uma mensagem em vez de um erro de constraint.
   */
  private validarMacros(
    carboidratos: number | null,
    proteinas: number | null,
    lipidios: number | null,
  ) {
    const preenchidos = [carboidratos, proteinas, lipidios].filter(
      (v) => v !== null,
    ).length;
    if (preenchidos === 0) return;
    if (preenchidos < 3) {
      throw new BadRequestException(
        'Informe os três percentuais (carboidratos, proteínas e lipídios) ou nenhum',
      );
    }
    const soma =
      (carboidratos as number) + (proteinas as number) + (lipidios as number);
    if (Math.round(soma) !== 100) {
      throw new BadRequestException(
        `Os percentuais de macronutrientes devem somar 100 (recebido ${soma})`,
      );
    }
  }

  /**
   * Confere de uma só vez todos os alimentos citados no plano e devolve o nome
   * de cada um — usado para montar a descrição da refeição quando a
   * nutricionista envia só a lista estruturada.
   */
  private async validarAlimentos(
    client: PoolClient,
    refeicoes: RefeicaoPlanoDto[],
  ): Promise<Map<string, string>> {
    const ids = new Set<string>();
    for (const r of refeicoes) {
      for (const item of r.alimentos ?? []) {
        if (item.alimentoId) ids.add(item.alimentoId);
      }
    }
    const nomes = new Map<string, string>();
    if (!ids.size) return nomes;

    const lista = [...ids];
    const { rows } = await client.query(
      `SELECT id_alimento, nome FROM alimento WHERE id_alimento = ANY($1::bigint[])`,
      [lista],
    );
    for (const row of rows) nomes.set(String(row.id_alimento), row.nome);

    const faltando = lista.filter((id) => !nomes.has(id));
    if (faltando.length) {
      throw new BadRequestException(
        `Alimento não encontrado na tabela: ${faltando.join(', ')}`,
      );
    }
    return nomes;
  }

  private descreverItem(item: ItemRefeicaoDto, nomes: Map<string, string>) {
    const nome = item.alimentoId
      ? nomes.get(item.alimentoId)
      : item.descricao?.trim();
    // Quantidade sem decimal desnecessário: "120 g", não "120.0 g".
    const quantidade = Number(item.quantidadeG.toFixed(2));
    return `${quantidade} g de ${nome}`;
  }

  private async inserirRefeicoes(
    client: PoolClient,
    idPlano: string,
    refeicoes: RefeicaoPlanoDto[],
  ) {
    const nomes = await this.validarAlimentos(client, refeicoes);

    for (const r of refeicoes) {
      const alimentos = r.alimentos ?? [];

      for (const item of alimentos) {
        // Mesmo CHECK da tabela refeicao_item: sem alimento e sem descrição o
        // item não diz nada.
        if (!item.alimentoId && !item.descricao?.trim()) {
          throw new BadRequestException(
            `Item da refeição "${r.nome}" precisa de um alimento da tabela ou de uma descrição`,
          );
        }
      }

      const texto =
        r.itens?.trim() ||
        alimentos.map((item) => this.descreverItem(item, nomes)).join('; ');
      if (!texto) {
        throw new BadRequestException(
          `Informe os itens da refeição "${r.nome}": um texto ou uma lista de alimentos`,
        );
      }

      const { rows } = await client.query(
        `INSERT INTO refeicao (id_plano, nome_refeicao, horario, itens)
         VALUES ($1, $2, $3, $4)
         RETURNING id_refeicao`,
        [idPlano, r.nome.trim(), r.horario, texto],
      );
      const idRefeicao = String(rows[0].id_refeicao);

      for (const item of alimentos) {
        await client.query(
          `INSERT INTO refeicao_item (id_refeicao, id_alimento, descricao, quantidade_g)
           VALUES ($1, $2, $3, $4)`,
          [
            idRefeicao,
            item.alimentoId ?? null,
            item.descricao?.trim() ?? null,
            item.quantidadeG,
          ],
        );
      }
    }
  }

  private async buscarPlanoAutorizado(idPlano: string, user: JwtPayload) {
    const { rows } = await this.pool.query<PlanoRow>(
      `SELECT pa.*,
              up.id_usuario AS paciente_usuario_id,
              up.nome       AS paciente_nome,
              un.nome       AS nutricionista_nome,
              n.id_usuario  AS nutricionista_usuario_id
         FROM plano_alimentar pa
         JOIN paciente p       ON p.id_paciente = pa.id_paciente
         JOIN usuario  up      ON up.id_usuario = p.id_usuario
         JOIN nutricionista n  ON n.id_nutricionista = pa.id_nutricionista
         JOIN usuario  un      ON un.id_usuario = n.id_usuario
        WHERE pa.id_plano = $1`,
      [idPlano],
    );

    const row = rows[0] as (PlanoRow & { nutricionista_usuario_id: string }) | undefined;
    if (!row) throw new NotFoundException('Plano alimentar não encontrado');

    if (user.role === 'paciente' && String(row.paciente_usuario_id) !== user.sub) {
      throw new ForbiddenException('Acesso negado a este plano');
    }

    if (
      user.role === 'nutricionista' &&
      String(row.nutricionista_usuario_id) !== user.sub
    ) {
      throw new ForbiddenException(
        'Este plano pertence a outro nutricionista',
      );
    }

    return row;
  }

  /** Carrega refeições e itens de um ou vários planos em duas consultas. */
  private async carregarRefeicoes(idsPlano: string[]) {
    const porPlano = new Map<string, RefeicaoRow[]>();
    const itensPorRefeicao = new Map<string, ItemRow[]>();
    if (!idsPlano.length) return { porPlano, itensPorRefeicao };

    const { rows: refeicoes } = await this.pool.query<RefeicaoRow>(
      `SELECT id_refeicao, id_plano, nome_refeicao, horario, itens
         FROM refeicao
        WHERE id_plano = ANY($1::bigint[])
        ORDER BY horario`,
      [idsPlano],
    );
    for (const r of refeicoes) {
      const key = String(r.id_plano);
      if (!porPlano.has(key)) porPlano.set(key, []);
      porPlano.get(key)!.push(r);
    }

    if (refeicoes.length) {
      const { rows: itens } = await this.pool.query<ItemRow>(SELECT_ITENS, [
        refeicoes.map((r) => r.id_refeicao),
      ]);
      for (const item of itens) {
        const key = String(item.id_refeicao);
        if (!itensPorRefeicao.has(key)) itensPorRefeicao.set(key, []);
        itensPorRefeicao.get(key)!.push(item);
      }
    }

    return { porPlano, itensPorRefeicao };
  }

  async findAll(user: JwtPayload, pacienteId?: string) {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (user.role === 'paciente') {
      params.push(user.sub);
      conditions.push(`up.id_usuario = $${params.length}`);
    } else {
      params.push(user.sub);
      conditions.push(`un.id_usuario = $${params.length}`);
      if (pacienteId) {
        params.push(pacienteId);
        conditions.push(`up.id_usuario = $${params.length}`);
      }
    }

    const { rows } = await this.pool.query<PlanoRow>(
      `SELECT pa.*,
              up.id_usuario AS paciente_usuario_id,
              up.nome       AS paciente_nome,
              un.nome       AS nutricionista_nome
         FROM plano_alimentar pa
         JOIN paciente p      ON p.id_paciente = pa.id_paciente
         JOIN usuario  up     ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = pa.id_nutricionista
         JOIN usuario  un     ON un.id_usuario = n.id_usuario
        WHERE ${conditions.join(' AND ')}
        ORDER BY pa.data_inicio DESC`,
      params,
    );

    if (!rows.length) return { data: [] };

    const { porPlano, itensPorRefeicao } = await this.carregarRefeicoes(
      rows.map((r) => r.id_plano),
    );

    return {
      data: rows.map((row) =>
        this.mapPlano(
          row,
          porPlano.get(String(row.id_plano)) ?? [],
          itensPorRefeicao,
        ),
      ),
    };
  }

  async findOne(idPlano: string, user: JwtPayload) {
    const row = await this.buscarPlanoAutorizado(idPlano, user);
    const { porPlano, itensPorRefeicao } = await this.carregarRefeicoes([
      idPlano,
    ]);
    return this.mapPlano(
      row,
      porPlano.get(String(idPlano)) ?? [],
      itensPorRefeicao,
    );
  }

  async findAtivo(user: JwtPayload, pacienteId?: string) {
    const alvo = user.role === 'paciente' ? user.sub : pacienteId;
    if (!alvo) throw new BadRequestException('Informe o pacienteId');

    const { rows } = await this.pool.query<PlanoRow>(
      `SELECT pa.*,
              up.id_usuario AS paciente_usuario_id,
              up.nome       AS paciente_nome,
              un.nome       AS nutricionista_nome
         FROM plano_alimentar pa
         JOIN paciente p      ON p.id_paciente = pa.id_paciente
         JOIN usuario  up     ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = pa.id_nutricionista
         JOIN usuario  un     ON un.id_usuario = n.id_usuario
        WHERE up.id_usuario = $1
          AND pa.data_inicio <= CURRENT_DATE
          AND (pa.data_fim IS NULL OR pa.data_fim >= CURRENT_DATE)
        ORDER BY pa.data_inicio DESC
        LIMIT 1`,
      [alvo],
    );

    const row = rows[0];
    if (!row) return null;

    const { porPlano, itensPorRefeicao } = await this.carregarRefeicoes([
      String(row.id_plano),
    ]);
    return this.mapPlano(
      row,
      porPlano.get(String(row.id_plano)) ?? [],
      itensPorRefeicao,
    );
  }

  async create(idUsuarioNutri: string, dto: CreatePlanoDto) {
    this.validarPeriodo(dto.dataInicio, dto.dataFim);
    this.validarMacros(
      dto.percCarboidratos ?? null,
      dto.percProteinas ?? null,
      dto.percLipidios ?? null,
    );

    await this.vinculos.garantirVinculo(idUsuarioNutri, dto.pacienteId);

    const idNutricionista = await this.resolveNutricionistaId(idUsuarioNutri);
    const idPaciente = await this.resolvePacienteId(dto.pacienteId);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO plano_alimentar
           (id_paciente, id_nutricionista, data_inicio, data_fim,
            vet_kcal, formula_vet, fator_atividade,
            perc_carboidratos, perc_proteinas, perc_lipidios, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id_plano`,
        [
          idPaciente,
          idNutricionista,
          dto.dataInicio,
          dto.dataFim ?? null,
          dto.vetKcal ?? null,
          dto.formulaVet ?? null,
          dto.fatorAtividade ?? null,
          dto.percCarboidratos ?? null,
          dto.percProteinas ?? null,
          dto.percLipidios ?? null,
          dto.observacoes?.trim() ?? null,
        ],
      );

      const idPlano = String(rows[0].id_plano);
      await this.inserirRefeicoes(client, idPlano, dto.refeicoes);

      await client.query('COMMIT');
      return this.findOne(idPlano, {
        sub: idUsuarioNutri,
        email: '',
        role: 'nutricionista',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(idPlano: string, user: JwtPayload, dto: UpdatePlanoDto) {
    const atual = await this.buscarPlanoAutorizado(idPlano, user);

    const dataInicio = dto.dataInicio ?? this.toDateString(atual.data_inicio);
    const dataFim =
      dto.dataFim !== undefined
        ? dto.dataFim
        : atual.data_fim
          ? this.toDateString(atual.data_fim)
          : null;
    this.validarPeriodo(dataInicio, dataFim);

    const vetKcal =
      dto.vetKcal !== undefined ? dto.vetKcal : this.numero(atual.vet_kcal);
    const formulaVet =
      dto.formulaVet !== undefined ? dto.formulaVet : atual.formula_vet;
    const fatorAtividade =
      dto.fatorAtividade !== undefined
        ? dto.fatorAtividade
        : this.numero(atual.fator_atividade);
    const percCarboidratos =
      dto.percCarboidratos !== undefined
        ? dto.percCarboidratos
        : this.numero(atual.perc_carboidratos);
    const percProteinas =
      dto.percProteinas !== undefined
        ? dto.percProteinas
        : this.numero(atual.perc_proteinas);
    const percLipidios =
      dto.percLipidios !== undefined
        ? dto.percLipidios
        : this.numero(atual.perc_lipidios);
    const observacoes =
      dto.observacoes !== undefined
        ? dto.observacoes?.trim() ?? null
        : atual.observacoes;

    this.validarMacros(percCarboidratos, percProteinas, percLipidios);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE plano_alimentar
            SET data_inicio = $1, data_fim = $2,
                vet_kcal = $3, formula_vet = $4, fator_atividade = $5,
                perc_carboidratos = $6, perc_proteinas = $7,
                perc_lipidios = $8, observacoes = $9
          WHERE id_plano = $10`,
        [
          dataInicio,
          dataFim,
          vetKcal,
          formulaVet,
          fatorAtividade,
          percCarboidratos,
          percProteinas,
          percLipidios,
          observacoes,
          idPlano,
        ],
      );

      if (dto.refeicoes) {
        // Os itens saem junto por ON DELETE CASCADE em refeicao_item.
        await client.query(`DELETE FROM refeicao WHERE id_plano = $1`, [
          idPlano,
        ]);
        await this.inserirRefeicoes(client, idPlano, dto.refeicoes);
      }

      await client.query('COMMIT');
      return this.findOne(idPlano, user);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async remove(idPlano: string, user: JwtPayload) {
    await this.buscarPlanoAutorizado(idPlano, user);

    await this.pool.query(`DELETE FROM plano_alimentar WHERE id_plano = $1`, [
      idPlano,
    ]);
    return { deleted: true };
  }
}
