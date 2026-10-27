import { chaveDaTentativa } from './limite-por-minuto.guard';

describe('chaveDaTentativa', () => {
  it('should separate people on the same network by e-mail', () => {
    const mesmaRede = '200.150.10.1';
    expect(chaveDaTentativa({ ip: mesmaRede, body: { email: 'joao@x.com' } })).not.toBe(
      chaveDaTentativa({ ip: mesmaRede, body: { email: 'maria@x.com' } }),
    );
  });

  it('should count the same account the same way however the e-mail is typed', () => {
    expect(chaveDaTentativa({ ip: '1.1.1.1', body: { email: ' Joao@X.com ' } })).toBe(
      chaveDaTentativa({ ip: '1.1.1.1', body: { email: 'joao@x.com' } }),
    );
  });

  it('should fall back to the IP when the request has no e-mail', () => {
    expect(chaveDaTentativa({ ip: '1.1.1.1', body: { credential: 'token-do-google' } })).toBe(
      '1.1.1.1',
    );
    expect(chaveDaTentativa({ ip: '1.1.1.1', body: { email: 42 } })).toBe('1.1.1.1');
  });
});
