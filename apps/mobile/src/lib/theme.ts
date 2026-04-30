export const colors = {
  primary: '#2E7D5B',
  primaryDark: '#1F5A40',
  primaryLight: '#7FC8A9',
  accent: '#F4A261',
  background: '#FFFFFF',
  backgroundAlt: '#F5F7F8',
  surface: '#FFFFFF',
  border: '#E2E5E8',
  text: '#1A1F24',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
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
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;
