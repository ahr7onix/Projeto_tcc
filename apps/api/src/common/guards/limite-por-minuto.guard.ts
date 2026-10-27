import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Pedidos por minuto nas rotas que criam conta ou mandam e-mail (cadastros,
 * Google, esqueci e redefinir senha). O login tem o seu próprio limite, que
 * conta só as falhas (`common/limite-tentativas.ts`).
 */
export const LIMITE_POR_MINUTO = 5;
export const JANELA_POR_MINUTO_MS = 60_000;

/**
 * De quem é o pedido: IP + e-mail quando ele traz e-mail.
 *
 * Só o IP não serve: os pacientes da associação podem usar todos a mesma rede
 * (o mesmo IP) num encontro de grupo, e o limite de um bloquearia os outros.
 * Com o e-mail junto, cada conta tem a sua contagem — e disparar "esqueci a
 * senha" em massa contra uma conta continua limitado.
 */
export function chaveDaTentativa(req: { ip?: string; body?: unknown }): string {
  const corpo = req.body as { email?: unknown } | undefined;
  const email = typeof corpo?.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const ip = req.ip ?? 'desconhecido';
  return email ? `${ip}:${email}` : ip;
}

@Injectable()
export class LimitePorMinutoGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return chaveDaTentativa(req);
  }
}
