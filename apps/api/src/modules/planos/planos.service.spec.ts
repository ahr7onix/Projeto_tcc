import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { VinculosService } from '../vinculos/vinculos.service';
import { PlanosService } from './planos.service';
import type { CreatePlanoDto } from './dto/create-plano.dto';
import type { UpdatePlanoDto } from './dto/update-plano.dto';

/**
 * O serviço usa dois caminhos até o banco: `pool.query` para leitura e um
 * cliente dedicado (`pool.connect`) para a transação de gravação. O mock
 * separa os dois para as asserções conseguirem olhar cada um.
 */
function criarPoolMock(respostas: unknown[][], respostasCliente: unknown[][] = []) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));

  const clientQuery = jest.fn();
  respostasCliente.forEach((rows) =>
    clientQuery.mockResolvedValueOnce({ rows, rowCount: rows.length }),
  );
  const release = jest.fn();
  const client = { query: clientQuery, release } as unknown as PoolClient;
  const connect = jest.fn().mockResolvedValue(client);

  return {
    pool: { query, connect } as unknown as Pool,
    query,
    clientQuery,
    release,
    connect,
  };
}

function usuario(role: JwtPayload['role'], sub = '1'): JwtPayload {
  return { sub, email: 'teste@nutricare.local', role };
}

function linhaPlano(extra: Record<string, unknown> = {}) {
  return {
    id_plano: '42',
    id_paciente: '5',
    id_nutricionista: '7',
    data_inicio: '2026-01-01',
    data_fim: null,
    vet_kcal: '2000',
    formula_vet: 'mifflin_st_jeor',
    fator_atividade: '1.55',
    perc_carboidratos: '50',
    perc_proteinas: '20',
    perc_lipidios: '30',
    observacoes: null,
    criado_em: new Date('2026-01-01T12:00:00Z'),
    paciente_usuario_id: '2',
    paciente_nome: 'Ana',
    nutricionista_nome: 'Bruno',
    nutricionista_usuario_id: '1',
    ...extra,
  };
}

function linhaRefeicao(extra: Record<string, unknown> = {}) {
  return {
    id_refeicao: '90',
    id_plano: '42',
    nome_refeicao: 'Café da manhã',
    horario: '07:00:00',
    itens: '150 g de Arroz branco cozido',
    ...extra,
  };
}

/** Item ligado à tabela de alimentos: entra no cálculo. */
function itemComAlimento(extra: Record<string, unknown> = {}) {
  return {
    id_item: '500',
    id_refeicao: '90',
    id_alimento: '3',
    descricao: null,
    quantidade_g: '150',
    alimento_nome: 'Arroz branco cozido',
    porcao_g: '100',
    kcal: '128',
    carboidratos_g: '28',
    proteinas_g: '2.5',
    lipidios_g: '0.2',
    fibras_g: '1.6',
    ...extra,
  };
}

/** Item de texto livre: sem alimento na tabela, não há o que calcular. */
function itemTextoLivre(extra: Record<string, unknown> = {}) {
  return {
    id_item: '501',
    id_refeicao: '90',
    id_alimento: null,
    descricao: 'Chá sem açúcar',
    quantidade_g: '200',
    alimento_nome: null,
    porcao_g: null,
    kcal: null,
    carboidratos_g: null,
    proteinas_g: null,
    lipidios_g: null,
    fibras_g: null,
    ...extra,
  };
}

function criarServico(respostas: unknown[][] = [], respostasCliente: unknown[][] = []) {
  const mock = criarPoolMock(respostas, respostasCliente);
  const garantirVinculo = jest.fn().mockResolvedValue(undefined);
  const existeVinculo = jest.fn().mockResolvedValue(true);
  const vinculos = { garantirVinculo, existeVinculo } as unknown as VinculosService;
  return { service: new PlanosService(mock.pool, vinculos), ...mock, garantirVinculo };
}

function dtoBase(extra: Partial<CreatePlanoDto> = {}): CreatePlanoDto {
  return {
    pacienteId: '2',
    dataInicio: '2026-01-01',
    refeicoes: [{ nome: ' Café da manhã ', horario: '07:00', itens: ' Pão e queijo ' }],
    ...extra,
  } as CreatePlanoDto;
}

describe('PlanosService', () => {
  describe('validações antes de gravar', () => {
    it('should refuse an end date before the start date', async () => {
      const { service, garantirVinculo, connect } = criarServico();
      await expect(
        service.create('1', dtoBase({ dataFim: '2025-12-01' })),
      ).rejects.toThrow('A data final não pode ser anterior à data inicial');
      // A validação acontece antes de encostar no banco.
      expect(garantirVinculo).not.toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
    });

    it('should refuse macros informed only in part', async () => {
      const { service } = criarServico();
      await expect(
        service.create('1', dtoBase({ percCarboidratos: 50 })),
      ).rejects.toThrow(
        'Informe os três percentuais (carboidratos, proteínas e lipídios) ou nenhum',
      );
    });

    it('should refuse macros that do not add up to 100', async () => {
      const { service } = criarServico();
      await expect(
        service.create(
          '1',
          dtoBase({ percCarboidratos: 50, percProteinas: 20, percLipidios: 29 }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept macros that round to 100', async () => {
      // 33,3 + 33,3 + 33,4 fecha 100 na prática; recusar seria falso negativo.
      const { service } = criarServico(
        [[{ id_nutricionista: '7' }], [{ id_paciente: '5' }], [linhaPlano()], []],
        [[], [{ id_plano: '42' }], [{ id_refeicao: '90' }], []],
      );
      await expect(
        service.create(
          '1',
          dtoBase({ percCarboidratos: 33.3, percProteinas: 33.3, percLipidios: 33.4 }),
        ),
      ).resolves.toMatchObject({ id: '42' });
    });
  });

  describe('create', () => {
    it('should save the meal inside a transaction and trim the text fields', async () => {
      const { service, clientQuery, release } = criarServico(
        [[{ id_nutricionista: '7' }], [{ id_paciente: '5' }], [linhaPlano()], []],
        [[], [{ id_plano: '42' }], [{ id_refeicao: '90' }], []],
      );
      await service.create('1', dtoBase());

      expect(clientQuery.mock.calls[0][0]).toBe('BEGIN');
      expect(clientQuery.mock.calls[2][1]).toEqual([
        '42',
        'Café da manhã',
        '07:00',
        'Pão e queijo',
      ]);
      expect(clientQuery.mock.calls[3][0]).toBe('COMMIT');
      expect(release).toHaveBeenCalled();
    });

    it('should describe the meal from the food list when there is no free text', async () => {
      const { service, clientQuery } = criarServico(
        [[{ id_nutricionista: '7' }], [{ id_paciente: '5' }], [linhaPlano()], []],
        [
          [],
          [{ id_plano: '42' }],
          [{ id_alimento: '3', nome: 'Arroz branco cozido' }],
          [{ id_refeicao: '90' }],
          [],
          [],
        ],
      );
      await service.create(
        '1',
        dtoBase({
          refeicoes: [
            {
              nome: 'Almoço',
              horario: '12:00',
              alimentos: [{ alimentoId: '3', quantidadeG: 150 }],
            },
          ],
        } as Partial<CreatePlanoDto>),
      );

      const [, params] = clientQuery.mock.calls[3];
      expect(params[3]).toBe('150 g de Arroz branco cozido');
    });

    it('should refuse a food that is not in the table and roll the transaction back', async () => {
      const { service, clientQuery, release } = criarServico(
        [[{ id_nutricionista: '7' }], [{ id_paciente: '5' }]],
        [[], [{ id_plano: '42' }], []],
      );
      await expect(
        service.create(
          '1',
          dtoBase({
            refeicoes: [
              {
                nome: 'Almoço',
                horario: '12:00',
                alimentos: [{ alimentoId: '999', quantidadeG: 150 }],
              },
            ],
          } as Partial<CreatePlanoDto>),
        ),
      ).rejects.toThrow('Alimento não encontrado na tabela: 999');

      expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
      expect(release).toHaveBeenCalled();
    });

    it('should refuse an item with neither food nor description', async () => {
      const { service } = criarServico(
        [[{ id_nutricionista: '7' }], [{ id_paciente: '5' }]],
        [[], [{ id_plano: '42' }]],
      );
      await expect(
        service.create(
          '1',
          dtoBase({
            refeicoes: [
              { nome: 'Lanche', horario: '15:00', alimentos: [{ quantidadeG: 100 }] },
            ],
          } as Partial<CreatePlanoDto>),
        ),
      ).rejects.toThrow(
        'Item da refeição "Lanche" precisa de um alimento da tabela ou de uma descrição',
      );
    });
  });

  describe('autorização por plano', () => {
    it('should throw NotFoundException for a plan that does not exist', async () => {
      const { service } = criarServico([[]]);
      await expect(service.findOne('42', usuario('nutricionista'))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should refuse a patient reading the plan of another patient', async () => {
      const { service } = criarServico([[linhaPlano({ paciente_usuario_id: '9' })]]);
      await expect(service.findOne('42', usuario('paciente', '2'))).rejects.toThrow(
        'Acesso negado a este plano',
      );
    });

    it('should refuse a nutritionist reading a plan of a colleague', async () => {
      const { service } = criarServico([
        [linhaPlano({ nutricionista_usuario_id: '99' })],
      ]);
      await expect(service.findOne('42', usuario('nutricionista'))).rejects.toThrow(
        'Este plano pertence a outro nutricionista',
      );
    });

    it('should delete only after checking the authorisation', async () => {
      const { service, query } = criarServico([[linhaPlano()], []]);
      await expect(service.remove('42', usuario('nutricionista'))).resolves.toEqual({
        deleted: true,
      });
      expect(query.mock.calls[1][0]).toContain('DELETE FROM plano_alimentar');
      expect(query.mock.calls[1][1]).toEqual(['42']);
    });
  });

  describe('montagem do plano', () => {
    it('should total only the items that come from the food table', async () => {
      const { service } = criarServico([
        [linhaPlano()],
        [linhaRefeicao()],
        [itemComAlimento(), itemTextoLivre()],
      ]);
      const plano = await service.findOne('42', usuario('nutricionista'));

      // 150 g de um alimento cuja porção de referência é 100 g: regra de três.
      expect(plano.refeicoes[0].alimentos[0].valores).toEqual({
        quantidadeG: 150,
        kcal: 192,
        carboidratosG: 42,
        proteinasG: 3.8,
        lipidiosG: 0.3,
        fibrasG: 2.4,
      });
      expect(plano.totais).toEqual({
        kcal: 192,
        carboidratosG: 42,
        proteinasG: 3.8,
        lipidiosG: 0.3,
        fibrasG: 2.4,
        // O chá é texto livre: fica de fora da soma, mas é contado.
        itensSemAnalise: 1,
      });
    });

    it('should show the time without the seconds', async () => {
      const { service } = criarServico([[linhaPlano()], [linhaRefeicao()], []]);
      const plano = await service.findOne('42', usuario('nutricionista'));

      expect(plano.refeicoes[0].horario).toBe('07:00');
    });

    it('should mark an open plan as active and a finished one as inactive', async () => {
      const aberto = criarServico([[linhaPlano()], []]);
      await expect(
        aberto.service.findOne('42', usuario('nutricionista')),
      ).resolves.toMatchObject({ ativo: true, dataFim: null });

      const encerrado = criarServico([[linhaPlano({ data_fim: '2026-01-31' })], []]);
      await expect(
        encerrado.service.findOne('42', usuario('nutricionista')),
      ).resolves.toMatchObject({ ativo: false, dataFim: '2026-01-31' });
    });

    it('should not query the items when the plan has no meals', async () => {
      const { service, query } = criarServico([[linhaPlano()], []]);
      const plano = await service.findOne('42', usuario('nutricionista'));

      expect(plano.refeicoes).toEqual([]);
      expect(query).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('should filter by the patient when a patient asks', async () => {
      const { service, query } = criarServico([[]]);
      await service.findAll(usuario('paciente', '2'));

      expect(query.mock.calls[0][0]).toContain('up.id_usuario = $1');
      expect(query.mock.calls[0][1]).toEqual(['2']);
    });

    it('should filter by the nutritionist and, optionally, by one patient', async () => {
      const { service, query } = criarServico([[]]);
      await service.findAll(usuario('nutricionista'), '2');

      expect(query.mock.calls[0][0]).toContain('un.id_usuario = $1');
      expect(query.mock.calls[0][0]).toContain('up.id_usuario = $2');
      expect(query.mock.calls[0][1]).toEqual(['1', '2']);
    });

    it('should return an empty list without loading meals', async () => {
      const { service, query } = criarServico([[]]);
      await expect(service.findAll(usuario('paciente', '2'))).resolves.toEqual({
        data: [],
      });
      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAtivo', () => {
    it('should require the pacienteId from the nutritionist', async () => {
      const { service } = criarServico();
      await expect(service.findAtivo(usuario('nutricionista'))).rejects.toThrow(
        'Informe o pacienteId',
      );
    });

    it('should return null when the patient has no plan in force', async () => {
      const { service } = criarServico([[]]);
      await expect(service.findAtivo(usuario('paciente', '2'))).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('should keep the current values of the fields that were not sent', async () => {
      const { service, clientQuery } = criarServico(
        [[linhaPlano()], [linhaPlano()], []],
        [[], [], []],
      );
      await service.update('42', usuario('nutricionista'), {
        observacoes: '  Revisar em 30 dias  ',
      } as UpdatePlanoDto);

      const [, params] = clientQuery.mock.calls[1];
      expect(params).toEqual([
        '2026-01-01',
        null,
        2000,
        'mifflin_st_jeor',
        1.55,
        50,
        20,
        30,
        'Revisar em 30 dias',
        '42',
      ]);
    });

    it('should validate the macros of the merged plan, not only of the payload', async () => {
      // Só o percentual de carboidratos muda, mas a soma final é que precisa fechar.
      const { service, connect } = criarServico([[linhaPlano()]]);
      await expect(
        service.update('42', usuario('nutricionista'), {
          percCarboidratos: 60,
        } as UpdatePlanoDto),
      ).rejects.toThrow('devem somar 100 (recebido 110)');
      expect(connect).not.toHaveBeenCalled();
    });

    it('should replace the meals when the payload sends them', async () => {
      const { service, clientQuery } = criarServico(
        [[linhaPlano()], [linhaPlano()], []],
        [[], [], [], [{ id_refeicao: '91' }], []],
      );
      await service.update('42', usuario('nutricionista'), {
        refeicoes: [{ nome: 'Jantar', horario: '19:00', itens: 'Sopa' }],
      } as UpdatePlanoDto);

      expect(clientQuery.mock.calls[2][0]).toContain('DELETE FROM refeicao');
      expect(clientQuery.mock.calls[3][1]).toEqual(['42', 'Jantar', '19:00', 'Sopa']);
    });
  });
});
