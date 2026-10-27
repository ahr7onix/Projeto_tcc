import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { VinculosService } from './vinculos.service';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

describe('VinculosService', () => {
  describe('existeVinculo', () => {
    it('should return true when an active link exists', async () => {
      const { pool } = criarPoolMock([[{ '?column?': 1 }]]);
      const service = new VinculosService(pool);
      await expect(existe(service)).resolves.toBe(true);
    });

    it('should return false when no active link exists', async () => {
      const { pool } = criarPoolMock([[]]);
      const service = new VinculosService(pool);
      await expect(existe(service)).resolves.toBe(false);
    });
  });

  describe('garantirVinculo', () => {
    it('should throw BadRequestException when the patient is not linked', async () => {
      const { pool } = criarPoolMock([[]]);
      const service = new VinculosService(pool);
      await expect(service.garantirVinculo('1', '2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should resolve silently when the patient is linked', async () => {
      const { pool } = criarPoolMock([[{ '?column?': 1 }]]);
      const service = new VinculosService(pool);
      await expect(service.garantirVinculo('1', '2')).resolves.toBeUndefined();
    });
  });

  describe('resolveNutricionistaId', () => {
    it('should throw NotFoundException when the profile does not exist', async () => {
      const { pool } = criarPoolMock([[]]);
      const service = new VinculosService(pool);
      await expect(service.resolveNutricionistaId('9')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the id as string', async () => {
      const { pool } = criarPoolMock([[{ id_nutricionista: 7 }]]);
      const service = new VinculosService(pool);
      await expect(service.resolveNutricionistaId('9')).resolves.toBe('7');
    });
  });

  describe('convidar', () => {
    it('should throw ConflictException when the patient is already linked', async () => {
      const { pool } = criarPoolMock([
        [{ id_nutricionista: 1 }],
        [{ id_paciente: 2 }],
        [{ '?column?': 1 }],
      ]);
      const service = new VinculosService(pool);
      await expect(service.convidar('1', '2')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when an invite is already pending', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id_nutricionista: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id_paciente: 2 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }));
      const service = new VinculosService({ query } as unknown as Pool);
      await expect(service.convidar('1', '2')).rejects.toThrow(ConflictException);
    });

    it('should create a pending invite and NOT the link', async () => {
      const criadoEm = new Date();
      const { pool, query } = criarPoolMock([
        [{ id_nutricionista: 1 }],
        [{ id_paciente: 2 }],
        [],
        [{ id_convite: 10, criado_em: criadoEm }],
        [{ nome: 'Dra. Ana' }],
        [],
      ]);
      const service = new VinculosService(pool);
      await expect(service.convidar('1', '2')).resolves.toEqual({
        conviteId: '10',
        pacienteId: '2',
        status: 'pendente',
        enviadoEm: criadoEm,
      });
      const sqls = query.mock.calls.map((c) => String(c[0]));
      expect(sqls.some((q) => q.includes('INSERT INTO convite_vinculo'))).toBe(true);
      expect(sqls.some((q) => q.includes('INSERT INTO nutricionista_paciente'))).toBe(false);
    });
  });

  describe('responderConvite', () => {
    function criarComClient(respostas: unknown[][]) {
      const clientQuery = jest.fn();
      respostas.forEach((rows) =>
        clientQuery.mockResolvedValueOnce({ rows, rowCount: rows.length }),
      );
      const release = jest.fn();
      const query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const pool = {
        query,
        connect: jest.fn().mockResolvedValue({ query: clientQuery, release }),
      } as unknown as Pool;
      return { service: new VinculosService(pool), clientQuery };
    }
    const convite = {
      id_convite: 5,
      id_nutricionista: 1,
      id_paciente: 2,
      id_usuario_nutri: 9,
      nome: 'João',
    };

    it('should create the link when the patient accepts', async () => {
      const { service, clientQuery } = criarComClient([[], [convite], [], [], []]);
      await expect(service.responderConvite('3', '5', true)).resolves.toEqual({
        status: 'aceito',
      });
      const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
      expect(sqls.some((q) => q.includes('INSERT INTO nutricionista_paciente'))).toBe(true);
      expect(sqls.at(-1)).toBe('COMMIT');
    });

    it('should not create the link when the patient declines', async () => {
      const { service, clientQuery } = criarComClient([[], [convite], [], []]);
      await expect(service.responderConvite('3', '5', false)).resolves.toEqual({
        status: 'recusado',
      });
      const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
      expect(sqls.some((q) => q.includes('INSERT INTO nutricionista_paciente'))).toBe(false);
    });

    it('should throw NotFoundException for an unknown or already answered invite', async () => {
      const { service } = criarComClient([[], [], []]);
      await expect(service.responderConvite('3', '5', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('desvincular', () => {
    it('should throw NotFoundException when nothing was updated', async () => {
      const query = jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const service = new VinculosService({ query } as unknown as Pool);
      await expect(service.desvincular('1', '2')).rejects.toThrow(NotFoundException);
    });
  });
});

function existe(service: VinculosService) {
  return service.existeVinculo('1', '2');
}
