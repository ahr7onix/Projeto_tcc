import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { VinculosService } from '../vinculos/vinculos.service';
import { MedicamentosService } from './medicamentos.service';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

const vinculosMock = {
  resolverPacienteAlvo: jest.fn().mockResolvedValue({ idPaciente: '5' }),
} as unknown as VinculosService;

const nutricionista: JwtPayload = {
  sub: '20',
  email: 'nutri@teste.local',
  role: 'nutricionista',
};

/** Registro como o banco devolve, antes do mapeamento. */
const gravado = {
  id_uso: 1,
  nome_medicamento: 'Insulina NPH',
  dosagem: '10 UI',
  frequencia: '1x ao dia',
  horario_inicial: '08:00:00',
  ativo: true,
  observacoes: 'tomar com a refeição',
  criado_em: '2026-01-01',
};

/** A observação vai na oitava posição da lista de parâmetros do UPDATE. */
function observacaoGravada(query: jest.Mock): unknown {
  const params = query.mock.calls[1][1] as unknown[];
  return params[7];
}

describe('MedicamentosService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('atualizar', () => {
    it('should clear the note when it comes as null', async () => {
      const { pool, query } = criarPoolMock([[gravado], [{ ...gravado, observacoes: null }]]);
      const service = new MedicamentosService(pool, vinculosMock);

      // `@IsOptional` deixa `null` chegar ao serviço; antes isto chamava
      // `null.trim()` e a requisição terminava em 500.
      await expect(
        service.atualizar(nutricionista, '1', { observacoes: null }, '5'),
      ).resolves.toMatchObject({ observacoes: null });

      expect(observacaoGravada(query)).toBeNull();
    });

    it('should clear the note when it comes as an empty string', async () => {
      const { pool, query } = criarPoolMock([[gravado], [{ ...gravado, observacoes: null }]]);
      const service = new MedicamentosService(pool, vinculosMock);

      await service.atualizar(nutricionista, '1', { observacoes: '   ' }, '5');

      expect(observacaoGravada(query)).toBeNull();
    });

    it('should keep the stored note when the field is absent', async () => {
      const { pool, query } = criarPoolMock([[gravado], [gravado]]);
      const service = new MedicamentosService(pool, vinculosMock);

      await service.atualizar(nutricionista, '1', { dosagem: '12 UI' }, '5');

      expect(observacaoGravada(query)).toBe('tomar com a refeição');
    });

    it('should trim the note before saving it', async () => {
      const { pool, query } = criarPoolMock([[gravado], [gravado]]);
      const service = new MedicamentosService(pool, vinculosMock);

      await service.atualizar(nutricionista, '1', { observacoes: '  jejum  ' }, '5');

      expect(observacaoGravada(query)).toBe('jejum');
    });
  });
});
