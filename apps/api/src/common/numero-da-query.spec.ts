import { diasDaQuery, limiteDaQuery } from './numero-da-query';

describe('diasDaQuery / limiteDaQuery', () => {
  it('should keep a valid positive integer', () => {
    expect(diasDaQuery('30')).toBe(30);
    expect(limiteDaQuery('50')).toBe(50);
  });

  it.each([undefined, '', 'abc', '0', '-5', '2.5', 'NaN', 'Infinity'])(
    'should ignore %s so the service uses its default',
    (valor) => {
      expect(diasDaQuery(valor)).toBeUndefined();
      expect(limiteDaQuery(valor)).toBeUndefined();
    },
  );

  it('should cap huge numbers instead of sending them to the database', () => {
    expect(diasDaQuery('99999999999')).toBe(3650);
    expect(limiteDaQuery('99999999999')).toBe(1000);
  });
});
