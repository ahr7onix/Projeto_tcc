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
      publico: r.publico ?? 'todos',
      agendadoEm: r.agendado_em ?? null,
      imagemCapa: r.imagem_capa ?? null,
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

  /**
   * Quais públicos-alvo este usuário alcança.
   *
   * A coluna `publico` existia desde a migration 012 e era gravada pelo painel,
   * mas nenhuma consulta a usava: marcar um conteúdo como "pacientes_diabetes"
   * não escondia nada, e todo paciente via tudo.
   *
   * Editores recebem lista vazia — para eles não há filtro, porque precisam
   * enxergar todo o acervo para administrá-lo.
   *
   * `adultos` fica de fora quando a data de nascimento não foi preenchida: sem
   * a data não dá para afirmar que a pessoa é maior de idade, e o público
   * existe justamente para separar o que não serve a menores. O efeito é um
   * paciente com cadastro incompleto ver menos conteúdo, não mais.
   */
  private async publicosDoUsuario(user: JwtPayload): Promise<string[]> {
    if (PERFIS_EDITORES.includes(user.role)) return [];

    const { rows } = await this.pool.query(
      `SELECT p.tipo_diabetes IS NOT NULL AS tem_diabetes,
              (p.data_nascimento IS NOT NULL
                AND p.data_nascimento <= CURRENT_DATE - INTERVAL '18 years') AS adulto
         FROM paciente p
        WHERE p.id_usuario = $1`,
      [user.sub],
    );

    const publicos = ['todos'];
    if (rows[0]?.tem_diabetes) publicos.push('pacientes_diabetes');
    if (rows[0]?.adulto) publicos.push('adultos');
    return publicos;
  }

  async listar(user: JwtPayload, filtros: { categoria?: string; todos?: boolean } = {}) {
    const params: unknown[] = [];
    const condicoes: string[] = [];

    const podeVerRascunhos = PERFIS_EDITORES.includes(user.role);
    if (!podeVerRascunhos || !filtros.todos) {
      condicoes.push('c.publicado = TRUE AND (c.agendado_em IS NULL OR c.agendado_em <= NOW())');
    }
    if (filtros.categoria) {
      params.push(filtros.categoria);
      condicoes.push(`c.categoria = $${params.length}`);
    }

    const publicos = await this.publicosDoUsuario(user);
    if (publicos.length) {
      params.push(publicos);
      condicoes.push(`c.publico = ANY($${params.length}::varchar[])`);
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    const { rows } = await this.pool.query(
      `SELECT c.id_conteudo, c.titulo, c.resumo, c.categoria, c.publicado,
              c.criado_em, c.atualizado_em, c.publico, c.agendado_em, c.imagem_capa,
              u.nome AS autor_nome
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

    if (!PERFIS_EDITORES.includes(user.role)) {
      /**
       * O `listar` esconde rascunho, agendamento futuro e público alheio; aqui
       * só o rascunho era conferido. Bastava ter o id para abrir um conteúdo
       * agendado para a semana seguinte, ou destinado a outro público-alvo.
       */
      const agendadoParaDepois =
        r.agendado_em != null && new Date(r.agendado_em) > new Date();
      const publicos = await this.publicosDoUsuario(user);

      if (
        !r.publicado ||
        agendadoParaDepois ||
        !publicos.includes(r.publico ?? 'todos')
      ) {
        throw new NotFoundException('Conteúdo não encontrado');
      }
    }

    return this.mapConteudo(r);
  }

  async criar(user: JwtPayload, dto: CreateConteudoDto) {
    this.podeEditar(user);

    const { rows } = await this.pool.query(
      `INSERT INTO conteudo_educativo
         (id_autor, titulo, resumo, conteudo, categoria, publicado, publico, agendado_em, imagem_capa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        user.sub,
        dto.titulo.trim(),
        dto.resumo?.trim() ?? null,
        dto.conteudo.trim(),
        dto.categoria?.trim() || 'geral',
        dto.publicado ?? false,
        dto.publico ?? 'todos',
        dto.agendadoEm ? new Date(dto.agendadoEm) : null,
        dto.imagemCapa?.trim() || null,
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
              categoria = $4, publicado = $5, publico = $6,
              agendado_em = $7, imagem_capa = $8, atualizado_em = NOW()
        WHERE id_conteudo = $9
        RETURNING *`,
      [
        dto.titulo?.trim() ?? atual.titulo,
        dto.resumo !== undefined ? dto.resumo?.trim() ?? null : atual.resumo,
        dto.conteudo?.trim() ?? atual.conteudo,
        dto.categoria?.trim() ?? atual.categoria,
        dto.publicado ?? atual.publicado,
        dto.publico ?? atual.publico ?? 'todos',
        // O campo aceita três estados: ausente mantém o agendamento atual,
        // vazio o remove e uma data o substitui. Sem o teste do meio,
        // `new Date(null)` devolvia 1970-01-01 e o conteúdo aparecia como se
        // já tivesse sido publicado há décadas.
        dto.agendadoEm !== undefined
          ? dto.agendadoEm
            ? new Date(dto.agendadoEm)
            : null
          : atual.agendado_em,
        dto.imagemCapa !== undefined ? dto.imagemCapa?.trim() || null : atual.imagem_capa,
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
