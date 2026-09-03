import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { logger } from '../../common/logging/logger.service';
import { perfilEstaCompleto } from '../../common/perfil-completo';
import { MailService } from '../mail/mail.service';
import { CadastroDto } from './dto/cadastro.dto';
import { LoginDto } from './dto/login.dto';

type Papel = 'paciente' | 'nutricionista' | 'administrador';

interface UserRow {
  id_usuario: string;
  nome: string;
  email: string;
  senha: string;
  tipo: Papel;
  /** Preenchido quando o dono encerrou a conta. NULL = ativa. */
  desativado_em?: Date | null;
}

export interface AuthResponse {
  user: {
    id: string;
    nome: string;
    email: string;
    role: Papel;
    perfilCompleto: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * `23505` e o unique_violation do PostgreSQL. Serve para tratar a corrida entre
 * dois cadastros do mesmo e-mail: o `SELECT ... WHERE email = $1` que vem antes
 * do `INSERT` nao segura nada, e sem isto o segundo pedido virava 500.
 */
function ehEmailDuplicado(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string };
  return e?.code === '23505' && (e.constraint ?? '').includes('email');
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private googleClientId: string;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.googleClientId =
      this.config.get<string>('GOOGLE_CLIENT_ID', '').trim();
    this.googleClient = new OAuth2Client(this.googleClientId);
  }

  async cadastro(
    dto: CadastroDto,
    papel: 'paciente' | 'nutricionista',
  ): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const nome = dto.nome.trim().replace(/\s+/g, ' ');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<{ id_usuario: string }>(
        'SELECT id_usuario FROM usuario WHERE email = $1',
        [email],
      );
      if (existing.rowCount && existing.rowCount > 0) {
        await client.query('ROLLBACK');
        throw new ConflictException('E-mail já cadastrado');
      }

      const senhaHash = await bcrypt.hash(dto.senha, 10);

      const inserted = await client.query<UserRow>(
        `INSERT INTO usuario (nome, email, senha, tipo)
         VALUES ($1, $2, $3, $4)
         RETURNING id_usuario, nome, email, senha, tipo`,
        [nome, email, senhaHash, papel],
      );
      const user = inserted.rows[0];

      if (papel === 'paciente') {
        const dataNascimento = this.parseBrDate(dto.dataNascimento);
        const pacienteIns = await client.query<{ id_paciente: string }>(
          `INSERT INTO paciente (id_usuario, data_nascimento, genero, tipo_diabetes)
           VALUES ($1, $2, $3, $4)
           RETURNING id_paciente`,
          [user.id_usuario, dataNascimento, dto.sexo ?? null, dto.tipoDiabetes ?? null],
        );
        // Paciente novo já aparece na lista do nutricionista (vínculo automático).
        await client.query(
          `INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente)
           SELECT n.id_nutricionista, $1
             FROM nutricionista n
            WHERE NOT EXISTS (
              SELECT 1 FROM nutricionista_paciente np
               WHERE np.id_nutricionista = n.id_nutricionista
                 AND np.id_paciente = $1
                 AND np.ativo = TRUE
            )`,
          [pacienteIns.rows[0].id_paciente],
        );
      } else {
        const crn = dto.crn?.trim() || null;
        await client.query(
          `INSERT INTO nutricionista (id_usuario, crn, especialidade, perfil_completo)
           VALUES ($1, $2, $3, $4)`,
          [user.id_usuario, crn, dto.especialidade?.trim() ?? null, crn !== null],
        );
      }

      await client.query('COMMIT');
      return this.issueSession(user);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      // A checagem acima resolve o caso comum; a restricao do banco resolve a
      // corrida. Nos dois caminhos o cliente recebe o mesmo 409.
      if (ehEmailDuplicado(err)) {
        throw new ConflictException('E-mail ja cadastrado');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const result = await this.pool.query<UserRow>(
      'SELECT id_usuario, nome, email, senha, tipo, desativado_em FROM usuario WHERE email = $1',
      [email],
    );
    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }
    const ok = await bcrypt.compare(dto.senha, user.senha);
    if (!ok) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }
    // Só depois de conferir a senha: dizer antes revelaria quais e-mails existem.
    this.recusarSeDesativada(user);
    return this.issueSession(user);
  }

  async loginGoogle(
    idToken: string,
    perfilCadastro: 'paciente' | 'nutricionista' = 'paciente',
  ): Promise<AuthResponse> {
    if (!this.googleClientId) {
      throw new UnauthorizedException(
        'Login com Google não está configurado nesta instalação: defina GOOGLE_CLIENT_ID no .env da API.',
      );
    }
    if (!idToken) {
      throw new UnauthorizedException('Token do Google não recebido');
    }

    let payload: TokenPayload | undefined;
    try {
      // `audience` é obrigatório: sem ele a biblioteca aceitaria um token
      // emitido para qualquer outro aplicativo Google.
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      // A mensagem da biblioteca descreve o motivo exato da recusa (audience
      // esperado, janela de validade, chave usada). Isso e diagnostico de
      // servidor, nao resposta de API: fica so no log.
      logger.escrever('WARN', 'auth: token do Google recusado', {
        tipo: (error as Error)?.name ?? 'Error',
      });
      throw new UnauthorizedException('Token do Google invalido');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Token do Google inválido');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('E-mail do Google não verificado');
    }

    {
      const email = payload.email.toLowerCase();
      const nome = payload.name || 'Usuário Google';

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const result = await client.query<UserRow>(
          'SELECT id_usuario, nome, email, senha, tipo, desativado_em FROM usuario WHERE email = $1',
          [email]
        );

        let user = result.rows[0];
        if (user) this.recusarSeDesativada(user);

        if (!user) {
          const randomPass = randomBytes(16).toString('hex');
          const senhaHash = await bcrypt.hash(randomPass, 10);
          const papel = perfilCadastro === 'nutricionista' ? 'nutricionista' : 'paciente';

          const inserted = await client.query<UserRow>(
            `INSERT INTO usuario (nome, email, senha, tipo)
             VALUES ($1, $2, $3, $4)
             RETURNING id_usuario, nome, email, senha, tipo`,
            [nome, email, senhaHash, papel]
          );
          user = inserted.rows[0];

          if (papel === 'paciente') {
            const pacienteIns = await client.query<{ id_paciente: string }>(
              `INSERT INTO paciente (id_usuario, data_nascimento, genero, tipo_diabetes)
               VALUES ($1, NULL, NULL, NULL)
               RETURNING id_paciente`,
              [user.id_usuario],
            );
            await client.query(
              `INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente)
               SELECT n.id_nutricionista, $1
                 FROM nutricionista n
                WHERE NOT EXISTS (
                  SELECT 1 FROM nutricionista_paciente np
                   WHERE np.id_nutricionista = n.id_nutricionista
                     AND np.id_paciente = $1
                     AND np.ativo = TRUE
                )`,
              [pacienteIns.rows[0].id_paciente],
            );
          } else {
            await client.query(
              `INSERT INTO nutricionista (id_usuario, crn, especialidade, perfil_completo)
               VALUES ($1, NULL, NULL, FALSE)`,
              [user.id_usuario]
            );
          }
        }

        await client.query('COMMIT');
        return this.issueSession(user);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        if (ehEmailDuplicado(err)) {
          throw new ConflictException(
            'Uma conta com este e-mail acabou de ser criada. Tente entrar de novo.',
          );
        }
        throw err;
      } finally {
        client.release();
      }
    }
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{
        id_token: string;
        id_usuario: string;
        expira_em: Date;
        revogado_em: Date | null;
      }>(
        `SELECT id_token, id_usuario, expira_em, revogado_em
         FROM refresh_token
         WHERE token_hash = $1
         FOR UPDATE`,
        [tokenHash],
      );
      const row = result.rows[0];
      if (!row || row.revogado_em || row.expira_em < new Date()) {
        await client.query('ROLLBACK');
        throw new UnauthorizedException('Sessão expirada');
      }

      const userResult = await client.query<UserRow>(
        'SELECT id_usuario, nome, email, senha, tipo, desativado_em FROM usuario WHERE id_usuario = $1',
        [row.id_usuario],
      );
      const user = userResult.rows[0];
      if (!user) {
        await client.query('ROLLBACK');
        throw new UnauthorizedException('Usuário não encontrado');
      }
      if (user.desativado_em) {
        await client.query('ROLLBACK');
        throw new UnauthorizedException('Esta conta foi desativada.');
      }

      await client.query(
        'UPDATE refresh_token SET revogado_em = NOW() WHERE id_token = $1',
        [row.id_token],
      );

      const session = await this.createRefreshToken(client, user.id_usuario, row.id_token);
      await client.query('COMMIT');

      const accessToken = this.signAccessToken(user);
      return {
        user: await this.toPublicUser(user),
        accessToken,
        refreshToken: session.token,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.pool.query(
      `UPDATE refresh_token SET revogado_em = NOW()
       WHERE token_hash = $1 AND revogado_em IS NULL`,
      [tokenHash],
    );
  }

  async esqueciSenha(email: string): Promise<{
    message: string;
    previewUrl?: string;
    resetUrl?: string;
  }> {
    const message =
      'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.';

    const result = await this.pool.query<{
      id_usuario: string;
      nome: string;
      email: string;
    }>(
      'SELECT id_usuario, nome, email FROM usuario WHERE LOWER(email) = LOWER($1)',
      [email.trim()],
    );

    const user = result.rows[0];
    if (!user) {
      // Não revela se o e-mail existe.
      return { message };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalida tokens anteriores ainda válidos.
    await this.pool.query(
      `UPDATE senha_reset_token
       SET usado_em = NOW()
       WHERE id_usuario = $1 AND usado_em IS NULL`,
      [user.id_usuario],
    );

    await this.pool.query(
      `INSERT INTO senha_reset_token (id_usuario, token_hash, expira_em)
       VALUES ($1, $2, $3)`,
      [user.id_usuario, tokenHash, expiraEm.toISOString()],
    );

    const webUrl = (
      this.config.get<string>('WEB_APP_URL') || 'http://localhost:5173'
    ).replace(/\/$/, '');
    const resetUrl = `${webUrl}/redefinir-senha?token=${token}`;

    try {
      const envio = await this.mail.enviarRedefinicaoSenha({
        para: user.email,
        nome: user.nome,
        resetUrl,
      });

      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      return {
        message,
        ...(isProd
          ? {}
          : {
              previewUrl: envio.previewUrl,
              resetUrl,
            }),
      };
    } catch (err) {
      // Em falha de e-mail, ainda devolve mensagem genérica (e o link em dev).
      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      return {
        message,
        ...(isProd ? {} : { resetUrl }),
      };
    }
  }

  async redefinirSenha(token: string, novaSenha: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // O token e consumido no proprio UPDATE, dentro da transacao.
      //
      // Antes havia um SELECT solto para conferir o token e so depois um
      // UPDATE marcando `usado_em`. Dois pedidos com o mesmo link passavam os
      // dois pelo SELECT e os dois trocavam a senha: o "uso unico" do link so
      // valia para quem nao chegasse junto. Aqui a linha e travada pelo
      // proprio UPDATE, entao o segundo pedido nao encontra nada.
      const found = await client.query<{ id_usuario: string }>(
        `UPDATE senha_reset_token
            SET usado_em = NOW()
          WHERE token_hash = $1
            AND usado_em IS NULL
            AND expira_em > NOW()
        RETURNING id_usuario`,
        [tokenHash],
      );

      const row = found.rows[0];
      if (!row) {
        await client.query('ROLLBACK');
        throw new UnauthorizedException(
          'Link inválido ou expirado. Solicite uma nova redefinição de senha.',
        );
      }

      await client.query(
        'UPDATE usuario SET senha = $1, atualizado_em = NOW() WHERE id_usuario = $2',
        [senhaHash, row.id_usuario],
      );
      // Revoga sessões ativas depois da troca de senha.
      await client.query(
        `UPDATE refresh_token SET revogado_em = NOW()
         WHERE id_usuario = $1 AND revogado_em IS NULL`,
        [row.id_usuario],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }

    return { message: 'Senha atualizada com sucesso. Você já pode entrar.' };
  }

  private async issueSession(user: UserRow): Promise<AuthResponse> {
    const client = await this.pool.connect();
    try {
      const session = await this.createRefreshToken(client, user.id_usuario, null);
      const accessToken = this.signAccessToken(user);
      return {
        user: await this.toPublicUser(user),
        accessToken,
        refreshToken: session.token,
      };
    } finally {
      client.release();
    }
  }

  private async createRefreshToken(
    client: { query: Pool['query'] },
    idUsuario: string,
    substituiId: string | null,
  ): Promise<{ token: string }> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const ttlDays = Number(this.config.get<string>('REFRESH_TOKEN_TTL_DAYS', '30'));
    const expiraEm = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const inserted = await client.query<{ id_token: string }>(
      `INSERT INTO refresh_token (id_usuario, token_hash, expira_em)
       VALUES ($1, $2, $3)
       RETURNING id_token`,
      [idUsuario, tokenHash, expiraEm],
    );

    if (substituiId) {
      await client.query(
        'UPDATE refresh_token SET substituto_id = $1 WHERE id_token = $2',
        [inserted.rows[0].id_token, substituiId],
      );
    }

    return { token };
  }

  /**
   * Conta encerrada pelo próprio dono não emite sessão nova. Chamar só depois
   * de a credencial já ter sido validada, para não virar sonda de e-mails.
   */
  private recusarSeDesativada(user: UserRow): void {
    if (user.desativado_em) {
      throw new UnauthorizedException(
        'Esta conta foi desativada. Fale com seu nutricionista para reativá-la.',
      );
    }
  }

  private signAccessToken(user: UserRow): string {
    return this.jwt.sign(
      { sub: user.id_usuario, email: user.email, role: user.tipo },
      {
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      },
    );
  }

  private async toPublicUser(user: UserRow) {
    return {
      id: String(user.id_usuario),
      nome: user.nome,
      email: user.email,
      role: user.tipo,
      perfilCompleto: await perfilEstaCompleto(this.pool, user.id_usuario, user.tipo),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseBrDate(value?: string): string | null {
    if (!value) return null;
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }
}
