import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { ReceitasService } from './receitas.service';
import { CreateReceitaDto } from './dto/create-receita.dto';
import { UpdateReceitaDto } from './dto/update-receita.dto';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

function usuario(role: JwtPayload['role'], sub = '1'): JwtPayload {
  return { sub, email: 'teste@nutricare.local', role };
}

function linhaReceita(extra: Record<string, unknown> = {}) {
  return {
    id_receita: 4,
    id_autor: 1,
    titulo: 'Panqueca de aveia',
    resumo: null,
    ingredientes: 'aveia, ovo, banana',
    modo_preparo: 'Misture e leve à frigideira.',
    porcoes: 2,
    tempo_preparo_min: 15,
    kcal_porcao: '210',
    carboidratos_porcao: '28',
    proteinas_porcao: '9',
    lipidios_porcao: '6',
    categoria: 'lanche',
    publicado: true,
    autor_nome: 'Nutri Teste',
    criado_em: null,
    atualizado_em: null,
    ...extra,
  };
}

describe('ReceitasService', () => {
  describe('listar', () => {
    it('should show only published recipes to the patient', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new ReceitasService(pool).listar(usuario('paciente'), {});

      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('r.publicado = TRUE');
      expect(params).toEqual([50]);
    });

    it('should show the published ones plus the own drafts to the nutritionist', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new ReceitasService(pool).listar(usuario('nutricionista', '9'), {});

      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('(r.publicado = TRUE OR r.id_autor = $1)');
      expect(params).toEqual(['9', 50]);
    });

    it('should not restrict anything for the administrator', async () => {
      const { pool, query } = criarPoolMock([[]]);
      await new ReceitasService(pool).listar(usuario('administrador'), {});

      expect(query.mock.calls[0][0]).not.toContain('WHERE');
    });

    it('should clamp the limit to the accepted range', async () => {
      const { pool, query } = criarPoolMock([[], []]);
      const service = new ReceitasService(pool);

      await service.listar(usuario('administrador'), { limite: 9000 });
      await service.listar(usuario('administrador'), { limite: 0 });

      expect(query.mock.calls[0][1]).toEqual([200]);
      expect(query.mock.calls[1][1]).toEqual([1]);
    });
  });

  describe('buscar', () => {
    it('should throw NotFoundException when the recipe does not exist', async () => {
      const { pool } = criarPoolMock([[]]);
      await expect(
        new ReceitasService(pool).buscar(usuario('paciente'), '99'),
      ).rejects.toThrow(NotFoundException);
    });

    it("should hide someone else's draft behind a not found", async () => {
      const { pool } = criarPoolMock([
        [linhaReceita({ publicado: false, id_autor: 5 })],
      ]);
      // Responder "proibido" confirmaria que a receita existe.
      await expect(
        new ReceitasService(pool).buscar(usuario('nutricionista', '9'), '4'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return the own draft to its author', async () => {
      const { pool } = criarPoolMock([
        [linhaReceita({ publicado: false, id_autor: 9 })],
      ]);
      const receita = await new ReceitasService(pool).buscar(
        usuario('nutricionista', '9'),
        '4',
      );

      expect(receita.titulo).toBe('Panqueca de aveia');
      expect(receita.kcalPorcao).toBe(210);
    });

    it('should return any draft to the administrator', async () => {
      const { pool } = criarPoolMock([
        [linhaReceita({ publicado: false, id_autor: 5 })],
      ]);
      await expect(
        new ReceitasService(pool).buscar(usuario('administrador'), '4'),
      ).resolves.toMatchObject({ id: '4' });
    });
  });

  describe('criar', () => {
    const dto = {
      titulo: 'Panqueca de aveia',
      ingredientes: 'aveia, ovo, banana',
      modoPreparo: 'Misture e leve à frigideira.',
    } as CreateReceitaDto;

    it('should refuse a patient publishing recipes', async () => {
      const { pool, query } = criarPoolMock([]);
      await expect(
        new ReceitasService(pool).criar(usuario('paciente'), dto),
      ).rejects.toThrow(ForbiddenException);
      expect(query).not.toHaveBeenCalled();
    });

    it('should default the category to geral and start unpublished', async () => {
      const { pool, query } = criarPoolMock([[linhaReceita()]]);
      await new ReceitasService(pool).criar(usuario('nutricionista', '9'), dto);

      const params = query.mock.calls[0][1] as unknown[];
      expect(params[11]).toBe('geral');
      expect(params[12]).toBe(false);
    });
  });

  describe('atualizar', () => {
    it("should refuse the nutritionist editing another author's recipe", async () => {
      const { pool } = criarPoolMock([[linhaReceita({ id_autor: 5 })]]);
      await expect(
        new ReceitasService(pool).atualizar(
          usuario('nutricionista', '9'),
          '4',
          {} as UpdateReceitaDto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should keep the current values for the fields that were not sent', async () => {
      const { pool, query } = criarPoolMock([
        [linhaReceita({ id_autor: 9 })],
        [linhaReceita({ id_autor: 9, titulo: 'Panqueca integral' })],
      ]);
      await new ReceitasService(pool).atualizar(usuario('nutricionista', '9'), '4', {
        titulo: 'Panqueca integral',
      } as UpdateReceitaDto);

      const params = query.mock.calls[1][1] as unknown[];
      expect(params[1]).toBe('Panqueca integral');
      expect(params[3]).toBe('aveia, ovo, banana');
      expect(params[11]).toBe('lanche');
    });
  });

  describe('remover', () => {
    it('should throw NotFoundException when the recipe does not exist', async () => {
      const { pool } = criarPoolMock([[]]);
      await expect(
        new ReceitasService(pool).remover(usuario('administrador'), '99'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
