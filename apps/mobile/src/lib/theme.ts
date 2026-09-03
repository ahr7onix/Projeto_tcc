/*
 * Identidade visual do app do paciente.
 *
 * É a mesma identidade do painel web do nutricionista (web_nutricionista):
 * paleta clara de ambiente clínico — fundo cinza muito claro, superfícies
 * brancas, azul como cor de ação e verde reservado ao que está saudável.
 * A separação entre elementos vem da borda de 1px, não do relevo; sombra
 * forte não é usada.
 *
 * Os nomes das chaves são mantidos de propósito: as telas continuam lendo
 * `colors.primary`, `colors.surface` e companhia, então trocar a identidade
 * é trocar este arquivo. O antigo tema escuro "glass" das telas de entrada
 * foi removido — tudo segue a identidade clara do painel.
 */
export const colors = {
  // Azul clínico: ações, links e a tela em que o usuário está.
  primary: '#005EB8',
  primaryDark: '#00437F',
  primaryLight: '#3B86CC',
  primarySoft: '#E7F0F9',
  // Verde: acento de saúde, não cor de marca.
  accent: '#047857',
  background: '#F4F6F9',
  backgroundAlt: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4F8',
  border: '#E2E7EE',
  borderStrong: '#CBD3DF',
  text: '#101828',
  textSoft: '#475467',
  textMuted: '#78829D',
  textInverse: '#FFFFFF',
  success: '#047857',
  successSoft: '#E6F4EF',
  warning: '#B45309',
  warningSoft: '#FBF1E3',
  danger: '#B42318',
  dangerSoft: '#FCEBEA',
  info: '#005EB8',
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
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.4 },
  h2: { fontSize: 21, fontWeight: '600' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
} as const;

export const shadow = {
  // Sombras discretas: a separação vem da borda, não do relevo.
  card: '0 1px 2px rgba(16, 24, 40, 0.04)',
  raised: '0 4px 12px rgba(16, 24, 40, 0.08)',
  brand: '0 1px 2px rgba(16, 24, 40, 0.06)',
  brandDeep: '0 4px 12px rgba(16, 24, 40, 0.08)',
} as const;
