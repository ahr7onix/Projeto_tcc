export const colors = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#A78BFA',
  primarySoft: '#F3EEFF',
  accent: '#F59E0B',
  background: '#FFFFFF',
  backgroundAlt: '#FAFAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F4F8',
  border: '#ECECF1',
  borderStrong: '#D8D8E0',
  text: '#0B0B17',
  textSoft: '#3B3A52',
  textMuted: '#8B8AA0',
  textInverse: '#FFFFFF',
  success: '#10B981',
  successSoft: '#E7F8F2',
  warning: '#F59E0B',
  warningSoft: '#FEF4E2',
  danger: '#EF4444',
  dangerSoft: '#FCEAEA',
  info: '#7C3AED',
  /** Auth FEZ (painel web) */
  authBg0: '#0B001A',
  authBg1: '#1A0B2E',
  authBg2: '#2D124D',
  authGlass: 'rgba(45, 18, 77, 0.45)',
  authBorder: 'rgba(255, 255, 255, 0.12)',
  authInput: 'rgba(255, 255, 255, 0.06)',
  authBrand: 'rgba(255, 255, 255, 0.55)',
  authMuted: 'rgba(255, 255, 255, 0.65)',
  authFocus: '#A252FF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.6 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
} as const;

export const shadow = {
  card: '0 6px 18px rgba(11, 11, 23, 0.04)',
  brand: '0 12px 30px rgba(124, 58, 237, 0.35)',
  brandDeep: '0 10px 24px rgba(91, 33, 182, 0.45)',
} as const;
