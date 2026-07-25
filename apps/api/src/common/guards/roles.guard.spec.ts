import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { JwtPayload } from './jwt.guard';

function criarContexto(user?: JwtPayload): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function criarGuard(rolesExigidas?: string[]) {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockReturnValue(rolesExigidas as never);
  return new RolesGuard(reflector);
}

const nutricionista: JwtPayload = {
  sub: '1',
  email: 'ana@nutri.com',
  role: 'nutricionista',
};
const paciente: JwtPayload = {
  sub: '2',
  email: 'joao@paciente.com',
  role: 'paciente',
};

describe('RolesGuard', () => {
  it('should allow access when no role is required', () => {
    const guard = criarGuard(undefined);
    expect(guard.canActivate(criarContexto(paciente))).toBe(true);
  });

  it('should allow access when the user role matches', () => {
    const guard = criarGuard(['nutricionista']);
    expect(guard.canActivate(criarContexto(nutricionista))).toBe(true);
  });

  it('should throw when the user role does not match', () => {
    const guard = criarGuard(['nutricionista']);
    expect(() => guard.canActivate(criarContexto(paciente))).toThrow(
      ForbiddenException,
    );
  });

  it('should throw when there is no authenticated user', () => {
    const guard = criarGuard(['nutricionista']);
    expect(() => guard.canActivate(criarContexto(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
