import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Tentativas por minuto em cada rota de autenticação. */
export const LIMITE_TENTATIVAS = 5;
export const JANELA_TENTATIVAS_MS = 60_000;

/**
 * De quem é a tentativa: IP + e-mail quando o pedido traz e-mail.
 *
 * Só o IP não serve: os pacientes da associação podem entrar todos pela
 * mesma rede (o mesmo IP) num encontro de grupo, e o limite de um bloquearia
 * os outros. Com o e-mail junto, quem erra a própria senha não atrapalha o
 * vizinho — e o ataque de força bruta contra uma conta continua limitado.
 */
export function chaveDaTentativa(req: { ip?: string; body?: unknown }): string {
  const corpo = req.body as { email?: unknown } | undefined;
  const email = typeof corpo?.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const ip = req.ip ?? 'desconhecido';
  return email ? `${ip}:${email}` : ip;
}

@Injectable()
export class LimiteTentativasGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return chaveDaTentativa(req);
  }
}
