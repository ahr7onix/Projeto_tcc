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

  /**
   * O convite é gravado pelo e-mail digitado, tenha ele conta de paciente ou
   * não, e a resposta é sempre a mesma. Antes, um 404 ou o nome devolvido
   * contavam à nutricionista quem usa o NutriCare, o que num serviço de
   * diabetes já é dado de saúde por associação (migration 018, CO-03 do
   * parecer). Quem se cadastrar depois com esse e-mail encontra o convite.
   */
  async convidar(idUsuarioNutri: string, emailDigitado: string) {
    const idNutricionista = await this.vinculos.resolveNutricionistaId(idUsuarioNutri);
    const email = emailDigitado.trim().toLowerCase();

    const { rows: pacientes } = await this.pool.query(
      `SELECT p.id_paciente, u.id_usuario
         FROM usuario u
         JOIN paciente p ON p.id_usuario = u.id_usuario
        WHERE u.email = $1
          AND u.desativado_em IS NULL`,
      [email],
    );
    const paciente = pacientes[0];
    const idUsuarioPaciente = paciente ? String(paciente.id_usuario) : null;
    // Só ouve isso quem já acompanha o paciente: não conta nada novo.
    if (idUsuarioPaciente && (await this.vinculos.existeVinculo(idUsuarioNutri, idUsuarioPaciente))) {
      throw new ConflictException('Este paciente já está vinculado a você');
    }

    let criado: { id_solicitacao: string; criado_em: Date };
    try {
      ({
        rows: [criado],
      } = await this.pool.query(
        `INSERT INTO solicitacao_vinculo (id_nutricionista, id_paciente, email_convidado)
         VALUES ($1, $2, $3)
         RETURNING id_solicitacao, criado_em`,
        [idNutricionista, paciente?.id_paciente ?? null, email],
      ));
    } catch (err) {
      // Índices únicos parciais: um convite pendente por paciente e por e-mail.
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictException('Você já tem um convite para este e-mail aguardando resposta');
      }
      throw err;
    }

    if (idUsuarioPaciente) {
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
    }

    return { id: String(criado.id_solicitacao), email, criadoEm: criado.criado_em };
  }

  /**
   * Nutricionista vê os convites que mandou, só pelo e-mail que digitou: o
   * nome do paciente aparece depois do aceite. Paciente vê os que recebeu,
   * inclusive os mandados ao seu e-mail antes de ele ter conta.
   */
  async listarPendentes(user: JwtPayload) {
    if (user.role === 'nutricionista') {
      const { rows } = await this.pool.query(
        `SELECT s.id_solicitacao, s.criado_em, COALESCE(s.email_convidado, u.email) AS email
           FROM solicitacao_vinculo s
           JOIN nutricionista n ON n.id_nutricionista = s.id_nutricionista
           LEFT JOIN paciente p ON p.id_paciente = s.id_paciente
           LEFT JOIN usuario u  ON u.id_usuario = p.id_usuario
          WHERE n.id_usuario = $1
            AND s.status = 'pendente'
          ORDER BY s.criado_em DESC`,
        [user.sub],
      );
      return {
        data: rows.map((r) => ({
          id: String(r.id_solicitacao),
          email: r.email,
          criadoEm: r.criado_em,
        })),
      };
    }

    const { rows } = await this.pool.query(
      `SELECT s.id_solicitacao, s.criado_em, u.id_usuario, u.nome, n.crn, n.especialidade
         FROM solicitacao_vinculo s
         JOIN paciente p      ON p.id_usuario = $1
         JOIN usuario up      ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = s.id_nutricionista
         JOIN usuario u       ON u.id_usuario = n.id_usuario
        WHERE (s.id_paciente = p.id_paciente
               OR (s.id_paciente IS NULL AND s.email_convidado = up.email))
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
   * contrário. Convite mandado ao e-mail antes da conta existir ganha aqui o
   * id do paciente que respondeu.
   */
  async responder(idUsuarioPaciente: string, idSolicitacao: string, aceitar: boolean) {
    const client = await this.pool.connect();
    let resposta: { id_nutricionista: string; id_paciente: string };
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE solicitacao_vinculo s
            SET status = $3, respondido_em = NOW(), id_paciente = p.id_paciente
           FROM paciente p
           JOIN usuario u ON u.id_usuario = p.id_usuario
          WHERE s.id_solicitacao = $1
            AND p.id_usuario = $2
            AND (s.id_paciente = p.id_paciente
                 OR (s.id_paciente IS NULL AND s.email_convidado = u.email))
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
