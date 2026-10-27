import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ContasService } from '../contas/contas.service';
import { AdminService } from './admin.service';

const semContas = {} as ContasService;

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

/** A ordem das respostas é a do Promise.all dentro de `analise`. */
function servico(opcoes: {
  perfil?: unknown[];
  faixa?: unknown[];
  glicemias?: unknown[];
  acompanhamento?: Record<string, unknown>;
}) {
  const { pool, query } = criarPoolMock([
    opcoes.perfil ?? [],
    opcoes.faixa ?? [],
    opcoes.glicemias ?? [],
    [
      {
        total: '3',
        ativos_7d: '2',
        ativos_30d: '2',
        sem_nutricionista: '1',
        ...opcoes.acompanhamento,
      },
    ],
  ]);
  return { service: new AdminService(pool, semContas), query };
}

describe('AdminService.aprovarNutricionista', () => {
  it('aprova só quem está aguardando, com conta ativa', async () => {
    const aprovadoEm = new Date();
    const { pool, query } = criarPoolMock([[{ aprovado_em: aprovadoEm }]]);

    await expect(new AdminService(pool, semContas).aprovarNutricionista('9')).resolves.toEqual({
      aprovado: true,
      aprovadoEm,
    });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('n.aprovado_em IS NULL');
    expect(sql).toContain('u.desativado_em IS NULL');
    expect(params).toEqual(['9']);
  });

  it('responde 404 para quem já foi aprovado ou não é nutricionista', async () => {
    const { pool } = criarPoolMock([[]]);
    await expect(new AdminService(pool, semContas).aprovarNutricionista('9')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('AdminService.cadastrarNutricionista', () => {
  function montar(falha?: { code: string; constraint: string }) {
    const clientQuery = jest.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes('INTO usuario')) {
        if (falha) throw Object.assign(new Error('duplicado'), falha);
        return { rows: [{ id_usuario: 50 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const pool = {
      query: jest.fn(async () => ({ rows: [{ nome: 'Administração ADJ' }], rowCount: 1 })),
      connect: jest.fn(async () => ({ query: clientQuery, release: jest.fn() })),
    } as unknown as Pool;
    const contas = {
      gerarLinkDefinirSenha: jest.fn(async () => 'http://painel/redefinir-senha?token=x&boasvindas=1'),
      enviarBoasVindas: jest.fn(async () => ({ emailEnviado: true })),
    };
    return {
      service: new AdminService(pool, contas as unknown as ContasService),
      clientQuery,
      contas,
    };
  }

  it('cria a conta já aprovada e manda o link só para o e-mail do nutricionista', async () => {
    const { service, clientQuery, contas } = montar();

    const resposta = await service.cadastrarNutricionista('1', {
      nome: ' Ana  Lima ',
      email: 'ANA@nutri.com',
      crn: ' CRN-3/999 ',
    });

    const insertNutri = clientQuery.mock.calls.find(([sql]) => sql.includes('INTO nutricionista'));
    expect(insertNutri?.[0]).toContain('NOW()');
    expect(insertNutri?.[1]).toEqual(['50', 'CRN-3/999', null, true]);
    expect(contas.enviarBoasVindas).toHaveBeenCalledWith(
      expect.objectContaining({ para: 'ana@nutri.com', perfil: 'nutricionista', autor: 'Administração ADJ' }),
    );
    expect(resposta).toEqual({
      nutricionista: { id: '50', nome: 'Ana Lima', email: 'ana@nutri.com', crn: 'CRN-3/999' },
      emailEnviado: true,
    });
  });

  it('diz qual dado repetiu: o CRN ou o e-mail', async () => {
    await expect(
      montar({ code: '23505', constraint: 'nutricionista_crn_key' }).service.cadastrarNutricionista('1', {
        nome: 'Ana',
        email: 'ana@nutri.com',
      }),
    ).rejects.toThrow('Já existe um nutricionista com este CRN');
    await expect(
      montar({ code: '23505', constraint: 'usuario_email_key' }).service.cadastrarNutricionista('1', {
        nome: 'Ana',
        email: 'ana@nutri.com',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('AdminService.analise', () => {
  it('classifica cada leitura pelo alvo do seu momento do dia', async () => {
    const { service } = servico({
      glicemias: [
        // 150 em jejum está dentro (alvo 70–180)...
        { valor: '150', momento: 'jejum', mes: '2026-09', no_periodo: true },
        // ...e 150 antes de dormir está acima (alvo 90–150 é o teto).
        { valor: '160', momento: 'antes_dormir', mes: '2026-09', no_periodo: true },
        { valor: '40', momento: 'jejum', mes: '2026-09', no_periodo: true },
      ],
    });

    const { controle } = await service.analise();

    const porNome = Object.fromEntries(
      controle.porClassificacao.map((c) => [c.classificacao, c.total]),
    );
    expect(porNome.normal).toBe(1);
    expect(porNome.hiperglicemia).toBe(1);
    expect(porNome.hipoglicemia_grave).toBe(1);
    expect(controle.percentualNaFaixa).toBe(33);
  });

  it('agrupa a evolução por mês, em ordem cronológica', async () => {
    const { service } = servico({
      glicemias: [
        { valor: '300', momento: 'jejum', mes: '2026-07', no_periodo: false },
        { valor: '100', momento: 'jejum', mes: '2026-08', no_periodo: true },
        { valor: '100', momento: 'jejum', mes: '2026-08', no_periodo: true },
        { valor: '300', momento: 'jejum', mes: '2026-08', no_periodo: true },
      ],
    });

    const { controle } = await service.analise();

    expect(controle.evolucaoMensal).toEqual([
      { mes: '2026-07', total: 1, percentualNaFaixa: 0 },
      { mes: '2026-08', total: 3, percentualNaFaixa: 67 },
    ]);
    // O quadro atual olha só o período; a evolução olha os seis meses.
    expect(controle.totalMedicoes).toBe(3);
  });

  it('mantém as categorias sem nenhum caso, na ordem dos rótulos', async () => {
    const { service } = servico({ perfil: [{ chave: 'tipo2', total: 2 }] });

    const { perfil } = await service.analise();

    expect(perfil.porTipoDiabetes.map((c) => c.chave)).toEqual([
      'tipo1',
      'tipo2',
      'gestacional',
      'pre',
      'outro',
      'nao_informado',
    ]);
    // Zero é informação: "nenhum caso gestacional" precisa aparecer.
    expect(perfil.porTipoDiabetes.find((c) => c.chave === 'gestacional')?.total).toBe(0);
    expect(perfil.porTipoDiabetes.find((c) => c.chave === 'tipo2')?.total).toBe(2);
  });

  it('conta como sem registro quem nao mediu no mes', async () => {
    const { service } = servico({
      acompanhamento: { total: '10', ativos_7d: '3', ativos_30d: '6' },
    });

    const { acompanhamento } = await service.analise();

    expect(acompanhamento.semRegistro30d).toBe(4);
  });

  it('nao inventa percentual quando nao houve medicao', async () => {
    const { service } = servico({ glicemias: [] });

    const { controle } = await service.analise();

    expect(controle.totalMedicoes).toBe(0);
    expect(controle.percentualNaFaixa).toBeNull();
  });

  it('limita a janela pedida a um intervalo aceitavel', async () => {
    const { service, query } = servico({});

    await service.analise(9000);

    // A janela vai como parametro da consulta de glicemia (a terceira).
    expect(query.mock.calls[2][1]).toEqual([365]);
  });
});
