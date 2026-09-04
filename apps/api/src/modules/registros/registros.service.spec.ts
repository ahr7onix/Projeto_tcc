import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { AlimentosService } from '../alimentos/alimentos.service';
import type { PushService } from '../push/push.service';
import type { VinculosService } from '../vinculos/vinculos.service';
import { RegistrosService } from './registros.service';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

/** Alimento como o AlimentosService devolve, já mapeado e com números. */
function alimento(extra: Record<string, unknown> = {}) {
  return {
    id: '3',
    nome: 'Pão de forma integral',
    porcaoG: 100,
    kcal: 253,
    carboidratosG: 43.3,
    proteinasG: 9.4,
    lipidiosG: 3.5,
    fibrasG: 6.9,
    ...extra,
  };
}

function servico(
  respostas: unknown[][],
  alimentos: Partial<AlimentosService> = {},
) {
  const { pool, query } = criarPoolMock(respostas);
  const service = new RegistrosService(
    pool,
    {} as PushService,
    {} as VinculosService,
    alimentos as AlimentosService,
  );
  return { service, query };
}

/** Linha de registro_refeicao como o INSERT devolve, com números em texto. */
function linhaRegistro(extra: Record<string, unknown> = {}) {
  return {
    id_registro: 10,
    descricao: 'Pão de forma integral (50 g)',
    tipo_refeicao: 'cafe',
    carboidratos: '21.7',
    proteinas: '4.7',
    lipidios: '1.8',
    kcal: '126.5',
    id_alimento: 3,
    quantidade_g: '50',
    observacao: null,
    data_hora: '2026-09-04T10:00:00.000Z',
    ...extra,
  };
}

describe('RegistrosService.createRefeicao', () => {
  it('calcula os macronutrientes a partir do alimento e da quantidade', async () => {
    const buscar = jest.fn().mockResolvedValue(alimento());
    const { service, query } = servico(
      [[{ id_paciente: '1' }], [linhaRegistro()]],
      { buscar },
    );

    await service.createRefeicao('7', {
      tipo_refeicao: 'cafe',
      alimentoId: '3',
      quantidadeG: 50,
    });

    expect(buscar).toHaveBeenCalledWith('3');
    const [, parametros] = query.mock.calls[1];
    // Metade da porção de 100 g: metade de cada valor da tabela.
    expect(parametros).toEqual([
      '1',
      'Pão de forma integral (50 g)',
      'cafe',
      21.7,
      4.7,
      1.8,
      126.5,
      '3',
      50,
      null,
    ]);
  });

  it('ignora os carboidratos digitados quando há alimento escolhido', async () => {
    const { service, query } = servico(
      [[{ id_paciente: '1' }], [linhaRegistro()]],
      { buscar: jest.fn().mockResolvedValue(alimento()) },
    );

    await service.createRefeicao('7', {
      tipo_refeicao: 'cafe',
      alimentoId: '3',
      quantidadeG: 50,
      carboidratos: 999,
    });

    const [, parametros] = query.mock.calls[1];
    expect(parametros[3]).toBe(21.7);
  });

  it('mantém o texto livre com os carboidratos informados pelo paciente', async () => {
    const { service, query } = servico([
      [{ id_paciente: '1' }],
      [
        linhaRegistro({
          descricao: 'Arroz, feijão e frango',
          carboidratos: '52',
          proteinas: null,
          lipidios: null,
          kcal: null,
          id_alimento: null,
          quantidade_g: null,
        }),
      ],
    ]);

    const registro = await service.createRefeicao('7', {
      descricao: 'Arroz, feijão e frango',
      tipo_refeicao: 'almoco',
      carboidratos: 52,
    });

    const [, parametros] = query.mock.calls[1];
    expect(parametros[3]).toBe(52);
    expect(parametros[7]).toBeNull();
    expect(registro.alimentoId).toBeNull();
    expect(registro.carboidratos).toBe(52);
  });

  it('recusa alimento sem quantidade', async () => {
    const { service } = servico([[{ id_paciente: '1' }]], {
      buscar: jest.fn(),
    });

    await expect(
      service.createRefeicao('7', { tipo_refeicao: 'cafe', alimentoId: '3' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa registro sem descrição e sem alimento', async () => {
    const { service } = servico([[{ id_paciente: '1' }]]);

    await expect(
      service.createRefeicao('7', { tipo_refeicao: 'cafe' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa registro de quem não tem perfil de paciente', async () => {
    const { service } = servico([[]]);

    await expect(
      service.createRefeicao('7', { descricao: 'Pão', tipo_refeicao: 'cafe' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
