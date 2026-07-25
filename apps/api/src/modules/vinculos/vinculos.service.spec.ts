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

  describe('vincular', () => {
    it('should throw ConflictException when the link already exists', async () => {
      const { pool } = criarPoolMock([
        [{ id_nutricionista: 1 }],
        [{ id_paciente: 2 }],
        [{ id_vinculo: 5 }],
      ]);
      const service = new VinculosService(pool);
      await expect(service.vincular('1', '2')).rejects.toThrow(ConflictException);
    });

    it('should create the link when none exists', async () => {
      const criadoEm = new Date();
      const { pool } = criarPoolMock([
        [{ id_nutricionista: 1 }],
        [{ id_paciente: 2 }],
        [],
        [{ id_vinculo: 10, criado_em: criadoEm }],
      ]);
      const service = new VinculosService(pool);
      await expect(service.vincular('1', '2')).resolves.toEqual({
        vinculoId: '10',
        pacienteId: '2',
        vinculadoEm: criadoEm,
      });
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
