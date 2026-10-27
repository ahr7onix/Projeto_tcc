import { HttpException } from '@nestjs/common';
import { LimiteTentativas } from './limite-tentativas';

describe('LimiteTentativas', () => {
  it('should block after the maximum number of failures', () => {
    const limite = new LimiteTentativas(3, 1000);
    for (let i = 0; i < 3; i++) {
      limite.verificar('a');
      limite.falhou('a');
    }
    expect(() => limite.verificar('a')).toThrow(HttpException);
    expect(() => limite.verificar('b')).not.toThrow();
  });

  it('should clear the counter after a success', () => {
    const limite = new LimiteTentativas(2, 1000);
    limite.falhou('a');
    limite.falhou('a');
    limite.sucesso('a');
    expect(() => limite.verificar('a')).not.toThrow();
  });

  it('should release the key when the window expires', () => {
    jest.useFakeTimers();
    const limite = new LimiteTentativas(1, 1000);
    limite.falhou('a');
    expect(() => limite.verificar('a')).toThrow(HttpException);
    jest.advanceTimersByTime(1500);
    expect(() => limite.verificar('a')).not.toThrow();
    jest.useRealTimers();
  });
});
