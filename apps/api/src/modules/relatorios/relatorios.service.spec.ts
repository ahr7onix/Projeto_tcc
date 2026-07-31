import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { VinculosService } from '../vinculos/vinculos.service';
import { RelatoriosService } from './relatorios.service';

/** Marca de ordem de bytes que o Excel usa para reconhecer o arquivo como UTF-8. */
const BOM = '﻿';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

function usuario(role: JwtPayload['role'], sub = '1'): JwtPayload {
  return { sub, email: 'teste@nutricare.local', role };
}

function linhaPaciente(extra: Record<string, unknown> = {}) {
  return {
    id_usuario: '2',
    nome: 'Ana Créia',
    email: 'ana@nutricare.local',
    peso: '80.0',
    altura: '1.70',
    tipo_diabetes: 'tipo_1',
    data_nascimento: '1998-03-10',
    restricoes_alergias: null,
    ...extra,
  };
}

function glicemia(valor: string, momento: string, extra: Record<string, unknown> = {}) {
  return {
    id_glicemia: '1',
    valor,
    momento,
    observacao: null,
    data_hora: new Date('2026-07-30T09:00:00Z'),
    ...extra,
  };
}

function refeicao(extra: Record<string, unknown> = {}) {
  return {
    id_registro: '1',
    descricao: 'Arroz e feijão',
    tipo_refeicao: 'almoco',
    carboidratos: '45',
    observacao: null,
    data_hora: new Date('2026-07-30T12:00:00Z'),
    ...extra,
  };
}

function criarServico(respostas: unknown[][], vinculado = true) {
  const { pool, query } = criarPoolMock(respostas);
  const existeVinculo = jest.fn().mockResolvedValue(vinculado);
  const vinculos = { existeVinculo } as unknown as VinculosService;
  return { service: new RelatoriosService(pool, vinculos), query, existeVinculo };
}

describe('RelatoriosService', () => {
  describe('autorização', () => {
    it('should ignore the pacienteId sent by a patient and use their own id', async () => {
      // Sem isso, um paciente pediria o relatório de outro só trocando a query string.
      const { service, query, existeVinculo } = criarServico([
        [linhaPaciente()],
        [],
        [],
      ]);
      await service.gerar(usuario('paciente', '2'), '999');

      expect(existeVinculo).not.toHaveBeenCalled();
      expect(query.mock.calls[0][1]).toEqual(['2']);
    });

    it('should require a pacienteId from the nutritionist', async () => {
      const { service } = criarServico([]);
      await expect(service.gerar(usuario('nutricionista'))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should refuse a patient that is not linked to the nutritionist', async () => {
      const { service, query } = criarServico([], false);
      await expect(service.gerar(usuario('nutricionista'), '2')).rejects.toThrow(
        ForbiddenException,
      );
      expect(query).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the patient does not exist', async () => {
      const { service } = criarServico([[]]);
      await expect(service.gerar(usuario('paciente', '2'))).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('período', () => {
    it('should use 30 days by default and clamp to 365', async () => {
      const padrao = criarServico([[linhaPaciente()], [], []]);
      const semDias = await padrao.service.gerar(usuario('paciente', '2'));
      expect(semDias.periodo.dias).toBe(30);
      expect(padrao.query.mock.calls[1][1]).toEqual(['2', 30]);

      const exagerado = criarServico([[linhaPaciente()], [], []]);
      const comMuitosDias = await exagerado.service.gerar(
        usuario('paciente', '2'),
        undefined,
        5000,
      );
      expect(comMuitosDias.periodo.dias).toBe(365);
    });

    it('should fall back to 30 days for zero, negative or invalid values', async () => {
      for (const dias of [0, -7, Number.NaN]) {
        const { service } = criarServico([[linhaPaciente()], [], []]);
        const relatorio = await service.gerar(usuario('paciente', '2'), undefined, dias);
        expect(relatorio.periodo.dias).toBe(30);
      }
    });
  });

  describe('estatísticas de glicemia', () => {
    const amostra = [
      glicemia('100', 'jejum', { id_glicemia: '1' }),
      glicemia('120', 'jejum', { id_glicemia: '2' }),
      glicemia('60', 'jejum', { id_glicemia: '3' }),
      glicemia('300', 'jejum', { id_glicemia: '4' }),
      glicemia('160', 'pos_prandial', { id_glicemia: '5' }),
    ];

    it('should summarise the readings of the period', async () => {
      const { service } = criarServico([[linhaPaciente()], amostra, []]);
      const { glicemia: resumo } = await service.gerar(usuario('paciente', '2'));

      expect(resumo.total).toBe(5);
      expect(resumo.media).toBe(148);
      expect(resumo.minimo).toBe(60);
      expect(resumo.maximo).toBe(300);
      // Desvio padrão amostral (n-1), como se usa em série de medições.
      expect(resumo.desvioPadrao).toBe(92.3);
      expect(resumo.percentualNaFaixa).toBe(60);
    });

    it('should count severe hyperglycemia as both hyper and critical', async () => {
      const { service } = criarServico([[linhaPaciente()], amostra, []]);
      const { glicemia: resumo } = await service.gerar(usuario('paciente', '2'));

      expect(resumo.hipoglicemias).toBe(1);
      expect(resumo.hiperglicemias).toBe(1);
      expect(resumo.criticos).toBe(1);
    });

    it('should group the averages by moment of the day', async () => {
      const { service } = criarServico([[linhaPaciente()], amostra, []]);
      const { glicemia: resumo } = await service.gerar(usuario('paciente', '2'));

      expect(resumo.porMomento).toEqual([
        { momento: 'jejum', total: 4, media: 145 },
        { momento: 'pos_prandial', total: 1, media: 160 },
      ]);
    });

    it('should not report a standard deviation with fewer than two readings', async () => {
      const { service } = criarServico([[linhaPaciente()], [glicemia('110', 'jejum')], []]);
      const { glicemia: resumo } = await service.gerar(usuario('paciente', '2'));

      expect(resumo.media).toBe(110);
      expect(resumo.desvioPadrao).toBeNull();
      expect(resumo.percentualNaFaixa).toBe(100);
    });

    it('should return null statistics for an empty period', async () => {
      const { service } = criarServico([[linhaPaciente()], [], []]);
      const { glicemia: resumo } = await service.gerar(usuario('paciente', '2'));

      expect(resumo).toMatchObject({
        total: 0,
        media: null,
        minimo: null,
        maximo: null,
        desvioPadrao: null,
        percentualNaFaixa: null,
        porMomento: [],
      });
    });

    it('should use the range of each moment to classify', async () => {
      // 78 mg/dL é normal em jejum (70–130) e baixo antes de dormir (90–150).
      const { service } = criarServico([
        [linhaPaciente()],
        [
          glicemia('78', 'jejum', { id_glicemia: '1' }),
          glicemia('78', 'antes_dormir', { id_glicemia: '2' }),
        ],
        [],
      ]);
      const { glicemia: resumo } = await service.gerar(usuario('paciente', '2'));

      expect(resumo.registros.map((r) => r.classificacao)).toEqual([
        'normal',
        'hipoglicemia',
      ]);
    });
  });

  describe('dados do paciente e alimentação', () => {
    it('should calculate the BMI from weight and height', async () => {
      const { service } = criarServico([[linhaPaciente()], [], []]);
      const relatorio = await service.gerar(usuario('paciente', '2'));

      expect(relatorio.paciente.imc).toBe(27.7);
    });

    it('should leave the BMI null when weight or height is missing', async () => {
      const { service } = criarServico([[linhaPaciente({ altura: null })], [], []]);
      const relatorio = await service.gerar(usuario('paciente', '2'));

      expect(relatorio.paciente.imc).toBeNull();
      expect(relatorio.paciente.altura).toBeNull();
    });

    it('should average only the meals that have carbohydrates informed', async () => {
      const { service } = criarServico([
        [linhaPaciente()],
        [],
        [
          refeicao({ id_registro: '1', carboidratos: '45' }),
          refeicao({ id_registro: '2', carboidratos: null }),
          refeicao({ id_registro: '3', carboidratos: '60' }),
        ],
      ]);
      const relatorio = await service.gerar(usuario('paciente', '2'));

      expect(relatorio.alimentacao.total).toBe(3);
      expect(relatorio.alimentacao.carboidratosMedia).toBe(52.5);
    });
  });

  describe('gerarCsv', () => {
    function servicoComCsv() {
      return criarServico([
        [linhaPaciente()],
        [glicemia('300', 'jejum', { observacao: '=SOMA(A1:A9)' })],
        [refeicao({ descricao: 'Arroz; feijão', observacao: 'com "molho"' })],
      ]);
    }

    it('should neutralise formulas so the spreadsheet does not execute them', async () => {
      // Sem a aspa simples, o Excel executaria o conteúdo digitado pelo paciente.
      const { service } = servicoComCsv();
      const { conteudo } = await service.gerarCsv(usuario('paciente', '2'));

      expect(conteudo).toContain("'=SOMA(A1:A9)");
      expect(conteudo).not.toContain(';=SOMA');
    });

    it('should quote the fields that contain the separator or quotes', async () => {
      const { service } = servicoComCsv();
      const { conteudo } = await service.gerarCsv(usuario('paciente', '2'));

      expect(conteudo).toContain('"Arroz; feijão"');
      expect(conteudo).toContain('"com ""molho"""');
    });

    it('should start with the BOM and separate the lines with CRLF', async () => {
      // O BOM é o que faz o Excel em português abrir os acentos corretamente.
      const { service } = servicoComCsv();
      const { conteudo } = await service.gerarCsv(usuario('paciente', '2'));
      const linhas = conteudo.split('\r\n');

      expect(conteudo.startsWith(BOM)).toBe(true);
      expect(linhas).toHaveLength(3);
      expect(linhas[0]).toBe(
        `${BOM}tipo;data_hora;valor;momento;classificacao;descricao;tipo_refeicao;carboidratos_g;observacao`,
      );
      expect(linhas[1]).toContain('glicemia;2026-07-30T09:00:00.000Z;300;jejum');
      expect(linhas[2]).toContain('refeicao;2026-07-30T12:00:00.000Z');
    });

    it('should build a file name without accents or spaces', async () => {
      const { service } = servicoComCsv();
      const { nomeArquivo } = await service.gerarCsv(usuario('paciente', '2'));

      expect(nomeArquivo).toBe('relatorio_ana_creia_30d.csv');
    });
  });
});
