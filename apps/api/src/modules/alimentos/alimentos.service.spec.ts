import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { AlimentosService } from './alimentos.service';
import { CreateAlimentoDto } from './dto/create-alimento.dto';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

function usuario(role: JwtPayload['role']): JwtPayload {
  return { sub: '1', email: 'teste@nutricare.local', role };
}

/** Linha de alimento como o banco devolve, com os números vindo como texto. */
function linhaAlimento(extra: Record<string, unknown> = {}) {
  return {
    id_alimento: 3,
    nome: 'Arroz branco cozido',
    grupo: 'cereais',
    medida_caseira: '4 colheres de sopa',
    medida_caseira_g: '100',
    porcao_g: '100',
    kcal: '128',
    carboidratos_g: '28',
    proteinas_g: '2.5',
    lipidios_g: '0.2',
    fibras_g: '1.6',
    indice_glicemico: '73',
    fonte: 'exemplo',
    ativo: true,
    criado_em: null,
    atualizado_em: null,
    ...extra,
  };
}

describe('AlimentosService', () => {
  describe('listar', () => {
    it('should filter only active foods by default', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new AlimentosService(pool).listar({});

      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('WHERE ativo = TRUE');
      expect(params).toEqual([100]);
    });

    it('should add the search and group filters', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new AlimentosService(pool).listar({ busca: ' arroz ', grupo: 'cereais' });

      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('grupo = $2');
      expect(params).toEqual(['%arroz%', 'cereais', 100]);
    });

    it('should look for each word on its own, as TACO names have commas', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new AlimentosService(pool).listar({ busca: 'arroz  integral,' });

      // "Arroz, integral, cozido" tem as duas palavras, mas não a frase.
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('AND');
      expect(params).toEqual(['%arroz%', '%integral%', 100]);
    });

    it('should ignore accents on both sides of the search', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new AlimentosService(pool).listar({ busca: 'pao' });

      // Sem isto, buscar "pao" nao acha "Pao frances" nem "Pao de forma".
      const [sql] = query.mock.calls[0];
      expect(sql).toContain('translate(lower(nome)');
      expect(sql).toContain('translate(lower($1)');
      expect(sql).not.toContain('nome ILIKE');
    });

    it('should clamp the limit to the accepted range', async () => {
      const { pool, query } = criarPoolMock([[], []]);
      const service = new AlimentosService(pool);

      await service.listar({ limite: 9000 });
      await service.listar({ limite: 0 });

      expect(query.mock.calls[0][1]).toEqual([500]);
      expect(query.mock.calls[1][1]).toEqual([1]);
    });

    it('should skip the previous pages when a page is requested', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new AlimentosService(pool).listar({ busca: 'arroz', limite: 25, pagina: 3 });

      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('LIMIT $2');
      expect(sql).toContain('OFFSET $3');
      expect(params).toEqual(['%arroz%', 25, 50]);
    });

    it('should not use an offset on the first page', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new AlimentosService(pool).listar({ limite: 25, pagina: 1 });

      const [sql, params] = query.mock.calls[0];
      expect(sql).not.toContain('OFFSET');
      expect(params).toEqual([25]);
    });

    it('should keep a stable order for repeated names', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new AlimentosService(pool).listar({});

      expect(query.mock.calls[0][0]).toContain('ORDER BY nome, id_alimento');
    });

    it('should return how many foods match, not only the ones on the page', async () => {
      const { pool } = criarPoolMock([[linhaAlimento({ total_encontrado: '578' })]]);
      const resposta = await new AlimentosService(pool).listar({ limite: 1 });

      expect(resposta.data).toHaveLength(1);
      expect(resposta.total).toBe(578);
      expect(resposta.data[0]).not.toHaveProperty('total_encontrado');
    });

    it('should return a total of zero when nothing is found', async () => {
      const { pool } = criarPoolMock([[]]);
      const resposta = await new AlimentosService(pool).listar({ busca: 'nada' });

      expect(resposta).toEqual({ data: [], total: 0 });
    });
  });

  describe('buscar', () => {
    it('should throw NotFoundException when the food does not exist', async () => {
      const { pool } = criarPoolMock([[]]);
      await expect(new AlimentosService(pool).buscar('99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should convert the numeric columns to numbers', async () => {
      const { pool } = criarPoolMock([[linhaAlimento()]]);
      const alimento = await new AlimentosService(pool).buscar('3');

      expect(alimento.id).toBe('3');
      expect(alimento.kcal).toBe(128);
      expect(alimento.porcaoG).toBe(100);
    });
  });

  describe('calcularPorcao', () => {
    it('should reject a quantity that is not greater than zero', async () => {
      const { pool, query } = criarPoolMock([[linhaAlimento()]]);
      await expect(new AlimentosService(pool).calcularPorcao('3', 0)).rejects.toThrow(
        BadRequestException,
      );
      // A validação vem antes da consulta: nada foi ao banco.
      expect(query).not.toHaveBeenCalled();
    });

    it('should apply the rule of three over the reference portion', async () => {
      const { pool } = criarPoolMock([[linhaAlimento()]]);
      const calculo = await new AlimentosService(pool).calcularPorcao('3', 150);

      expect(calculo.alimento).toEqual({
        id: '3',
        nome: 'Arroz branco cozido',
        porcaoG: 100,
      });
      expect(calculo.kcal).toBe(192);
      expect(calculo.carboidratosG).toBe(42);
    });
  });

  describe('criar', () => {
    const dto = { nome: 'Arroz branco cozido', kcal: 128 } as CreateAlimentoDto;

    it('should refuse a patient trying to edit the food table', async () => {
      const { pool, query } = criarPoolMock([]);
      await expect(
        new AlimentosService(pool).criar(usuario('paciente'), dto),
      ).rejects.toThrow(ForbiddenException);
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject a duplicated name in the same source', async () => {
      const { pool } = criarPoolMock([[{ '?column?': 1 }]]);
      await expect(
        new AlimentosService(pool).criar(usuario('nutricionista'), dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default the source to manual and insert the food', async () => {
      const { pool, query } = criarPoolMock([[], [linhaAlimento({ fonte: 'manual' })]]);
      const criado = await new AlimentosService(pool).criar(usuario('nutricionista'), dto);

      expect(query.mock.calls[0][1]).toEqual(['Arroz branco cozido', 'manual']);
      expect(criado.nome).toBe('Arroz branco cozido');
    });
  });

  describe('importar', () => {
    /**
     * Pool com transação: cada INSERT responde, na ordem, se inseriu (true) ou
     * atualizou (false) — o que o `xmax = 0` devolve no banco de verdade.
     */
    function criarPoolDeImportacao(inseriu: boolean[], falharNoInsert?: number) {
      const fila = [...inseriu];
      let inserts = 0;
      const clientQuery = jest.fn(async (sql: string, _params?: unknown[]) => {
        if (sql.trim().startsWith('INSERT')) {
          inserts++;
          if (inserts === falharNoInsert) throw new Error('conexão perdida');
          return { rows: [{ inserido: fila.shift() }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });
      const release = jest.fn();
      const connect = jest.fn(async () => ({ query: clientQuery, release }));
      return { pool: { connect, query: jest.fn() } as unknown as Pool, clientQuery, connect, release };
    }

    const item = (nome: string, extra: Record<string, unknown> = {}) => ({
      nome,
      kcal: 128,
      carboidratosG: 28.1,
      proteinasG: 2.5,
      lipidiosG: 0.2,
      ...extra,
    });

    const comandos = (clientQuery: jest.Mock) =>
      clientQuery.mock.calls.map(([sql]) => String(sql).trim().split(/\s+/)[0]);

    it('should refuse a patient trying to import a table', async () => {
      const { pool, connect } = criarPoolDeImportacao([]);
      await expect(
        new AlimentosService(pool).importar(usuario('paciente'), {
          fonte: 'TACO',
          itens: [item('Arroz')],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(connect).not.toHaveBeenCalled();
    });

    it('should refuse an invalid line and still import the others', async () => {
      const { pool, clientQuery } = criarPoolDeImportacao([true, true]);
      const resultado = await new AlimentosService(pool).importar(usuario('nutricionista'), {
        fonte: 'TACO',
        itens: [item('Arroz'), item('Feijão', { carboidratosG: 'muito' }), item('Banana')],
      });

      expect(resultado.inseridos).toBe(2);
      expect(resultado.recusados).toEqual([
        { indice: 1, nome: 'Feijão', motivo: 'Valor ausente ou inválido em: carboidratos' },
      ]);
      expect(comandos(clientQuery)).toEqual(['BEGIN', 'INSERT', 'INSERT', 'COMMIT']);
    });

    it('should count a food that already existed in the source as updated', async () => {
      const { pool } = criarPoolDeImportacao([false, true]);
      const resultado = await new AlimentosService(pool).importar(usuario('administrador'), {
        fonte: 'TACO',
        itens: [item('Arroz'), item('Banana')],
      });

      expect(resultado).toMatchObject({ inseridos: 1, atualizados: 1, recusados: [] });
    });

    it('should upsert by name and source, using the source of the request', async () => {
      const { pool, clientQuery } = criarPoolDeImportacao([true]);
      await new AlimentosService(pool).importar(usuario('nutricionista'), {
        fonte: '  TACO 4ª edição ',
        itens: [item('Arroz', { fonte: 'outra' })],
      });

      const [sql, params = []] = clientQuery.mock.calls[1];
      expect(sql).toContain('ON CONFLICT (lower(trim(nome)), fonte) DO UPDATE');
      // A fonte da linha é ignorada: a planilha inteira vem de uma fonte só.
      expect(params[11]).toBe('TACO 4ª edição');
      expect(params[1]).toBe('outros');
    });

    it('should refuse a name repeated in the same sheet', async () => {
      const { pool } = criarPoolDeImportacao([true]);
      const resultado = await new AlimentosService(pool).importar(usuario('nutricionista'), {
        fonte: 'TACO',
        itens: [item('Arroz branco'), item(' arroz BRANCO ')],
      });

      expect(resultado.inseridos).toBe(1);
      expect(resultado.recusados).toEqual([
        { indice: 1, nome: 'arroz BRANCO', motivo: 'Alimento repetido na planilha' },
      ]);
    });

    it('should refuse a line whose macros weigh more than the portion', async () => {
      // Mesma regra do cadastro manual: a importação não pode ser um atalho
      // para gravar o que o formulário recusa.
      const { pool } = criarPoolDeImportacao([true]);
      const resultado = await new AlimentosService(pool).importar(usuario('nutricionista'), {
        fonte: 'TACO',
        itens: [item('Arroz'), item('Erro de digitação', { carboidratosG: 98, proteinasG: 5 })],
      });

      expect(resultado.inseridos).toBe(1);
      expect(resultado.recusados).toEqual([
        {
          indice: 1,
          nome: 'Erro de digitação',
          motivo: 'Carboidratos, proteínas e lipídios somam mais que o peso da porção',
        },
      ]);
    });

    it('should refuse a household measure without its weight in grams', async () => {
      const { pool, connect } = criarPoolDeImportacao([]);
      const resultado = await new AlimentosService(pool).importar(usuario('nutricionista'), {
        fonte: 'TACO',
        itens: [item('Feijão', { medidaCaseira: '1 concha' })],
      });

      expect(resultado.recusados[0].motivo).toBe('Informe os gramas da medida caseira');
      // Nenhuma linha válida: nem abre transação.
      expect(connect).not.toHaveBeenCalled();
    });

    it('should roll everything back when the database fails in the middle', async () => {
      const { pool, clientQuery, release } = criarPoolDeImportacao([true, true], 2);
      await expect(
        new AlimentosService(pool).importar(usuario('nutricionista'), {
          fonte: 'TACO',
          itens: [item('Arroz'), item('Banana')],
        }),
      ).rejects.toThrow('conexão perdida');

      expect(comandos(clientQuery)).toEqual(['BEGIN', 'INSERT', 'INSERT', 'ROLLBACK']);
      expect(release).toHaveBeenCalled();
    });
  });

  describe('desativar', () => {
    it('should mark the food as inactive instead of deleting it', async () => {
      const { pool, query } = criarPoolMock([[linhaAlimento()], []]);
      const resposta = await new AlimentosService(pool).desativar(
        usuario('administrador'),
        '3',
      );

      expect(query.mock.calls[1][0]).toContain('SET ativo = FALSE');
      expect(query.mock.calls[1][0]).not.toContain('DELETE');
      expect(resposta).toEqual({ mensagem: 'Alimento desativado' });
    });
  });
});
