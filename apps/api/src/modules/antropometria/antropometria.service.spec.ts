import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import { AntropometriaService } from './antropometria.service';
import { CreateAntropometriaDto } from './dto/create-antropometria.dto';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

/**
 * Quem é o paciente do dado já é decidido (e testado) em VinculosService; aqui
 * só interessa que o serviço use o id devolvido.
 */
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

describe('AntropometriaService', () => {
  describe('listar', () => {
    it('should clamp the limit to the accepted range', async () => {
      const { pool, query } = criarPoolMock([[{ genero: 'feminino' }], [], [{ genero: 'feminino' }], []]);
      const service = new AntropometriaService(pool, criarVinculosMock());

      await service.listar(PACIENTE, undefined, 9000);
      await service.listar(PACIENTE, undefined, 0);

      expect(query.mock.calls[1][1]).toEqual(['2', 365]);
      expect(query.mock.calls[3][1]).toEqual(['2', 1]);
    });

    it('should not classify risk when the gender is not a biological reference', async () => {
      const { pool } = criarPoolMock([
        [{ genero: 'outro' }],
        [{ id_antropometria: 1, circ_cintura: '96', circ_quadril: '100', imc: '31.2' }],
      ]);
      const service = new AntropometriaService(pool, criarVinculosMock());

      const { data } = await service.listar(PACIENTE);

      // Sem referência de sexo o risco fica em branco, mas o IMC (que não
      // depende disso) continua classificado.
      expect(data[0].riscoCintura).toBeNull();
      expect(data[0].riscoRcq).toBeNull();
      expect(data[0].rotuloImc).not.toBeNull();
      expect(data[0].rcq).toBe(0.96);
    });
  });

  describe('evolucao', () => {
    it('should return variacaoPeso null with a single weighing', async () => {
      const { pool } = criarPoolMock([[{ data_medicao: '2026-07-01', peso: '80', imc: null, circ_cintura: null }]]);
      const service = new AntropometriaService(pool, criarVinculosMock());

      const evolucao = await service.evolucao(PACIENTE);

      expect(evolucao.peso).toHaveLength(1);
      expect(evolucao.variacaoPeso).toBeNull();
    });

    it('should return the difference between the first and the last weighing', async () => {
      const { pool } = criarPoolMock([
        [
          { data_medicao: '2026-05-01', peso: '84.2', imc: '29.1', circ_cintura: null },
          { data_medicao: '2026-06-01', peso: '82', imc: null, circ_cintura: '92' },
          { data_medicao: '2026-07-01', peso: '80.7', imc: '27.9', circ_cintura: '90' },
        ],
      ]);
      const service = new AntropometriaService(pool, criarVinculosMock());

      const evolucao = await service.evolucao(PACIENTE);

      expect(evolucao.variacaoPeso).toBe(-3.5);
      // A série de IMC pula a medição sem valor, para o gráfico não cair a zero.
      expect(evolucao.imc).toHaveLength(2);
      expect(evolucao.circCintura).toHaveLength(2);
    });
  });

  describe('criar', () => {
    it('should refuse an empty measurement', async () => {
      const { pool, query } = criarPoolMock([]);
      const service = new AntropometriaService(pool, criarVinculosMock());

      await expect(
        service.criar(PACIENTE, { observacao: 'em jejum' } as CreateAntropometriaDto),
      ).rejects.toThrow(BadRequestException);
      expect(query).not.toHaveBeenCalled();
    });

    it('should update the patient record when weight or height is informed', async () => {
      const { pool, query } = criarPoolMock([
        [{ genero: 'masculino' }],
        [{ id_antropometria: 7, peso: '80.7', altura: '1.75', imc: '26.3' }],
        [],
      ]);
      const service = new AntropometriaService(pool, criarVinculosMock());

      await service.criar(PACIENTE, { peso: 80.7 } as CreateAntropometriaDto);

      expect(query).toHaveBeenCalledTimes(3);
      expect(query.mock.calls[2][0]).toContain('UPDATE paciente');
      expect(query.mock.calls[2][1]).toEqual(['2', 80.7, null]);
    });

    it('should not touch the patient record when only circumferences are informed', async () => {
      const { pool, query } = criarPoolMock([
        [{ genero: 'masculino' }],
        [{ id_antropometria: 8, circ_cintura: '92' }],
      ]);
      const service = new AntropometriaService(pool, criarVinculosMock());

      await service.criar(PACIENTE, { circCintura: 92 } as CreateAntropometriaDto);

      expect(query).toHaveBeenCalledTimes(2);
    });
  });

  describe('remover', () => {
    it('should throw NotFoundException when nothing was deleted', async () => {
      const query = jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const service = new AntropometriaService(
        { query } as unknown as Pool,
        criarVinculosMock(),
      );

      await expect(service.remover(PACIENTE, '99')).rejects.toThrow(NotFoundException);
    });
  });
});
