import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { valoresParaQuantidade } from '../../common/nutricao/nutricao';
import { CreateAlimentoDto } from './dto/create-alimento.dto';
import { UpdateAlimentoDto } from './dto/update-alimento.dto';

const PERFIS_EDITORES = ['administrador', 'nutricionista'];

@Injectable()
export class AlimentosService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private mapAlimento(r: Record<string, any>) {
    return {
      id: String(r.id_alimento),
      nome: r.nome,
      grupo: r.grupo,
      medidaCaseira: r.medida_caseira ?? null,
      medidaCaseiraG: r.medida_caseira_g === null ? null : Number(r.medida_caseira_g),
      porcaoG: Number(r.porcao_g),
      kcal: Number(r.kcal),
      carboidratosG: Number(r.carboidratos_g),
      proteinasG: Number(r.proteinas_g),
      lipidiosG: Number(r.lipidios_g),
      fibrasG: r.fibras_g === null ? null : Number(r.fibras_g),
      indiceGlicemico: r.indice_glicemico === null ? null : Number(r.indice_glicemico),
      fonte: r.fonte,
      ativo: r.ativo,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
    };
  }

  private podeEditar(user: JwtPayload) {
    if (!PERFIS_EDITORES.includes(user.role)) {
      throw new ForbiddenException(
        'Apenas administradores e nutricionistas podem manter a tabela de alimentos',
      );
    }
  }

  /**
   * A tabela de alimentos é de consulta livre para os três perfis: o paciente
   * precisa dela para registrar o que comeu.
   */
  async listar(filtros: {
    busca?: string;
    grupo?: string;
    incluirInativos?: boolean;
    limite?: number;
  }) {
    const params: unknown[] = [];
    const where: string[] = [];

    if (!filtros.incluirInativos) {
      where.push('ativo = TRUE');
    }
    if (filtros.busca?.trim()) {
      params.push(`%${filtros.busca.trim()}%`);
      where.push(`nome ILIKE $${params.length}`);
    }
    if (filtros.grupo?.trim()) {
      params.push(filtros.grupo.trim());
      where.push(`grupo = $${params.length}`);
    }

    const limite = Math.min(Math.max(filtros.limite ?? 100, 1), 500);
    params.push(limite);

    const { rows } = await this.pool.query(
      `SELECT * FROM alimento
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY nome
        LIMIT $${params.length}`,
      params,
    );

    return { data: rows.map((r) => this.mapAlimento(r)) };
  }

  /** Usado para montar o filtro de grupos na tela, sem lista fixa no código. */
  async grupos() {
    const { rows } = await this.pool.query(
      `SELECT grupo, COUNT(*)::int AS total
         FROM alimento
        WHERE ativo = TRUE
        GROUP BY grupo
        ORDER BY grupo`,
    );
    return { data: rows.map((r) => ({ grupo: r.grupo, total: r.total })) };
  }

  async buscar(id: string) {
    const { rows } = await this.pool.query('SELECT * FROM alimento WHERE id_alimento = $1', [
      id,
    ]);
    if (!rows.length) throw new NotFoundException('Alimento não encontrado');
    return this.mapAlimento(rows[0]);
  }

  /**
   * Converte a porção de referência do alimento para a quantidade informada.
   * Fica na API para a mesma regra de três valer no app e no painel.
   */
  async calcularPorcao(id: string, quantidadeG: number) {
    if (!(quantidadeG > 0)) {
      throw new BadRequestException('A quantidade em gramas deve ser maior que zero');
    }
    const alimento = await this.buscar(id);
    return {
      alimento: { id: alimento.id, nome: alimento.nome, porcaoG: alimento.porcaoG },
      ...valoresParaQuantidade(alimento, quantidadeG),
    };
  }

  async criar(user: JwtPayload, dto: CreateAlimentoDto) {
    this.podeEditar(user);

    const fonte = dto.fonte?.trim() || 'manual';
    const duplicado = await this.pool.query(
      `SELECT 1 FROM alimento WHERE lower(trim(nome)) = lower(trim($1)) AND fonte = $2`,
      [dto.nome, fonte],
    );
    if (duplicado.rowCount) {
      throw new BadRequestException(
        `Já existe um alimento chamado "${dto.nome.trim()}" nesta fonte`,
      );
    }

    const { rows } = await this.pool.query(
      `INSERT INTO alimento
        (nome, grupo, medida_caseira, medida_caseira_g, porcao_g,
         kcal, carboidratos_g, proteinas_g, lipidios_g, fibras_g,
         indice_glicemico, fonte, id_autor, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        dto.nome.trim(),
        dto.grupo?.trim() || 'outros',
        dto.medidaCaseira?.trim() ?? null,
        dto.medidaCaseiraG ?? null,
        dto.porcaoG ?? 100,
        dto.kcal,
        dto.carboidratosG,
        dto.proteinasG,
        dto.lipidiosG,
        dto.fibrasG ?? null,
        dto.indiceGlicemico ?? null,
        fonte,
        user.sub,
        dto.ativo ?? true,
      ],
    );

    return this.mapAlimento(rows[0]);
  }

  async atualizar(user: JwtPayload, id: string, dto: UpdateAlimentoDto) {
    this.podeEditar(user);
    const atual = await this.buscar(id);

    const { rows } = await this.pool.query(
      `UPDATE alimento SET
         nome = $2, grupo = $3, medida_caseira = $4, medida_caseira_g = $5,
         porcao_g = $6, kcal = $7, carboidratos_g = $8, proteinas_g = $9,
         lipidios_g = $10, fibras_g = $11, indice_glicemico = $12,
         fonte = $13, ativo = $14
       WHERE id_alimento = $1
       RETURNING *`,
      [
        id,
        dto.nome?.trim() ?? atual.nome,
        dto.grupo?.trim() ?? atual.grupo,
        dto.medidaCaseira !== undefined
          ? dto.medidaCaseira?.trim() ?? null
          : atual.medidaCaseira,
        dto.medidaCaseiraG !== undefined ? dto.medidaCaseiraG : atual.medidaCaseiraG,
        dto.porcaoG ?? atual.porcaoG,
        dto.kcal ?? atual.kcal,
        dto.carboidratosG ?? atual.carboidratosG,
        dto.proteinasG ?? atual.proteinasG,
        dto.lipidiosG ?? atual.lipidiosG,
        dto.fibrasG !== undefined ? dto.fibrasG : atual.fibrasG,
        dto.indiceGlicemico !== undefined ? dto.indiceGlicemico : atual.indiceGlicemico,
        dto.fonte?.trim() ?? atual.fonte,
        dto.ativo ?? atual.ativo,
      ],
    );

    return this.mapAlimento(rows[0]);
  }

  /**
   * Desativa em vez de apagar: o alimento pode estar citado num plano antigo ou
   * num registro de refeição, e apagar deixaria o histórico sem sentido.
   */
  async desativar(user: JwtPayload, id: string) {
    this.podeEditar(user);
    await this.buscar(id);
    await this.pool.query('UPDATE alimento SET ativo = FALSE WHERE id_alimento = $1', [id]);
    return { mensagem: 'Alimento desativado' };
  }
}
