import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { CreateReceitaDto } from './dto/create-receita.dto';
import { UpdateReceitaDto } from './dto/update-receita.dto';

const PERFIS_AUTORES = ['administrador', 'nutricionista'];

@Injectable()
export class ReceitasService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private numero(valor: unknown): number | null {
    return valor === null || valor === undefined ? null : Number(valor);
  }

  private mapReceita(r: Record<string, any>) {
    return {
      id: String(r.id_receita),
      titulo: r.titulo,
      resumo: r.resumo ?? null,
      ingredientes: r.ingredientes,
      modoPreparo: r.modo_preparo,
      porcoes: r.porcoes ?? null,
      tempoPreparoMin: r.tempo_preparo_min ?? null,
      kcalPorcao: this.numero(r.kcal_porcao),
      carboidratosPorcao: this.numero(r.carboidratos_porcao),
      proteinasPorcao: this.numero(r.proteinas_porcao),
      lipidiosPorcao: this.numero(r.lipidios_porcao),
      categoria: r.categoria,
      publicado: r.publicado,
      autorId: String(r.id_autor),
      autorNome: r.autor_nome ?? null,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
    };
  }

  private podeEscrever(user: JwtPayload) {
    if (!PERFIS_AUTORES.includes(user.role)) {
      throw new ForbiddenException(
        'Apenas administradores e nutricionistas publicam receitas',
      );
    }
  }

  /**
   * O paciente vê só o que está publicado. A nutricionista vê o que está
   * publicado mais os próprios rascunhos; o administrador vê tudo, porque é
   * ele quem revisa o conteúdo antes de liberar.
   */
  async listar(
    user: JwtPayload,
    filtros: { busca?: string; categoria?: string; apenasMinhas?: boolean; limite?: number },
  ) {
    const params: unknown[] = [];
    const where: string[] = [];

    if (user.role === 'paciente') {
      where.push('r.publicado = TRUE');
    } else if (user.role === 'nutricionista') {
      params.push(user.sub);
      where.push(`(r.publicado = TRUE OR r.id_autor = $${params.length})`);
    }

    if (filtros.apenasMinhas) {
      params.push(user.sub);
      where.push(`r.id_autor = $${params.length}`);
    }

    if (filtros.busca?.trim()) {
      params.push(`%${filtros.busca.trim()}%`);
      where.push(`(r.titulo ILIKE $${params.length} OR r.ingredientes ILIKE $${params.length})`);
    }

    if (filtros.categoria?.trim()) {
      params.push(filtros.categoria.trim());
      where.push(`r.categoria = $${params.length}`);
    }

    const limite = Math.min(Math.max(filtros.limite ?? 50, 1), 200);
    params.push(limite);

    const { rows } = await this.pool.query(
      `SELECT r.*, u.nome AS autor_nome
         FROM receita r
         JOIN usuario u ON u.id_usuario = r.id_autor
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY r.criado_em DESC
        LIMIT $${params.length}`,
      params,
    );

    return { data: rows.map((r) => this.mapReceita(r)) };
  }

  async categorias(user: JwtPayload) {
    const somentePublicadas = user.role === 'paciente' ? 'WHERE publicado = TRUE' : '';
    const { rows } = await this.pool.query(
      `SELECT categoria, COUNT(*)::int AS total
         FROM receita ${somentePublicadas}
        GROUP BY categoria ORDER BY categoria`,
    );
    return { data: rows };
  }

  async buscar(user: JwtPayload, id: string) {
    const { rows } = await this.pool.query(
      `SELECT r.*, u.nome AS autor_nome
         FROM receita r
         JOIN usuario u ON u.id_usuario = r.id_autor
        WHERE r.id_receita = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('Receita não encontrada');

    const receita = rows[0];
    const rascunhoDeOutro =
      !receita.publicado &&
      user.role !== 'administrador' &&
      String(receita.id_autor) !== String(user.sub);
    // Rascunho de outra pessoa responde como inexistente: não vale confirmar
    // que existe uma receita que o usuário não pode ler.
    if (rascunhoDeOutro) throw new NotFoundException('Receita não encontrada');

    return this.mapReceita(receita);
  }

  async criar(user: JwtPayload, dto: CreateReceitaDto) {
    this.podeEscrever(user);

    const { rows } = await this.pool.query(
      `INSERT INTO receita
        (id_autor, titulo, resumo, ingredientes, modo_preparo, porcoes,
         tempo_preparo_min, kcal_porcao, carboidratos_porcao, proteinas_porcao,
         lipidios_porcao, categoria, publicado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        user.sub,
        dto.titulo.trim(),
        dto.resumo?.trim() ?? null,
        dto.ingredientes.trim(),
        dto.modoPreparo.trim(),
        dto.porcoes ?? null,
        dto.tempoPreparoMin ?? null,
        dto.kcalPorcao ?? null,
        dto.carboidratosPorcao ?? null,
        dto.proteinasPorcao ?? null,
        dto.lipidiosPorcao ?? null,
        dto.categoria?.trim() || 'geral',
        dto.publicado ?? false,
      ],
    );

    return this.mapReceita(rows[0]);
  }

  private async buscarParaEdicao(user: JwtPayload, id: string) {
    this.podeEscrever(user);
    const { rows } = await this.pool.query(
      'SELECT * FROM receita WHERE id_receita = $1',
      [id],
    );
    if (!rows.length) throw new NotFoundException('Receita não encontrada');

    // Nutricionista edita apenas o que escreveu; administrador edita qualquer uma.
    if (
      user.role !== 'administrador' &&
      String(rows[0].id_autor) !== String(user.sub)
    ) {
      throw new ForbiddenException('Esta receita é de outro autor');
    }

    return rows[0];
  }

  async atualizar(user: JwtPayload, id: string, dto: UpdateReceitaDto) {
    const atual = await this.buscarParaEdicao(user, id);

    const opcional = (novo: unknown, anterior: unknown) =>
      novo !== undefined ? novo : anterior;

    const { rows } = await this.pool.query(
      `UPDATE receita SET
         titulo = $2, resumo = $3, ingredientes = $4, modo_preparo = $5,
         porcoes = $6, tempo_preparo_min = $7, kcal_porcao = $8,
         carboidratos_porcao = $9, proteinas_porcao = $10, lipidios_porcao = $11,
         categoria = $12, publicado = $13
       WHERE id_receita = $1
       RETURNING *`,
      [
        id,
        dto.titulo?.trim() ?? atual.titulo,
        dto.resumo !== undefined ? dto.resumo?.trim() ?? null : atual.resumo,
        dto.ingredientes?.trim() ?? atual.ingredientes,
        dto.modoPreparo?.trim() ?? atual.modo_preparo,
        opcional(dto.porcoes, atual.porcoes),
        opcional(dto.tempoPreparoMin, atual.tempo_preparo_min),
        opcional(dto.kcalPorcao, atual.kcal_porcao),
        opcional(dto.carboidratosPorcao, atual.carboidratos_porcao),
        opcional(dto.proteinasPorcao, atual.proteinas_porcao),
        opcional(dto.lipidiosPorcao, atual.lipidios_porcao),
        dto.categoria?.trim() ?? atual.categoria,
        dto.publicado ?? atual.publicado,
      ],
    );

    return this.mapReceita(rows[0]);
  }

  async remover(user: JwtPayload, id: string) {
    await this.buscarParaEdicao(user, id);
    await this.pool.query('DELETE FROM receita WHERE id_receita = $1', [id]);
    return { mensagem: 'Receita removida' };
  }
}
