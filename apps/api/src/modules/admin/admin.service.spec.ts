import type { Pool } from 'pg';
import { AdminService } from './admin.service';

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
  return { service: new AdminService(pool), query };
}

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
