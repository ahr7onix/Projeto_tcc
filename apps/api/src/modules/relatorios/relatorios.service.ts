import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { avaliarGlicemia } from '../../common/glicemia/glicemia';
import { VinculosService } from '../vinculos/vinculos.service';

const DIAS_PADRAO = 30;
const DIAS_MAXIMO = 365;

interface GlicemiaRow {
  id_glicemia: string;
  valor: string;
  momento: string;
  observacao: string | null;
  data_hora: Date;
}

interface RefeicaoRow {
  id_registro: string;
  descricao: string;
  tipo_refeicao: string;
  carboidratos: string | null;
  observacao: string | null;
  data_hora: Date;
}

@Injectable()
export class RelatoriosService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  private normalizarDias(dias?: number): number {
    if (!dias || Number.isNaN(dias) || dias <= 0) return DIAS_PADRAO;
    return Math.min(dias, DIAS_MAXIMO);
  }

  private async autorizar(user: JwtPayload, pacienteId?: string): Promise<string> {
    if (user.role === 'paciente') return user.sub;
    if (!pacienteId) throw new NotFoundException('Paciente não informado');

    const vinculado = await this.vinculos.existeVinculo(user.sub, pacienteId);
    if (!vinculado) throw new ForbiddenException('Paciente não vinculado a você');
    return pacienteId;
  }

  async gerar(user: JwtPayload, pacienteId?: string, dias?: number) {
    const alvo = await this.autorizar(user, pacienteId);
    const periodo = this.normalizarDias(dias);

    const { rows: pacienteRows } = await this.pool.query(
      `SELECT u.id_usuario, u.nome, u.email,
              p.peso, p.altura, p.tipo_diabetes, p.data_nascimento,
              p.restricoes_alergias
         FROM usuario u
         JOIN paciente p ON p.id_usuario = u.id_usuario
        WHERE u.id_usuario = $1`,
      [alvo],
    );
    const pac = pacienteRows[0];
    if (!pac) throw new NotFoundException('Paciente não encontrado');

    const { rows: glicemias } = await this.pool.query<GlicemiaRow>(
      `SELECT rg.id_glicemia, rg.valor, rg.momento, rg.observacao, rg.data_hora
         FROM registro_glicemia rg
         JOIN paciente p ON p.id_paciente = rg.id_paciente
        WHERE p.id_usuario = $1
          AND rg.data_hora > NOW() - ($2 || ' days')::INTERVAL
        ORDER BY rg.data_hora`,
      [alvo, periodo],
    );

    const { rows: refeicoes } = await this.pool.query<RefeicaoRow>(
      `SELECT rr.id_registro, rr.descricao, rr.tipo_refeicao,
              rr.carboidratos, rr.observacao, rr.data_hora
         FROM registro_refeicao rr
         JOIN paciente p ON p.id_paciente = rr.id_paciente
        WHERE p.id_usuario = $1
          AND rr.data_hora > NOW() - ($2 || ' days')::INTERVAL
        ORDER BY rr.data_hora`,
      [alvo, periodo],
    );

    const valores = glicemias.map((g) => Number(g.valor));
    const avaliacoes = glicemias.map((g) =>
      avaliarGlicemia(Number(g.valor), g.momento),
    );

    const porMomento = new Map<string, number[]>();
    glicemias.forEach((g) => {
      if (!porMomento.has(g.momento)) porMomento.set(g.momento, []);
      porMomento.get(g.momento)!.push(Number(g.valor));
    });

    const media = (lista: number[]) =>
      lista.length
        ? Number((lista.reduce((a, b) => a + b, 0) / lista.length).toFixed(1))
        : null;

    const desvioPadrao = (() => {
      if (valores.length < 2) return null;
      const m = valores.reduce((a, b) => a + b, 0) / valores.length;
      const variancia =
        valores.reduce((acc, v) => acc + (v - m) ** 2, 0) / (valores.length - 1);
      return Number(Math.sqrt(variancia).toFixed(1));
    })();

    const naFaixa = avaliacoes.filter((a) => a.severidade === 'normal').length;

    return {
      paciente: {
        id: String(pac.id_usuario),
        nome: pac.nome,
        email: pac.email,
        peso: pac.peso ? Number(pac.peso) : null,
        altura: pac.altura ? Number(pac.altura) : null,
        imc:
          pac.peso && pac.altura
            ? Number((Number(pac.peso) / Number(pac.altura) ** 2).toFixed(1))
            : null,
        tipoDiabetes: pac.tipo_diabetes ?? null,
        dataNascimento: pac.data_nascimento ?? null,
        restricoesAlergias: pac.restricoes_alergias ?? null,
      },
      periodo: {
        dias: periodo,
        geradoEm: new Date().toISOString(),
      },
      glicemia: {
        total: glicemias.length,
        media: media(valores),
        minimo: valores.length ? Math.min(...valores) : null,
        maximo: valores.length ? Math.max(...valores) : null,
        desvioPadrao,
        percentualNaFaixa: glicemias.length
          ? Number(((naFaixa / glicemias.length) * 100).toFixed(1))
          : null,
        hipoglicemias: avaliacoes.filter((a) =>
          a.classificacao.startsWith('hipo'),
        ).length,
        hiperglicemias: avaliacoes.filter((a) =>
          a.classificacao.startsWith('hiper'),
        ).length,
        criticos: avaliacoes.filter((a) => a.severidade === 'critico').length,
        porMomento: [...porMomento.entries()].map(([momento, lista]) => ({
          momento,
          total: lista.length,
          media: media(lista),
        })),
        registros: glicemias.map((g, i) => ({
          id: String(g.id_glicemia),
          valor: Number(g.valor),
          momento: g.momento,
          observacao: g.observacao,
          dataHora: g.data_hora,
          classificacao: avaliacoes[i].classificacao,
          severidade: avaliacoes[i].severidade,
        })),
      },
      alimentacao: {
        total: refeicoes.length,
        carboidratosMedia: media(
          refeicoes
            .filter((r) => r.carboidratos != null)
            .map((r) => Number(r.carboidratos)),
        ),
        registros: refeicoes.map((r) => ({
          id: String(r.id_registro),
          descricao: r.descricao,
          tipoRefeicao: r.tipo_refeicao,
          carboidratos: r.carboidratos != null ? Number(r.carboidratos) : null,
          observacao: r.observacao,
          dataHora: r.data_hora,
        })),
      },
    };
  }

  private escaparCsv(valor: unknown): string {
    if (valor === null || valor === undefined) return '';
    let texto = String(valor);
    if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
    if (/[",;\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
    return texto;
  }

  private linhaCsv(colunas: unknown[]): string {
    return colunas.map((c) => this.escaparCsv(c)).join(';');
  }

  async gerarCsv(user: JwtPayload, pacienteId?: string, dias?: number) {
    const relatorio = await this.gerar(user, pacienteId, dias);

    const linhas: string[] = [];
    linhas.push(
      this.linhaCsv([
        'tipo',
        'data_hora',
        'valor',
        'momento',
        'classificacao',
        'descricao',
        'tipo_refeicao',
        'carboidratos_g',
        'observacao',
      ]),
    );

    for (const g of relatorio.glicemia.registros) {
      linhas.push(
        this.linhaCsv([
          'glicemia',
          new Date(g.dataHora).toISOString(),
          g.valor,
          g.momento,
          g.classificacao,
          '',
          '',
          '',
          g.observacao,
        ]),
      );
    }

    for (const r of relatorio.alimentacao.registros) {
      linhas.push(
        this.linhaCsv([
          'refeicao',
          new Date(r.dataHora).toISOString(),
          '',
          '',
          '',
          r.descricao,
          r.tipoRefeicao,
          r.carboidratos,
          r.observacao,
        ]),
      );
    }

    const nomeArquivo = `relatorio_${relatorio.paciente.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .toLowerCase()}_${relatorio.periodo.dias}d.csv`;

    return {
      nomeArquivo,
      conteudo: `\uFEFF${linhas.join('\r\n')}`,
    };
  }
}
