import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { avaliarGlicemia } from '../../common/glicemia/glicemia';
import { ContasService } from '../contas/contas.service';
import { CadastrarNutricionistaDto } from './dto/cadastrar-nutricionista.dto';

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 200;

const ROTULOS_DIABETES: Record<string, string> = {
  tipo1: 'Tipo 1',
  tipo2: 'Tipo 2',
  gestacional: 'Gestacional',
  pre: 'Pré-diabetes',
  outro: 'Outro',
  nao_informado: 'Não informado',
};

const ROTULOS_FAIXA: Record<string, string> = {
  ate_17: 'Até 17 anos',
  de_18_a_39: '18 a 39 anos',
  de_40_a_59: '40 a 59 anos',
  de_60_ou_mais: '60 anos ou mais',
  nao_informado: 'Não informado',
};

const ORDEM_CLASSIFICACAO = [
  'hipoglicemia_grave',
  'hipoglicemia',
  'normal',
  'hiperglicemia',
  'hiperglicemia_grave',
] as const;

const ROTULOS_CLASSIFICACAO: Record<string, string> = {
  hipoglicemia_grave: 'Hipoglicemia grave',
  hipoglicemia: 'Hipoglicemia',
  normal: 'Dentro da faixa',
  hiperglicemia: 'Hiperglicemia',
  hiperglicemia_grave: 'Hiperglicemia grave',
};

const SEVERIDADE_CLASSIFICACAO: Record<string, 'critico' | 'atencao' | 'normal'> = {
  hipoglicemia_grave: 'critico',
  hipoglicemia: 'atencao',
  normal: 'normal',
  hiperglicemia: 'atencao',
  hiperglicemia_grave: 'critico',
};

/**
 * Mantem a ordem dos rotulos e nao esconde categoria zerada: "nenhum paciente
 * com diabetes gestacional" e informacao, e uma barra vazia diz isso melhor
 * do que a ausencia da linha.
 */
function ordenar(
  linhas: { chave: string; total: number }[],
  rotulos: Record<string, string>,
) {
  return Object.keys(rotulos).map((chave) => ({
    chave,
    rotulo: rotulos[chave],
    total: Number(linhas.find((l) => l.chave === chave)?.total ?? 0),
  }));
}

@Injectable()
export class AdminService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly contas: ContasService,
  ) {}

  async metricas() {
    const { rows } = await this.pool.query(
      `SELECT
         (SELECT COUNT(*) FROM usuario WHERE tipo = 'paciente')       AS pacientes,
         (SELECT COUNT(*) FROM usuario WHERE tipo = 'nutricionista')  AS nutricionistas,
         (SELECT COUNT(*) FROM usuario WHERE tipo = 'administrador')  AS administradores,
         (SELECT COUNT(*) FROM nutricionista_paciente WHERE ativo)    AS vinculos,
         (SELECT COUNT(*) FROM plano_alimentar)                       AS planos,
         (SELECT COUNT(*) FROM registro_glicemia
           WHERE data_hora > NOW() - INTERVAL '30 days')              AS glicemias30d,
         (SELECT COUNT(*) FROM registro_refeicao
           WHERE data_hora > NOW() - INTERVAL '30 days')              AS refeicoes30d,
         (SELECT COUNT(*) FROM conteudo_educativo WHERE publicado)    AS conteudos,
         (SELECT COUNT(DISTINCT p.id_paciente)
            FROM paciente p
            JOIN registro_glicemia rg ON rg.id_paciente = p.id_paciente
           WHERE rg.data_hora > NOW() - INTERVAL '7 days')            AS pacientes_ativos_7d,
         (SELECT COUNT(*) FROM nutricionista WHERE NOT perfil_completo) AS nutris_sem_crn`,
    );

    const r = rows[0];
    return {
      pacientes: Number(r.pacientes),
      nutricionistas: Number(r.nutricionistas),
      administradores: Number(r.administradores),
      vinculos: Number(r.vinculos),
      planos: Number(r.planos),
      glicemias30d: Number(r.glicemias30d),
      refeicoes30d: Number(r.refeicoes30d),
      conteudos: Number(r.conteudos),
      pacientesAtivos7d: Number(r.pacientes_ativos_7d),
      nutricionistasSemCrn: Number(r.nutris_sem_crn),
    };
  }

  /**
   * Analise do grupo atendido, para a associacao.
   *
   * O `metricas()` acima conta coisas: quantos pacientes, quantos registros.
   * Isto responde outras perguntas: quem a associacao atende, como esta o
   * controle glicemico do grupo e quem parou de registrar. Sao as tres que o
   * briefing pede em "dashboards com analise de dados dos pacientes".
   */
  async analise(dias = 90) {
    const janela = Math.min(Math.max(dias, 7), 365);

    const [perfilRows, faixaRows, glicemiaRows, acompanhamentoRows] = await Promise.all([
      this.pool.query(
        `SELECT COALESCE(tipo_diabetes::text, 'nao_informado') AS chave,
                COUNT(*)::int AS total
           FROM paciente
          GROUP BY chave`,
      ),
      this.pool.query(
        `SELECT CASE
                  WHEN data_nascimento IS NULL THEN 'nao_informado'
                  WHEN EXTRACT(YEAR FROM age(data_nascimento)) < 18 THEN 'ate_17'
                  WHEN EXTRACT(YEAR FROM age(data_nascimento)) < 40 THEN 'de_18_a_39'
                  WHEN EXTRACT(YEAR FROM age(data_nascimento)) < 60 THEN 'de_40_a_59'
                  ELSE 'de_60_ou_mais'
                END AS chave,
                COUNT(*)::int AS total
           FROM paciente
          GROUP BY chave`,
      ),
      // Seis meses de leituras: as do periodo alimentam o quadro atual e todas
      // alimentam a evolucao mes a mes, numa consulta so.
      this.pool.query(
        `SELECT valor,
                momento,
                to_char(data_hora, 'YYYY-MM') AS mes,
                (data_hora >= NOW() - ($1 || ' days')::interval) AS no_periodo
           FROM registro_glicemia
          WHERE data_hora >= date_trunc('month', NOW() - INTERVAL '5 months')
          ORDER BY data_hora`,
        [janela],
      ),
      this.pool.query(
        `SELECT
           (SELECT COUNT(*) FROM paciente)                                AS total,
           (SELECT COUNT(DISTINCT rg.id_paciente) FROM registro_glicemia rg
             WHERE rg.data_hora > NOW() - INTERVAL '7 days')              AS ativos_7d,
           (SELECT COUNT(DISTINCT rg.id_paciente) FROM registro_glicemia rg
             WHERE rg.data_hora > NOW() - INTERVAL '30 days')             AS ativos_30d,
           (SELECT COUNT(*) FROM paciente p
             WHERE NOT EXISTS (
               SELECT 1 FROM nutricionista_paciente np
                WHERE np.id_paciente = p.id_paciente AND np.ativo
             ))                                                           AS sem_nutricionista`,
      ),
    ]);

    // A classificacao de cada leitura sai de common/glicemia, que conhece o
    // alvo de cada momento do dia. Repetir essas faixas em SQL daria duas
    // fontes de verdade para a mesma decisao clinica.
    const porClassificacao = new Map<string, number>();
    const porMes = new Map<string, { total: number; naFaixa: number }>();
    let totalPeriodo = 0;
    let naFaixaPeriodo = 0;

    for (const r of glicemiaRows.rows) {
      const { classificacao } = avaliarGlicemia(Number(r.valor), r.momento);
      const normal = classificacao === 'normal';

      const mes = porMes.get(r.mes) ?? { total: 0, naFaixa: 0 };
      mes.total += 1;
      if (normal) mes.naFaixa += 1;
      porMes.set(r.mes, mes);

      if (r.no_periodo) {
        totalPeriodo += 1;
        if (normal) naFaixaPeriodo += 1;
        porClassificacao.set(classificacao, (porClassificacao.get(classificacao) ?? 0) + 1);
      }
    }

    const percentual = (parte: number, todo: number) =>
      todo ? Math.round((parte / todo) * 100) : null;

    const a = acompanhamentoRows.rows[0];
    const totalPacientes = Number(a.total);
    const ativos30d = Number(a.ativos_30d);

    return {
      periodoDias: janela,
      perfil: {
        totalPacientes,
        porTipoDiabetes: ordenar(perfilRows.rows, ROTULOS_DIABETES),
        porFaixaEtaria: ordenar(faixaRows.rows, ROTULOS_FAIXA),
      },
      controle: {
        totalMedicoes: totalPeriodo,
        percentualNaFaixa: percentual(naFaixaPeriodo, totalPeriodo),
        porClassificacao: ORDEM_CLASSIFICACAO.map((classificacao) => ({
          classificacao,
          rotulo: ROTULOS_CLASSIFICACAO[classificacao],
          severidade: SEVERIDADE_CLASSIFICACAO[classificacao],
          total: porClassificacao.get(classificacao) ?? 0,
        })),
        evolucaoMensal: [...porMes.entries()]
          .sort((esq, dir) => (esq[0] < dir[0] ? -1 : 1))
          .map(([mes, v]) => ({
            mes,
            total: v.total,
            percentualNaFaixa: percentual(v.naFaixa, v.total),
          })),
      },
      acompanhamento: {
        totalPacientes,
        ativos7d: Number(a.ativos_7d),
        ativos30d,
        // Quem a associacao precisa procurar: cadastrado e sem registro no mes.
        semRegistro30d: totalPacientes - ativos30d,
        semNutricionista: Number(a.sem_nutricionista),
      },
    };
  }

  async listarUsuarios(filtros: {
    tipo?: string;
    busca?: string;
    limite?: number;
    /** Só nutricionistas que se cadastraram e esperam a conferência do CRN. */
    pendentes?: boolean;
  } = {}) {
    const params: unknown[] = [];
    const condicoes: string[] = [];

    if (filtros.pendentes) {
      condicoes.push('n.id_nutricionista IS NOT NULL AND n.aprovado_em IS NULL');
      condicoes.push('u.desativado_em IS NULL');
    }
    if (filtros.tipo && ['paciente', 'nutricionista', 'administrador'].includes(filtros.tipo)) {
      params.push(filtros.tipo);
      condicoes.push(`u.tipo = $${params.length}::tipo_usuario`);
    }
    if (filtros.busca) {
      params.push(`%${filtros.busca}%`);
      condicoes.push(`(u.nome ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const limite = Math.min(filtros.limite && filtros.limite > 0 ? filtros.limite : LIMITE_PADRAO, LIMITE_MAXIMO);
    params.push(limite);

    const { rows } = await this.pool.query(
      `SELECT u.id_usuario, u.nome, u.email, u.tipo, u.criado_em,
              n.crn, n.perfil_completo, n.especialidade, n.aprovado_em,
              (SELECT COUNT(*) FROM nutricionista_paciente np
                WHERE np.ativo
                  AND (np.id_nutricionista = n.id_nutricionista
                       OR np.id_paciente = p.id_paciente)) AS vinculos
         FROM usuario u
         LEFT JOIN nutricionista n ON n.id_usuario = u.id_usuario
         LEFT JOIN paciente p      ON p.id_usuario = u.id_usuario
         ${where}
         ORDER BY u.criado_em DESC
         LIMIT $${params.length}`,
      params,
    );

    return {
      data: rows.map((r) => ({
        id: String(r.id_usuario),
        nome: r.nome,
        email: r.email,
        tipo: r.tipo,
        criadoEm: r.criado_em,
        crn: r.crn ?? null,
        especialidade: r.especialidade ?? null,
        perfilCompleto: r.perfil_completo ?? null,
        // Só faz sentido para nutricionista; para os outros perfis fica null.
        aprovado: r.tipo === 'nutricionista' ? r.aprovado_em !== null : null,
        vinculos: Number(r.vinculos ?? 0),
      })),
    };
  }

  /**
   * Libera o painel para um nutricionista que se cadastrou sozinho. O CRN não
   * tem consulta pública automatizada, então a conferência é do administrador,
   * antes de clicar aqui.
   */
  async aprovarNutricionista(idUsuario: string) {
    const { rows } = await this.pool.query(
      `UPDATE nutricionista n
          SET aprovado_em = NOW()
         FROM usuario u
        WHERE n.id_usuario = u.id_usuario
          AND n.id_usuario = $1
          AND n.aprovado_em IS NULL
          AND u.desativado_em IS NULL
        RETURNING n.aprovado_em`,
      [idUsuario],
    );
    if (!rows[0]) {
      throw new NotFoundException('Nenhum nutricionista aguardando aprovação com este id');
    }
    return { aprovado: true, aprovadoEm: rows[0].aprovado_em };
  }

  /**
   * Cadastro do nutricionista pela administração: já nasce aprovado, e a
   * senha fica para o próprio nutricionista criar pelo link do e-mail, como no
   * cadastro de paciente pelo nutricionista.
   */
  async cadastrarNutricionista(idAdmin: string, dto: CadastrarNutricionistaDto) {
    const email = dto.email.trim().toLowerCase();
    const nome = dto.nome.trim().replace(/\s+/g, ' ');
    const crn = dto.crn?.trim() || null;
    const senhaHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);

    const client = await this.pool.connect();
    let idUsuario: string;
    let link: string;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ id_usuario: string }>(
        `INSERT INTO usuario (nome, email, senha, tipo)
         VALUES ($1, $2, $3, 'nutricionista')
         RETURNING id_usuario`,
        [nome, email, senhaHash],
      );
      idUsuario = String(rows[0].id_usuario);
      await client.query(
        `INSERT INTO nutricionista
           (id_usuario, crn, especialidade, perfil_completo, aprovado_em)
         VALUES ($1, $2, $3, $4, NOW())`,
        [idUsuario, crn, dto.especialidade?.trim() || null, crn !== null],
      );
      link = await this.contas.gerarLinkDefinirSenha(client, idUsuario);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      const e = err as { code?: string; constraint?: string };
      if (e?.code === '23505') {
        throw new ConflictException(
          (e.constraint ?? '').includes('crn')
            ? 'Já existe um nutricionista com este CRN'
            : 'Já existe uma conta com este e-mail',
        );
      }
      throw err;
    } finally {
      client.release();
    }

    const { rows: autor } = await this.pool.query('SELECT nome FROM usuario WHERE id_usuario = $1', [
      idAdmin,
    ]);
    const envio = await this.contas.enviarBoasVindas({
      para: email,
      nome,
      link,
      autor: autor[0]?.nome ?? 'A administração',
      perfil: 'nutricionista',
    });

    return { nutricionista: { id: idUsuario, nome, email, crn }, ...envio };
  }

  async removerUsuario(idAdmin: string, idUsuario: string) {
    if (idAdmin === idUsuario) {
      throw new BadRequestException('Você não pode remover a própria conta');
    }

    const { rows } = await this.pool.query(
      `SELECT tipo FROM usuario WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Usuário não encontrado');

    if (rows[0].tipo === 'administrador') {
      const { rows: totalRows } = await this.pool.query(
        `SELECT COUNT(*) AS total FROM usuario WHERE tipo = 'administrador'`,
      );
      if (Number(totalRows[0].total) <= 1) {
        throw new BadRequestException(
          'Não é possível remover o último administrador do sistema',
        );
      }
    }

    await this.pool.query(`DELETE FROM usuario WHERE id_usuario = $1`, [idUsuario]);
    return { removido: true };
  }
}
