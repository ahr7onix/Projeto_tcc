import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function executar(erro: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status, json, headersSent: false }),
      getRequest: () => ({ method: 'GET', url: '/x', requestId: 'r1' }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(erro, host);
  return { status, json };
}

describe('AllExceptionsFilter', () => {
  it('should answer 400 for an invalid id (postgres 22P02)', () => {
    const { status } = executar(Object.assign(new Error('x'), { code: '22P02' }));
    expect(status).toHaveBeenCalledWith(400);
  });

  it('should answer 409 for a duplicate key (23505)', () => {
    const { status } = executar(Object.assign(new Error('x'), { code: '23505' }));
    expect(status).toHaveBeenCalledWith(409);
  });

  it('should answer 413 for a body that is too large', () => {
    const { status } = executar(
      Object.assign(new Error('too large'), { status: 413, type: 'entity.too.large' }),
    );
    expect(status).toHaveBeenCalledWith(413);
  });

  it('should keep 500 for an unexpected error', () => {
    const { status } = executar(new Error('boom'));
    expect(status).toHaveBeenCalledWith(500);
  });
});
