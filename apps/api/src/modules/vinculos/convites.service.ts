import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PushService } from '../push/push.service';
import { VinculosService } from './vinculos.service';

/**
 * Consentimento no vínculo (LGPD, art. 11 — dado de saúde é sensível).
 *
 * O nutricionista convida; o paciente aceita ou recusa pelo aplicativo; e só o
 * aceite cria a linha em nutricionista_paciente, que é o que todo o resto do
 * sistema confere antes de mostrar um dado de saúde. O paciente também pode
 * encerrar o acompanhamento quando quiser.
 */
@Injectable()
export class ConvitesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
    private readonly push: PushService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  /**
   * Avisa no aplicativo (push) e guarda o aviso na central de notificações.
   * Falhar em avisar não desfaz o que já foi gravado.
   */
  private avisar(idUsuario: string, titulo: string, mensagem: string) {
    this.notificacoes
      .registrar({ idUsuario, tipo: 'sistema', titulo, mensagem })
      .catch(() => undefined);
    this.push
      .enviarPara(idUsuario, { titulo, corpo: mensagem, dados: { tipo: 'convite_vinculo' } })
      .catch(() => undefined);
  }

  async convidar(idUsuarioNutri: string, email: string) {
    const idNutricionista = await this.vinculos.resolveNutricionistaId(idUsuarioNutri);

    const { rows: pacientes } = await this.pool.query(
      `SELECT p.id_paciente, u.id_usuario, u.nome, u.email
         FROM usuario u
         JOIN paciente p ON p.id_usuario = u.id_usuario
        WHERE u.email = $1
          AND u.desativado_em IS NULL`,
      [email.trim().toLowerCase()],
    );
    const paciente = pacientes[0];
    if (!paciente) {
      throw new NotFoundException(
        'Nenhum paciente com este e-mail. Confira o endereço ou cadastre o paciente.',
      );
    }

    const idUsuarioPaciente = String(paciente.id_usuario);
    if (await this.vinculos.existeVinculo(idUsuarioNutri, idUsuarioPaciente)) {
      throw new ConflictException('Este paciente já está vinculado a você');
    }

    let criado: { id_solicitacao: string; criado_em: Date };
    try {
      ({
        rows: [criado],
      } = await this.pool.query(
        `INSERT INTO solicitacao_vinculo (id_nutricionista, id_paciente)
         VALUES ($1, $2)
         RETURNING id_solicitacao, criado_em`,
        [idNutricionista, paciente.id_paciente],
      ));
    } catch (err) {
      // Índice único parcial: um convite pendente por par.
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictException('Este paciente já tem um convite seu aguardando resposta');
      }
      throw err;
    }

    const { rows: autor } = await this.pool.query(
      'SELECT nome FROM usuario WHERE id_usuario = $1',
      [idUsuarioNutri],
    );
    this.avisar(
      idUsuarioPaciente,
      'Convite de acompanhamento',
      `${autor[0]?.nome ?? 'Um nutricionista'} quer acompanhar sua saúde pelo NutriCare. ` +
        'Abra o aplicativo para aceitar ou recusar.',
    );

    return {
      id: String(criado.id_solicitacao),
      paciente: { id: idUsuarioPaciente, nome: paciente.nome, email: paciente.email },
      criadoEm: criado.criado_em,
    };
  }

  /** Nutricionista vê os convites que mandou; paciente, os que recebeu. */
  async listarPendentes(user: JwtPayload) {
    if (user.role === 'nutricionista') {
      const { rows } = await this.pool.query(
        `SELECT s.id_solicitacao, s.criado_em, u.id_usuario, u.nome, u.email
           FROM solicitacao_vinculo s
           JOIN nutricionista n ON n.id_nutricionista = s.id_nutricionista
           JOIN paciente p      ON p.id_paciente = s.id_paciente
           JOIN usuario u       ON u.id_usuario = p.id_usuario
          WHERE n.id_usuario = $1
            AND s.status = 'pendente'
            AND u.desativado_em IS NULL
          ORDER BY s.criado_em DESC`,
        [user.sub],
      );
      return {
        data: rows.map((r) => ({
          id: String(r.id_solicitacao),
          paciente: { id: String(r.id_usuario), nome: r.nome, email: r.email },
          criadoEm: r.criado_em,
        })),
      };
    }

    const { rows } = await this.pool.query(
      `SELECT s.id_solicitacao, s.criado_em, u.id_usuario, u.nome, n.crn, n.especialidade
         FROM solicitacao_vinculo s
         JOIN paciente p      ON p.id_paciente = s.id_paciente
         JOIN nutricionista n ON n.id_nutricionista = s.id_nutricionista
         JOIN usuario u       ON u.id_usuario = n.id_usuario
        WHERE p.id_usuario = $1
          AND s.status = 'pendente'
          AND u.desativado_em IS NULL
        ORDER BY s.criado_em DESC`,
      [user.sub],
    );
    return {
      data: rows.map((r) => ({
        id: String(r.id_solicitacao),
        nutricionista: {
          id: String(r.id_usuario),
          nome: r.nome,
          crn: r.crn ?? null,
          especialidade: r.especialidade ?? null,
        },
        criadoEm: r.criado_em,
      })),
    };
  }

  /**
   * Resposta do paciente. A troca de status e a criação do vínculo vão na
   * mesma transação: um aceite nunca fica gravado sem o vínculo, nem o
   * contrário.
   */
  async responder(idUsuarioPaciente: string, idSolicitacao: string, aceitar: boolean) {
    const client = await this.pool.connect();
    let resposta: { id_nutricionista: string; id_paciente: string };
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE solicitacao_vinculo s
            SET status = $3, respondido_em = NOW()
           FROM paciente p
          WHERE s.id_solicitacao = $1
            AND s.id_paciente = p.id_paciente
            AND p.id_usuario = $2
            AND s.status = 'pendente'
          RETURNING s.id_nutricionista, s.id_paciente`,
        [idSolicitacao, idUsuarioPaciente, aceitar ? 'aceita' : 'recusada'],
      );
      if (!rows[0]) {
        throw new NotFoundException('Convite não encontrado ou já respondido');
      }
      resposta = rows[0];

      if (aceitar) {
        // Sem alvo no ON CONFLICT vale qualquer índice único, inclusive o
        // parcial de vínculo ativo: se o par já estava vinculado, segue igual.
        await client.query(
          `INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [resposta.id_nutricionista, resposta.id_paciente],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }

    const { rows: partes } = await this.pool.query(
      `SELECT un.id_usuario AS id_nutri, up.nome AS nome_paciente
         FROM nutricionista n
         JOIN usuario un ON un.id_usuario = n.id_usuario,
              paciente p
         JOIN usuario up ON up.id_usuario = p.id_usuario
        WHERE n.id_nutricionista = $1 AND p.id_paciente = $2`,
      [resposta.id_nutricionista, resposta.id_paciente],
    );
    if (partes[0]) {
      const { id_nutri, nome_paciente } = partes[0];
      this.avisar(
        String(id_nutri),
        aceitar ? 'Convite aceito' : 'Convite recusado',
        aceitar
          ? `${nome_paciente} aceitou o acompanhamento e já aparece na sua lista de pacientes.`
          : `${nome_paciente} recusou o convite de acompanhamento.`,
      );
    }

    return { id: idSolicitacao, status: aceitar ? 'aceita' : 'recusada' };
  }

  async cancelar(idUsuarioNutri: string, idSolicitacao: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE solicitacao_vinculo s
          SET status = 'cancelada', respondido_em = NOW()
         FROM nutricionista n
        WHERE s.id_solicitacao = $1
          AND s.id_nutricionista = n.id_nutricionista
          AND n.id_usuario = $2
          AND s.status = 'pendente'`,
      [idSolicitacao, idUsuarioNutri],
    );
    if (!rowCount) throw new NotFoundException('Convite não encontrado ou já respondido');
    return { id: idSolicitacao, status: 'cancelada' };
  }

  /** Quem acompanha o paciente hoje — para ele saber quem vê os seus dados. */
  async listarNutricionistasDoPaciente(idUsuarioPaciente: string) {
    const { rows } = await this.pool.query(
      `SELECT un.id_usuario, un.nome, n.crn, n.especialidade, np.criado_em
         FROM nutricionista_paciente np
         JOIN paciente p      ON p.id_paciente = np.id_paciente
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN usuario un      ON un.id_usuario = n.id_usuario
        WHERE p.id_usuario = $1
          AND np.ativo = TRUE
          AND un.desativado_em IS NULL
        ORDER BY un.nome`,
      [idUsuarioPaciente],
    );
    return {
      data: rows.map((r) => ({
        id: String(r.id_usuario),
        nome: r.nome,
        crn: r.crn ?? null,
        especialidade: r.especialidade ?? null,
        vinculadoEm: r.criado_em,
      })),
    };
  }

  /**
   * O paciente revoga o consentimento. Como no desvincular do nutricionista,
   * o vínculo é encerrado e não apagado: o histórico de mensagens e o
   * prontuário continuam íntegros, só o acesso acaba.
   */
  async encerrarPeloPaciente(idUsuarioPaciente: string, idUsuarioNutri: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE nutricionista_paciente np
          SET ativo = FALSE, encerrado_em = NOW()
         FROM nutricionista n, paciente p
        WHERE np.id_nutricionista = n.id_nutricionista
          AND np.id_paciente = p.id_paciente
          AND n.id_usuario = $1
          AND p.id_usuario = $2
          AND np.ativo = TRUE`,
      [idUsuarioNutri, idUsuarioPaciente],
    );
    if (!rowCount) throw new NotFoundException('Vínculo não encontrado');

    const { rows } = await this.pool.query('SELECT nome FROM usuario WHERE id_usuario = $1', [
      idUsuarioPaciente,
    ]);
    this.avisar(
      idUsuarioNutri,
      'Acompanhamento encerrado',
      `${rows[0]?.nome ?? 'Um paciente'} encerrou o acompanhamento com você.`,
    );
    return { encerrado: true };
  }
}
