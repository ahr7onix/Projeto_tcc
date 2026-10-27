import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { valoresParaQuantidade } from '../../common/nutricao/nutricao';
import { CreateAlimentoDto } from './dto/create-alimento.dto';
import { ImportarAlimentosDto } from './dto/importar-alimentos.dto';
import { UpdateAlimentoDto } from './dto/update-alimento.dto';

const PERFIS_EDITORES = ['administrador', 'nutricionista'];

/** Nome de cada campo como a nutricionista o reconhece na planilha. */
const ROTULOS_CAMPOS: Record<string, string> = {
  nome: 'nome',
  grupo: 'grupo',
  medidaCaseira: 'medida caseira',
  medidaCaseiraG: 'gramas da medida caseira',
  porcaoG: 'porção de referência',
  kcal: 'calorias',
  carboidratosG: 'carboidratos',
  proteinasG: 'proteínas',
  lipidiosG: 'lipídios',
  fibrasG: 'fibras',
  indiceGlicemico: 'índice glicêmico',
};

/**
 * Carboidratos, proteínas e lipídios de uma porção não podem pesar mais que a
 * própria porção. Vale para o cadastro manual e para cada linha da importação.
 */
const MENSAGEM_MACROS_EXCEDEM =
  'Carboidratos, proteínas e lipídios somam mais que o peso da porção';

function macrosExcedemPorcao(porcaoG: number, carb: number, prot: number, lip: number): boolean {
  return carb + prot + lip > porcaoG;
}

function descreverErros(erros: ValidationError[]): string {
  const campos = erros.map((e) => ROTULOS_CAMPOS[e.property] ?? e.property);
  return `Valor ausente ou inválido em: ${campos.join(', ')}`;
}

export interface LinhaRecusada {
  /** Posição do item na lista enviada, a partir de zero. */
  indice: number;
  nome: string | null;
  motivo: string;
}

const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucn';

/**
 * Compara texto ignorando acento dos dois lados.
 *
 * No teclado do celular o paciente digita "pao" e "feijao"; a tabela guarda
 * "Pão" e "Feijão", e o ILIKE puro não casava nenhum dos dois — buscar por
 * "pao" devolvia lista vazia com dois pães cadastrados.
 *
 * A extensão `unaccent` resolveria isso com menos código, mas exige
 * `CREATE EXTENSION` e o banco do plano gratuito pode não permitir. O
 * `translate` funciona em qualquer instalação de Postgres.
 */
const semAcento = (expressao: string): string =>
  `translate(lower(${expressao}), '${COM_ACENTO}', '${SEM_ACENTO}')`;

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
    // Cada palavra é procurada separada: a TACO escreve "Arroz, integral,
    // cozido", e buscar a frase "arroz integral" inteira não achava nada.
    const palavras = filtros.busca?.trim().split(/[\s,]+/).filter(Boolean) ?? [];
    for (const palavra of palavras.slice(0, 6)) {
      params.push(`%${palavra}%`);
      where.push(`${semAcento('nome')} LIKE ${semAcento(`$${params.length}`)}`);
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

  /** Macros de uma porção não podem pesar mais que a própria porção. */
  private validarMacros(porcaoG: number, carb: number, prot: number, lip: number) {
    if (macrosExcedemPorcao(porcaoG, carb, prot, lip)) {
      throw new BadRequestException(MENSAGEM_MACROS_EXCEDEM);
    }
  }

  async criar(user: JwtPayload, dto: CreateAlimentoDto) {
    this.podeEditar(user);

    this.validarMacros(dto.porcaoG ?? 100, dto.carboidratosG, dto.proteinasG, dto.lipidiosG);

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

  /**
   * Carrega uma tabela inteira (TACO, IBGE ou outra) de uma vez — RF01.
   *
   * Cada linha passa pelas mesmas regras do cadastro manual. Linha com problema
   * é recusada com o motivo, sem derrubar as outras. As válidas entram numa
   * transação, por upsert no par (nome, fonte): importar a mesma planilha de
   * novo atualiza os valores em vez de duplicar, então reenviar um lote que
   * falhou no meio do caminho é seguro.
   */
  async importar(user: JwtPayload, dto: ImportarAlimentosDto) {
    this.podeEditar(user);
    const fonte = dto.fonte.trim();

    const recusados: LinhaRecusada[] = [];
    const validos: CreateAlimentoDto[] = [];
    const nomesVistos = new Set<string>();

    dto.itens.forEach((bruto, indice) => {
      const item = plainToInstance(CreateAlimentoDto, bruto);
      const nome = typeof item.nome === 'string' ? item.nome.trim() : null;
      const erros = validateSync(item, { whitelist: true });

      if (erros.length) {
        recusados.push({ indice, nome, motivo: descreverErros(erros) });
        return;
      }
      // Mesma regra da tela de cadastro: medida caseira sem peso não serve
      // para converter "1 concha" em gramas.
      if (item.medidaCaseira?.trim() && item.medidaCaseiraG === undefined) {
        recusados.push({ indice, nome, motivo: 'Informe os gramas da medida caseira' });
        return;
      }
      if (
        macrosExcedemPorcao(
          item.porcaoG ?? 100,
          item.carboidratosG,
          item.proteinasG,
          item.lipidiosG,
        )
      ) {
        recusados.push({ indice, nome, motivo: MENSAGEM_MACROS_EXCEDEM });
        return;
      }
      // Duas linhas com o mesmo nome no mesmo envio: a segunda sobrescreveria
      // a primeira em silêncio.
      const chave = item.nome.trim().toLowerCase();
      if (nomesVistos.has(chave)) {
        recusados.push({ indice, nome, motivo: 'Alimento repetido na planilha' });
        return;
      }
      nomesVistos.add(chave);
      validos.push(item);
    });

    let inseridos = 0;
    let atualizados = 0;

    if (validos.length) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of validos) {
          // `xmax = 0` só é verdadeiro na linha recém-inserida: é assim que o
          // Postgres diz se o upsert inseriu ou atualizou.
          const { rows } = await client.query<{ inserido: boolean }>(
            `INSERT INTO alimento
               (nome, grupo, medida_caseira, medida_caseira_g, porcao_g,
                kcal, carboidratos_g, proteinas_g, lipidios_g, fibras_g,
                indice_glicemico, fonte, id_autor)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (lower(trim(nome)), fonte) DO UPDATE SET
               grupo = EXCLUDED.grupo,
               medida_caseira = EXCLUDED.medida_caseira,
               medida_caseira_g = EXCLUDED.medida_caseira_g,
               porcao_g = EXCLUDED.porcao_g,
               kcal = EXCLUDED.kcal,
               carboidratos_g = EXCLUDED.carboidratos_g,
               proteinas_g = EXCLUDED.proteinas_g,
               lipidios_g = EXCLUDED.lipidios_g,
               fibras_g = EXCLUDED.fibras_g,
               indice_glicemico = EXCLUDED.indice_glicemico,
               ativo = TRUE
             RETURNING (xmax = 0) AS inserido`,
            [
              item.nome.trim(),
              item.grupo?.trim() || 'outros',
              item.medidaCaseira?.trim() || null,
              item.medidaCaseira?.trim() ? item.medidaCaseiraG : null,
              item.porcaoG ?? 100,
              item.kcal,
              item.carboidratosG,
              item.proteinasG,
              item.lipidiosG,
              item.fibrasG ?? null,
              item.indiceGlicemico ?? null,
              fonte,
              user.sub,
            ],
          );
          if (rows[0]?.inserido) inseridos++;
          else atualizados++;
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    }

    return { fonte, inseridos, atualizados, recusados };
  }

  async atualizar(user: JwtPayload, id: string, dto: UpdateAlimentoDto) {
    this.podeEditar(user);
    const atual = await this.buscar(id);

    this.validarMacros(
      dto.porcaoG ?? atual.porcaoG,
      dto.carboidratosG ?? atual.carboidratosG,
      dto.proteinasG ?? atual.proteinasG,
      dto.lipidiosG ?? atual.lipidiosG,
    );

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
