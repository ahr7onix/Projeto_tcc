import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { CreateConteudoDto } from './dto/create-conteudo.dto';
import type { UpdateConteudoDto } from './dto/update-conteudo.dto';

const PERFIS_EDITORES = ['administrador', 'nutricionista'];

@Injectable()
export class ConteudosService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private mapConteudo(r: Record<string, any>, incluirCorpo = true) {
    return {
      id: String(r.id_conteudo),
      titulo: r.titulo,
      resumo: r.resumo ?? null,
      categoria: r.categoria,
      publicado: r.publicado,
      autorNome: r.autor_nome ?? null,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
      ...(incluirCorpo ? { conteudo: r.conteudo } : {}),
    };
  }

  private podeEditar(user: JwtPayload) {
    if (!PERFIS_EDITORES.includes(user.role)) {
      throw new ForbiddenException(
        'Apenas administradores e nutricionistas podem gerenciar conteúdos',
      );
    }
  }

  async listar(user: JwtPayload, filtros: { categoria?: string; todos?: boolean } = {}) {
    const params: unknown[] = [];
    const condicoes: string[] = [];

    const podeVerRascunhos = PERFIS_EDITORES.includes(user.role);
    if (!podeVerRascunhos || !filtros.todos) {
      condicoes.push('c.publicado = TRUE');
    }
    if (filtros.categoria) {
      params.push(filtros.categoria);
      condicoes.push(`c.categoria = $${params.length}`);
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    const { rows } = await this.pool.query(
      `SELECT c.id_conteudo, c.titulo, c.resumo, c.categoria, c.publicado,
              c.criado_em, c.atualizado_em, u.nome AS autor_nome
         FROM conteudo_educativo c
         JOIN usuario u ON u.id_usuario = c.id_autor
         ${where}
         ORDER BY c.criado_em DESC`,
      params,
    );

    return { data: rows.map((r) => this.mapConteudo(r, false)) };
  }

  async buscar(user: JwtPayload, id: string) {
    const { rows } = await this.pool.query(
      `SELECT c.*, u.nome AS autor_nome
         FROM conteudo_educativo c
         JOIN usuario u ON u.id_usuario = c.id_autor
        WHERE c.id_conteudo = $1`,
      [id],
    );

    const r = rows[0];
    if (!r) throw new NotFoundException('Conteúdo não encontrado');

    if (!r.publicado && !PERFIS_EDITORES.includes(user.role)) {
      throw new NotFoundException('Conteúdo não encontrado');
    }

    return this.mapConteudo(r);
  }

  async criar(user: JwtPayload, dto: CreateConteudoDto) {
    this.podeEditar(user);

    const { rows } = await this.pool.query(
      `INSERT INTO conteudo_educativo
         (id_autor, titulo, resumo, conteudo, categoria, publicado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user.sub,
        dto.titulo.trim(),
        dto.resumo?.trim() ?? null,
        dto.conteudo.trim(),
        dto.categoria?.trim() || 'geral',
        dto.publicado ?? false,
      ],
    );

    return this.mapConteudo(rows[0]);
  }

  async atualizar(user: JwtPayload, id: string, dto: UpdateConteudoDto) {
    this.podeEditar(user);

    const { rows: atuais } = await this.pool.query(
      `SELECT * FROM conteudo_educativo WHERE id_conteudo = $1`,
      [id],
    );
    const atual = atuais[0];
    if (!atual) throw new NotFoundException('Conteúdo não encontrado');

    if (user.role === 'nutricionista' && String(atual.id_autor) !== user.sub) {
      throw new ForbiddenException('Este conteúdo foi criado por outro usuário');
    }

    const { rows } = await this.pool.query(
      `UPDATE conteudo_educativo
          SET titulo = $1, resumo = $2, conteudo = $3,
              categoria = $4, publicado = $5, atualizado_em = NOW()
        WHERE id_conteudo = $6
        RETURNING *`,
      [
        dto.titulo?.trim() ?? atual.titulo,
        dto.resumo !== undefined ? dto.resumo?.trim() ?? null : atual.resumo,
        dto.conteudo?.trim() ?? atual.conteudo,
        dto.categoria?.trim() ?? atual.categoria,
        dto.publicado ?? atual.publicado,
        id,
      ],
    );

    return this.mapConteudo(rows[0]);
  }

  async remover(user: JwtPayload, id: string) {
    this.podeEditar(user);

    const { rows } = await this.pool.query(
      `SELECT id_autor FROM conteudo_educativo WHERE id_conteudo = $1`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Conteúdo não encontrado');

    if (user.role === 'nutricionista' && String(rows[0].id_autor) !== user.sub) {
      throw new ForbiddenException('Este conteúdo foi criado por outro usuário');
    }

    await this.pool.query(`DELETE FROM conteudo_educativo WHERE id_conteudo = $1`, [id]);
    return { removido: true };
  }
}
