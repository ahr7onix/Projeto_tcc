import { NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import { EmocionalService } from './emocional.service';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

function criarVinculosMock(idPaciente = '2') {
  const resolverPacienteAlvo = jest
    .fn()
    .mockResolvedValue({ idUsuarioPaciente: '1', idPaciente });
  return { resolverPacienteAlvo } as unknown as VinculosService;
}

const PACIENTE: JwtPayload = {
  sub: '1',
  email: 'paciente@nutricare.local',
  role: 'paciente',
};

describe('EmocionalService', () => {
  describe('resumo', () => {
    it('should return an empty summary when there is no register', async () => {
      const { pool } = criarPoolMock([[], []]);
      const resumo = await new EmocionalService(pool, criarVinculosMock()).resumo(PACIENTE);

      expect(resumo.total).toBe(0);
      expect(resumo.mediaEscala).toBeNull();
      // Os cinco estados aparecem zerados: a tela desenha a mesma régua sempre.
      expect(resumo.porEstado).toHaveLength(5);
      expect(resumo.porEstado.every((e) => e.total === 0)).toBe(true);
    });

    it('should average the registers on the 1-5 scale', async () => {
      const { pool } = criarPoolMock([
        [
          { estado: 'muito_bem', total: 2 },
          { estado: 'bem', total: 3 },
          { estado: 'mal', total: 1 },
        ],
        [],
      ]);
      const resumo = await new EmocionalService(pool, criarVinculosMock()).resumo(PACIENTE);

      expect(resumo.total).toBe(6);
      // (5*2 + 4*3 + 2*1) / 6 = 4
      expect(resumo.mediaEscala).toBe(4);
      expect(resumo.porEstado[0]).toEqual({
        estado: 'muito_bem',
        rotulo: 'Muito bem',
        total: 2,
      });
    });

    it('should rank the most cited factors ignoring case and spaces', async () => {
      const { pool } = criarPoolMock([
        [{ estado: 'mal', total: 3 }],
        [
          { fatores: 'Sono, Trabalho' },
          { fatores: 'sono , família' },
          { fatores: 'SONO' },
        ],
      ]);
      const resumo = await new EmocionalService(pool, criarVinculosMock()).resumo(PACIENTE);

      expect(resumo.fatoresFrequentes[0]).toEqual({ fator: 'sono', vezes: 3 });
      expect(resumo.fatoresFrequentes).toHaveLength(3);
    });

    it('should clamp the window to the accepted range', async () => {
      const { pool, query } = criarPoolMock([[], [], [], []]);
      const service = new EmocionalService(pool, criarVinculosMock());

      const largo = await service.resumo(PACIENTE, undefined, 9000);
      const curto = await service.resumo(PACIENTE, undefined, 0);

      expect(largo.periodoDias).toBe(365);
      expect(curto.periodoDias).toBe(1);
      expect(query.mock.calls[0][1]).toEqual(['2', 365]);
    });
  });

  describe('listar', () => {
    it('should only filter by date when the period is informed', async () => {
      const { pool, query } = criarPoolMock([[], []]);
      const service = new EmocionalService(pool, criarVinculosMock());

      await service.listar(PACIENTE, {});
      await service.listar(PACIENTE, { dias: 7, limite: 900 });

      expect(query.mock.calls[0][0]).not.toContain('data_hora >=');
      expect(query.mock.calls[0][1]).toEqual(['2', 60]);
      expect(query.mock.calls[1][0]).toContain('data_hora >=');
      expect(query.mock.calls[1][1]).toEqual(['2', 7, 500]);
    });
  });

  describe('remover', () => {
    it('should throw NotFoundException when nothing was deleted', async () => {
      const query = jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const service = new EmocionalService(
        { query } as unknown as Pool,
        criarVinculosMock(),
      );

      await expect(service.remover(PACIENTE, '99')).rejects.toThrow(NotFoundException);
    });
  });
});
