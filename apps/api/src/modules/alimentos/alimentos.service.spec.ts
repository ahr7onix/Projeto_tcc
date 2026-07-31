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
      expect(sql).toContain('nome ILIKE $1');
      expect(sql).toContain('grupo = $2');
      expect(params).toEqual(['%arroz%', 'cereais', 100]);
    });

    it('should clamp the limit to the accepted range', async () => {
      const { pool, query } = criarPoolMock([[], []]);
      const service = new AlimentosService(pool);

      await service.listar({ limite: 9000 });
      await service.listar({ limite: 0 });

      expect(query.mock.calls[0][1]).toEqual([500]);
      expect(query.mock.calls[1][1]).toEqual([1]);
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
