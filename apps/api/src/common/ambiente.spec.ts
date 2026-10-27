import { expoeLinksDeTeste } from './ambiente';

describe('expoeLinksDeTeste', () => {
  it('should hide the links when NODE_ENV is not set, as on the published server', () => {
    expect(expoeLinksDeTeste(undefined)).toBe(false);
    expect(expoeLinksDeTeste('')).toBe(false);
  });

  it('should hide the links in production and in any unknown environment', () => {
    expect(expoeLinksDeTeste('production')).toBe(false);
    expect(expoeLinksDeTeste('staging')).toBe(false);
  });

  it('should show the links only when development or test is stated', () => {
    expect(expoeLinksDeTeste('development')).toBe(true);
    expect(expoeLinksDeTeste(' Test ')).toBe(true);
  });
});
