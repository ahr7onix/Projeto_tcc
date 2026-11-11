import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { SessoesService } from '../sessoes/sessoes.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'paciente' | 'nutricionista' | 'administrador';
  /** Sessão (linha de `refresh_token`) que emitiu o token. */
  sid?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessoes: SessoesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = auth.slice(7);
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Sessão expirada');
    }

    // Sair, trocar a senha ou desativar a conta encerra a sessão, e o token
    // dela para de valer na hora, não só quando vence. Token sem `sid` é de
    // antes desta conferência: o painel e o app renovam sozinhos com o 401.
    if (!payload.sid || !(await this.sessoes.aberta(payload.sid, payload.sub))) {
      throw new UnauthorizedException('Sessão expirada');
    }

    (req as any).user = payload;
    return true;
  }
}
