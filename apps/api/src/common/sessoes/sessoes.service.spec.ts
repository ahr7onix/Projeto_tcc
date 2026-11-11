import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Pool } from 'pg';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { SessoesService } from './sessoes.service';

/** Banco de mentira: cada id de sessão em `abertas` responde "aberta". */
function montar(abertas: string[]) {
  const query = jest.fn(async (_sql: string, params: unknown[]) => {
    const rows = abertas.includes(String(params[0])) ? [{ '?column?': 1 }] : [];
    return { rows, rowCount: rows.length };
  });
  const sessoes = new SessoesService({ query } as unknown as Pool);
  const jwt = new JwtService({ secret: 'teste' });
  const guard = new JwtAuthGuard(jwt, sessoes);
  return { query, sessoes, jwt, guard };
}

function contexto(token?: string) {
  const req: { headers: Record<string, string>; user?: unknown } = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('JwtAuthGuard com a sessão do token', () => {
  const dono = { sub: '30', email: 'joao@x.com', role: 'paciente' as const };

  it('should accept a token whose session is still open', async () => {
    const { guard, jwt } = montar(['7']);
    const { ctx, req } = contexto(jwt.sign({ ...dono, sid: '7' }));

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toMatchObject({ sub: '30', sid: '7' });
  });

  it('should refuse the token right after its session ends, not 15 minutes later', async () => {
    // Antes, sair ou trocar a senha deixava o token de acesso valendo até vencer.
    const abertas = ['7'];
    const { guard, jwt, sessoes } = montar(abertas);
    const token = jwt.sign({ ...dono, sid: '7' });
    await guard.canActivate(contexto(token).ctx);

    abertas.length = 0; // o logout revogou a sessão no banco
    sessoes.sessoesEncerradas();

    await expect(guard.canActivate(contexto(token).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should refuse a token without session, issued before this check', async () => {
    const { guard, jwt, query } = montar(['7']);
    await expect(guard.canActivate(contexto(jwt.sign(dono)).ctx)).rejects.toThrow(UnauthorizedException);
    expect(query).not.toHaveBeenCalled();
  });

  it('should refuse a missing or forged token', async () => {
    const { guard } = montar(['7']);
    const falso = new JwtService({ secret: 'outro' }).sign({ ...dono, sid: '7' });

    await expect(guard.canActivate(contexto().ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(contexto(falso).ctx)).rejects.toThrow(UnauthorizedException);
  });
});

describe('SessoesService', () => {
  it('should ask the database once and remember the answer for a while', async () => {
    const { sessoes, query } = montar(['7']);

    await sessoes.aberta('7', '30');
    await sessoes.aberta('7', '30');

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(['7', '30']);
  });

  it('should accept the token issued before a renewal while the new session is open', async () => {
    const { sessoes, query } = montar(['7']);
    await sessoes.aberta('7', '30');

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('s.id_token = t.substituto_id');
    expect(sql).toContain('t.revogado_em IS NULL OR (s.id_token IS NOT NULL AND s.revogado_em IS NULL)');
  });

  it('should ask the database again after any session ends', async () => {
    const { sessoes, query } = montar(['7']);

    await sessoes.aberta('7', '30');
    sessoes.sessoesEncerradas();
    await sessoes.aberta('7', '30');

    expect(query).toHaveBeenCalledTimes(2);
  });
});
