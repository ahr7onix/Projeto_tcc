import { BadRequestException } from '@nestjs/common';
import { normalizarDataNascimento } from './data-nascimento';

describe('normalizarDataNascimento', () => {
  it('should convert DD/MM/AAAA to ISO', () => {
    expect(normalizarDataNascimento('12/04/1985')).toBe('1985-04-12');
  });

  it('should keep a valid ISO date', () => {
    expect(normalizarDataNascimento('1990-05-10')).toBe('1990-05-10');
  });

  it('should return null when empty', () => {
    expect(normalizarDataNascimento(undefined)).toBeNull();
    expect(normalizarDataNascimento('')).toBeNull();
  });

  it.each(['31/02/2000', 'lixo', '2099-01-01', '1800-01-01'])(
    'should refuse %s',
    (valor) => {
      expect(() => normalizarDataNascimento(valor)).toThrow(BadRequestException);
    },
  );
});
