import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import type { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';

const SENHA = 'Senha123!';
const usuario = {
  id_usuario: '30',
  nome: 'João',
  email: 'joao@x.com',
  senha: bcrypt.hashSync(SENHA, 4),
  tipo: 'paciente',
  desativado_em: null,
};

/** Responde cada consulta pelo texto do SQL, como o banco responderia. */
function responder(sql: string): unknown[] {
  if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return [];
  if (/SELECT id_usuario FROM usuario WHERE email/.test(sql)) return [];
  if (/FROM usuario WHERE (email|id_usuario)/.test(sql)) return [usuario];
  if (/INSERT INTO usuario/.test(sql)) return [usuario];
  if (/INSERT INTO refresh_token/.test(sql)) return [{ id_token: '2' }];
  if (/FROM refresh_token/.test(sql)) {
    return [{ id_token: '1', id_usuario: '30', expira_em: new Date(Date.now() + 60_000), revogado_em: null }];
  }
  if (/FROM paciente/.test(sql)) return [{ completo: true }];
  return [];
}

/**
 * Pool com UMA conexão só. Como no `pg`, `pool.query` também ocupa a conexão
 * enquanto roda. Quem pede uma segunda conexão segurando a primeira espera para
 * sempre: é o travamento que parava a API com ~15 logins simultâneos, quando as
 * 10 conexões do pool de verdade ficavam presas assim
 * (docs/ANALISE_DESEMPENHO.md, item 2.1).
 */
function criarPoolDeUmaConexao(): Pool {
  let ocupada = false;
  const esperando: (() => void)[] = [];
  const pegar = () =>
    new Promise<void>((liberada) => {
      const ocupar = () => {
        ocupada = true;
        liberada();
      };
      if (ocupada) esperando.push(ocupar);
      else ocupar();
    });
  const soltar = () => {
    ocupada = false;
    esperando.shift()?.();
  };
  const executar = async (sql: string) => {
    const rows = responder(sql.trim());
    return { rows, rowCount: rows.length };
  };

  return {
    query: async (sql: string) => {
      await pegar();
      try {
        return await executar(sql);
      } finally {
        soltar();
      }
    },
    connect: async () => {
      await pegar();
      return { query: executar, release: soltar };
    },
  } as unknown as Pool;
}

function montar() {
  const config = {
    get: (chave: string, padrao?: string) => (chave === 'GOOGLE_CLIENT_ID' ? 'cliente-teste' : padrao),
  } as unknown as ConfigService;
  const service = new AuthService(
    criarPoolDeUmaConexao(),
    new JwtService({ secret: 'teste' }),
    config,
    {} as MailService,
  );
  return service;
}

/** Travou = não terminou em 1 s; num pool de verdade seria para sempre. */
function semTravar<T>(operacao: Promise<T>): Promise<T> {
  let relogio: NodeJS.Timeout | undefined;
  const travou = new Promise<T>((_, falhar) => {
    relogio = setTimeout(
      () => falhar(new Error('travou: pediu uma segunda conexão segurando a primeira')),
      1000,
    );
  });
  return Promise.race([operacao, travou]).finally(() => clearTimeout(relogio));
}

describe('AuthService com o pool cheio', () => {
  it('should log in using a single free connection', async () => {
    const resposta = await semTravar(montar().login({ email: 'joao@x.com', senha: SENHA }));
    expect(resposta.user).toMatchObject({ id: '30', perfilCompleto: true });
    expect(resposta.refreshToken).toHaveLength(64);
  });

  it('should renew a session using a single free connection', async () => {
    const resposta = await semTravar(montar().refresh('token-antigo'));
    expect(resposta.user).toMatchObject({ id: '30', perfilCompleto: true });
  });

  it('should sign up a patient using a single free connection', async () => {
    const resposta = await semTravar(
      montar().cadastro({ nome: 'João', email: 'joao@x.com', senha: SENHA }, 'paciente'),
    );
    expect(resposta).toMatchObject({ user: { id: '30' } });
  });

  it('should log in with Google using a single free connection', async () => {
    const service = montar();
    (service as unknown as { googleClient: unknown }).googleClient = {
      verifyIdToken: async () => ({
        getPayload: () => ({ email: 'joao@x.com', email_verified: true, name: 'João' }),
      }),
    };
    const resposta = await semTravar(service.loginGoogle('token-do-google'));
    expect(resposta).toMatchObject({ user: { id: '30' } });
  });
});
