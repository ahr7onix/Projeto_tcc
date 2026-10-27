import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

@Injectable()
export class VinculosService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async resolveNutricionistaId(idUsuario: string): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT id_nutricionista FROM nutricionista WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Nutricionista não encontrado');
    return String(rows[0].id_nutricionista);
  }

  async resolvePacienteId(idUsuario: string): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT id_paciente FROM paciente WHERE id_usuario = $1`,
      [idUsuario],
    );
    if (!rows[0]) throw new NotFoundException('Paciente não encontrado');
    return String(rows[0].id_paciente);
  }

  async existeVinculo(
    idUsuarioNutri: string,
    idUsuarioPaciente: string,
  ): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1
         FROM nutricionista_paciente np
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN paciente p      ON p.id_paciente = np.id_paciente
        WHERE n.id_usuario = $1
          AND p.id_usuario = $2
          AND np.ativo = TRUE
        LIMIT 1`,
      [idUsuarioNutri, idUsuarioPaciente],
    );
    return rows.length > 0;
  }

  async garantirVinculo(idUsuarioNutri: string, idUsuarioPaciente: string) {
    const vinculado = await this.existeVinculo(idUsuarioNutri, idUsuarioPaciente);
    if (!vinculado) {
      throw new BadRequestException(
        'Este paciente não está vinculado a você. Vincule-o antes de continuar.',
      );
    }
  }

  /**
   * Descobre de qual paciente é o dado que está sendo lido ou gravado.
   *
   * O paciente só mexe nos próprios dados — se mandar um pacienteId de outra
   * pessoa, é ignorado de propósito, para não existir caminho de leitura
   * cruzada. O nutricionista precisa dizer de quem é, e o vínculo é conferido
   * (RN02). O administrador não entra aqui: ele não acompanha paciente.
   */
  async resolverPacienteAlvo(
    user: { sub: string; role: string },
    pacienteIdInformado?: string,
  ): Promise<{ idUsuarioPaciente: string; idPaciente: string }> {
    if (user.role === 'paciente') {
      const idPaciente = await this.resolvePacienteId(user.sub);
      return { idUsuarioPaciente: user.sub, idPaciente };
    }

    if (user.role === 'nutricionista') {
      if (!pacienteIdInformado) {
        throw new BadRequestException('Informe o paciente (pacienteId)');
      }
      await this.garantirVinculo(user.sub, pacienteIdInformado);
      const idPaciente = await this.resolvePacienteId(pacienteIdInformado);
      return { idUsuarioPaciente: pacienteIdInformado, idPaciente };
    }

    throw new ForbiddenException(
      'Este recurso é do acompanhamento nutricional: disponível para paciente e nutricionista',
    );
  }

  async listarPacientes(idUsuarioNutri: string) {
    const { rows } = await this.pool.query(
      `SELECT np.id_vinculo,
              np.criado_em,
              u.id_usuario,
              u.nome,
              u.email
         FROM nutricionista_paciente np
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN paciente p      ON p.id_paciente = np.id_paciente
         JOIN usuario u       ON u.id_usuario = p.id_usuario
        WHERE n.id_usuario = $1
          AND np.ativo = TRUE
          AND u.desativado_em IS NULL
        ORDER BY u.nome`,
      [idUsuarioNutri],
    );

    return {
      data: rows.map((r) => ({
        vinculoId: String(r.id_vinculo),
        pacienteId: String(r.id_usuario),
        nome: r.nome,
        email: r.email,
        vinculadoEm: r.criado_em,
      })),
    };
  }

  /** Grava o aviso no histórico de notificações do painel/app. */
  private async avisar(idUsuario: string, titulo: string, mensagem: string) {
    await this.pool
      .query(
        `INSERT INTO notificacao (id_usuario, tipo, titulo, mensagem)
         VALUES ($1, 'sistema', $2, $3)`,
        [idUsuario, titulo, mensagem],
      )
      .catch(() => undefined);
  }

  /**
   * O nutricionista só convida: o vínculo (e o acesso aos dados) nasce quando o
   * paciente aceita, em `responderConvite`.
   */
  async convidar(idUsuarioNutri: string, idUsuarioPaciente: string) {
    const idNutricionista = await this.resolveNutricionistaId(idUsuarioNutri);
    const idPaciente = await this.resolvePacienteId(idUsuarioPaciente);

    if (await this.existeVinculo(idUsuarioNutri, idUsuarioPaciente)) {
      throw new ConflictException('Paciente já vinculado a você');
    }

    // Dois cliques no mesmo instante passam pela checagem: o índice único
    // parcial `idx_convite_pendente_unico` (23505) devolve o mesmo 409.
    let rows: Array<{ id_convite: string; criado_em: Date }>;
    try {
      ({ rows } = await this.pool.query(
        `INSERT INTO convite_vinculo (id_nutricionista, id_paciente)
         VALUES ($1, $2)
         RETURNING id_convite, criado_em`,
        [idNutricionista, idPaciente],
      ));
    } catch (err) {
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictException('Já existe um convite pendente para este paciente');
      }
      throw err;
    }

    const { rows: nome } = await this.pool.query(
      'SELECT nome FROM usuario WHERE id_usuario = $1',
      [idUsuarioNutri],
    );
    await this.avisar(
      idUsuarioPaciente,
      'Convite de acompanhamento',
      `${nome[0]?.nome ?? 'Um nutricionista'} convidou você para acompanhamento nutricional.`,
    );

    return {
      conviteId: String(rows[0].id_convite),
      pacienteId: idUsuarioPaciente,
      status: 'pendente',
      enviadoEm: rows[0].criado_em,
    };
  }

  async listarConvitesEnviados(idUsuarioNutri: string) {
    const { rows } = await this.pool.query(
      `SELECT c.id_convite, c.criado_em, u.id_usuario, u.nome, u.email
         FROM convite_vinculo c
         JOIN nutricionista n ON n.id_nutricionista = c.id_nutricionista
         JOIN paciente p      ON p.id_paciente = c.id_paciente
         JOIN usuario u       ON u.id_usuario = p.id_usuario
        WHERE n.id_usuario = $1 AND c.status = 'pendente'
        ORDER BY c.criado_em DESC`,
      [idUsuarioNutri],
    );
    return {
      data: rows.map((r) => ({
        conviteId: String(r.id_convite),
        pacienteId: String(r.id_usuario),
        nome: r.nome,
        email: r.email,
        enviadoEm: r.criado_em,
      })),
    };
  }

  async cancelarConvite(idUsuarioNutri: string, idConvite: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE convite_vinculo c
          SET status = 'cancelado', respondido_em = NOW()
         FROM nutricionista n
        WHERE c.id_nutricionista = n.id_nutricionista
          AND n.id_usuario = $1
          AND c.id_convite = $2
          AND c.status = 'pendente'`,
      [idUsuarioNutri, idConvite],
    );
    if (!rowCount) throw new NotFoundException('Convite não encontrado');
    return { cancelado: true };
  }

  async listarConvitesRecebidos(idUsuarioPaciente: string) {
    const { rows } = await this.pool.query(
      `SELECT c.id_convite, c.criado_em, u.nome, n.crn, n.especialidade
         FROM convite_vinculo c
         JOIN paciente p      ON p.id_paciente = c.id_paciente
         JOIN nutricionista n ON n.id_nutricionista = c.id_nutricionista
         JOIN usuario u       ON u.id_usuario = n.id_usuario
        WHERE p.id_usuario = $1 AND c.status = 'pendente'
        ORDER BY c.criado_em DESC`,
      [idUsuarioPaciente],
    );
    return {
      data: rows.map((r) => ({
        conviteId: String(r.id_convite),
        nutricionistaNome: r.nome,
        crn: r.crn ?? null,
        especialidade: r.especialidade ?? null,
        enviadoEm: r.criado_em,
      })),
    };
  }

  /** Aceite cria o vínculo; recusa só encerra o convite. */
  async responderConvite(
    idUsuarioPaciente: string,
    idConvite: string,
    aceitar: boolean,
  ) {
    const client = await this.pool.connect();
    let idUsuarioNutri: string;
    let nomePaciente: string;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT c.id_convite, c.id_nutricionista, c.id_paciente,
                n.id_usuario AS id_usuario_nutri, u.nome
           FROM convite_vinculo c
           JOIN paciente p      ON p.id_paciente = c.id_paciente
           JOIN nutricionista n ON n.id_nutricionista = c.id_nutricionista
           JOIN usuario u       ON u.id_usuario = p.id_usuario
          WHERE c.id_convite = $1 AND p.id_usuario = $2 AND c.status = 'pendente'
          FOR UPDATE OF c`,
        [idConvite, idUsuarioPaciente],
      );
      const convite = rows[0];
      if (!convite) throw new NotFoundException('Convite não encontrado');
      await client.query(
        `UPDATE convite_vinculo SET status = $2, respondido_em = NOW()
          WHERE id_convite = $1`,
        [idConvite, aceitar ? 'aceito' : 'recusado'],
      );
      if (aceitar) {
        await client.query(
          `INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente)
           SELECT $1, $2
            WHERE NOT EXISTS (
              SELECT 1 FROM nutricionista_paciente
               WHERE id_nutricionista = $1 AND id_paciente = $2 AND ativo = TRUE
            )`,
          [convite.id_nutricionista, convite.id_paciente],
        );
      }
      await client.query('COMMIT');
      idUsuarioNutri = String(convite.id_usuario_nutri);
      nomePaciente = convite.nome;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }

    await this.avisar(
      idUsuarioNutri,
      aceitar ? 'Convite aceito' : 'Convite recusado',
      `${nomePaciente} ${aceitar ? 'aceitou' : 'recusou'} o seu convite de acompanhamento.`,
    );
    return { status: aceitar ? 'aceito' : 'recusado' };
  }

  async desvincular(idUsuarioNutri: string, idUsuarioPaciente: string) {
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
    return { desvinculado: true };
  }
}
