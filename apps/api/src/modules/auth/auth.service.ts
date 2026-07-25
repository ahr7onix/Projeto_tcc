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
import { OAuth2Client } from 'google-auth-library';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { perfilEstaCompleto } from '../../common/perfil-completo';
import { CadastroDto } from './dto/cadastro.dto';
import { LoginDto } from './dto/login.dto';

type Papel = 'paciente' | 'nutricionista' | 'administrador';

interface UserRow {
  id_usuario: string;
  nome: string;
  email: string;
  senha: string;
  tipo: Papel;
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

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID', 'COLOQUE_SEU_CLIENT_ID_AQUI')
    );
  }

  async cadastro(dto: CadastroDto): Promise<AuthResponse> {
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
        [nome, email, senhaHash, dto.role],
      );
      const user = inserted.rows[0];

      if (dto.role === 'paciente') {
        const dataNascimento = this.parseBrDate(dto.dataNascimento);
        await client.query(
          `INSERT INTO paciente (id_usuario, data_nascimento, genero, tipo_diabetes)
           VALUES ($1, $2, $3, $4)`,
          [user.id_usuario, dataNascimento, dto.sexo ?? null, dto.tipoDiabetes ?? null],
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
      throw err;
    } finally {
      client.release();
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const result = await this.pool.query<UserRow>(
      'SELECT id_usuario, nome, email, senha, tipo FROM usuario WHERE email = $1',
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
    return this.issueSession(user);
  }

  async loginGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,

      });
      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Token do Google inválido');
      }

      const email = payload.email.toLowerCase();
      const nome = payload.name || 'Usuário Google';

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const result = await client.query<UserRow>(
          'SELECT id_usuario, nome, email, senha, tipo FROM usuario WHERE email = $1',
          [email]
        );

        let user = result.rows[0];

        if (!user) {

          const randomPass = randomBytes(16).toString('hex');
          const senhaHash = await bcrypt.hash(randomPass, 10);

          const inserted = await client.query<UserRow>(
            `INSERT INTO usuario (nome, email, senha, tipo)
             VALUES ($1, $2, $3, $4)
             RETURNING id_usuario, nome, email, senha, tipo`,
            [nome, email, senhaHash, 'paciente']
          );
          user = inserted.rows[0];

          await client.query(
            `INSERT INTO paciente (id_usuario, data_nascimento, genero, tipo_diabetes)
             VALUES ($1, NULL, NULL, NULL)`,
            [user.id_usuario]
          );
        }

        await client.query('COMMIT');
        return this.issueSession(user);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      throw new UnauthorizedException('Falha ao autenticar com o Google: ' + error.message);
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
        'SELECT id_usuario, nome, email, senha, tipo FROM usuario WHERE id_usuario = $1',
        [row.id_usuario],
      );
      const user = userResult.rows[0];
      if (!user) {
        await client.query('ROLLBACK');
        throw new UnauthorizedException('Usuário não encontrado');
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

  async esqueciSenha(_email: string): Promise<{ message: string }> {

    return { message: 'Se o e-mail estiver cadastrado, enviaremos instruções.' };
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
