import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import { LembretesService } from './lembretes.service';
import { CreateLembreteDto } from './dto/create-lembrete.dto';

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

function linhaLembrete(extra: Record<string, unknown> = {}) {
  return {
    id_lembrete: 6,
    tipo_lembrete: 'medicamento',
    titulo: 'Metformina',
    descricao: null,
    recorrente: true,
    hora: '08:00:00',
    data_hora: null,
    dias_semana: [1, 3, 5],
    ativo: true,
    concluido: false,
    id_uso: null,
    criado_em: null,
    ...extra,
  };
}

describe('LembretesService', () => {
  describe('listar', () => {
    it('should describe the recurring days in words', async () => {
      const { pool } = criarPoolMock([[linhaLembrete()]]);
      const service = new LembretesService(pool, criarVinculosMock());

      const { data } = await service.listar(PACIENTE, {});

      expect(data[0].hora).toBe('08:00');
      expect(data[0].quando).toBe('segunda, quarta, sexta às 08:00');
    });

    it('should describe a one-off reminder without seconds', async () => {
      const { pool } = criarPoolMock([
        [
          linhaLembrete({
            recorrente: false,
            hora: null,
            dias_semana: null,
            data_hora: '2026-08-21T11:00:00.000Z',
          }),
        ],
      ]);
      const service = new LembretesService(pool, criarVinculosMock());

      const { data } = await service.listar(PACIENTE, {});

      // Segundo nenhum: o paciente marca a hora, nao o instante.
      expect(data[0].quando).toMatch(/^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}$/);
    });

    it('should treat an empty day list as every day', async () => {
      const { pool } = criarPoolMock([[linhaLembrete({ dias_semana: [] })]]);
      const service = new LembretesService(pool, criarVinculosMock());

      const { data } = await service.listar(PACIENTE, {});

      expect(data[0].quando).toBe('Todos os dias às 08:00');
    });

    it('should filter the inactive ones only when asked', async () => {
      const { pool, query } = criarPoolMock([[], []]);
      const service = new LembretesService(pool, criarVinculosMock());

      await service.listar(PACIENTE, {});
      await service.listar(PACIENTE, { apenasAtivos: true });

      expect(query.mock.calls[0][0]).not.toContain('AND ativo = TRUE');
      expect(query.mock.calls[1][0]).toContain('AND ativo = TRUE');
    });
  });

  describe('criar', () => {
    it('should require the time for a recurring reminder', async () => {
      const { pool } = criarPoolMock([]);
      const service = new LembretesService(pool, criarVinculosMock());

      await expect(
        service.criar(PACIENTE, {
          tipo: 'medicamento',
          titulo: 'Metformina',
          recorrente: true,
        } as CreateLembreteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require the date for a one-off reminder', async () => {
      const { pool } = criarPoolMock([]);
      const service = new LembretesService(pool, criarVinculosMock());

      await expect(
        service.criar(PACIENTE, {
          tipo: 'consulta',
          titulo: 'Retorno',
        } as CreateLembreteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a medicine that is not from this patient', async () => {
      const { pool } = criarPoolMock([[]]);
      const service = new LembretesService(pool, criarVinculosMock());

      await expect(
        service.criar(PACIENTE, {
          tipo: 'medicamento',
          titulo: 'Metformina',
          recorrente: true,
          hora: '08:00',
          medicamentoId: '77',
        } as CreateLembreteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear the date of a recurring reminder', async () => {
      const { pool, query } = criarPoolMock([[linhaLembrete()]]);
      const service = new LembretesService(pool, criarVinculosMock());

      await service.criar(PACIENTE, {
        tipo: 'medicamento',
        titulo: ' Metformina ',
        recorrente: true,
        hora: '08:00',
        dataHora: '2026-08-01T08:00:00Z',
        diasSemana: [1, 3, 5],
      } as CreateLembreteDto);

      const params = query.mock.calls[0][1] as unknown[];
      expect(params[2]).toBe('Metformina');
      expect(params[5]).toBe('08:00');
      // Recorrente guarda hora e ignora a data avulsa que veio junto.
      expect(params[6]).toBeNull();
      expect(params[7]).toEqual([1, 3, 5]);
    });
  });

  describe('concluir', () => {
    it('should refuse to conclude a recurring reminder', async () => {
      const { pool } = criarPoolMock([[linhaLembrete()]]);
      const service = new LembretesService(pool, criarVinculosMock());

      await expect(service.concluir(PACIENTE, '6')).rejects.toThrow(BadRequestException);
    });

    it('should conclude a one-off reminder', async () => {
      const avulso = linhaLembrete({
        recorrente: false,
        hora: null,
        dias_semana: null,
        data_hora: '2026-08-01T11:00:00.000Z',
      });
      const { pool } = criarPoolMock([[avulso], [{ ...avulso, concluido: true }]]);
      const service = new LembretesService(pool, criarVinculosMock());

      const lembrete = await service.concluir(PACIENTE, '6');

      expect(lembrete.concluido).toBe(true);
    });

    it('should throw NotFoundException when the reminder is from another patient', async () => {
      const { pool } = criarPoolMock([[]]);
      const service = new LembretesService(pool, criarVinculosMock());

      await expect(service.concluir(PACIENTE, '99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remover', () => {
    it('should throw NotFoundException when nothing was deleted', async () => {
      const query = jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const service = new LembretesService(
        { query } as unknown as Pool,
        criarVinculosMock(),
      );

      await expect(service.remover(PACIENTE, '99')).rejects.toThrow(NotFoundException);
    });
  });
});
