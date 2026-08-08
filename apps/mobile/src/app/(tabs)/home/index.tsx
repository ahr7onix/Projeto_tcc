import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataHoje() {
  const d = new Date();
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  return `${d.getDate()} de ${meses[d.getMonth()]}`;
}

const stats: {
  key: string;
  icon: IconName;
  value: string;
  label: string;
  accent: string;
  href: string;
}[] = [
  {
    key: 'glicemia',
    icon: 'water',
    value: '0',
    label: 'Glicemia',
    accent: '#C4B5FD',
    href: '/(tabs)/registros',
  },
  {
    key: 'refeicoes',
    icon: 'restaurant',
    value: '0',
    label: 'Refeições',
    accent: '#6EE7B7',
    href: '/(tabs)/alimentacao',
  },
  {
    key: 'media',
    icon: 'sparkles',
    value: '--',
    label: 'Média',
    accent: '#FCD34D',
    href: '/(tabs)/registros',
  },
];

const primaryActions: {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  href: string;
  tint: string;
}[] = [
  {
    key: 'glicemia',
    label: 'Glicemia',
    hint: 'Registrar agora',
    icon: 'water',
    href: '/(tabs)/registros/glicemia',
    tint: 'rgba(196, 181, 253, 0.22)',
  },
  {
    key: 'refeicao',
    label: 'Refeição',
    hint: 'Anotar comida',
    icon: 'restaurant',
    href: '/(tabs)/registros/refeicao',
    tint: 'rgba(110, 231, 183, 0.18)',
  },
];

const destinations: {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  accent: string;
}[] = [
  {
    key: 'alimentacao',
    label: 'Alimentação',
    icon: 'nutrition-outline',
    href: '/(tabs)/alimentacao',
    accent: '#6EE7B7',
  },
  {
    key: 'registros',
    label: 'Registros',
    icon: 'add-circle-outline',
    href: '/(tabs)/registros',
    accent: '#C4B5FD',
  },
  {
    key: 'saude',
    label: 'Saúde',
    icon: 'heart-outline',
    href: '/(tabs)/saude',
    accent: '#F9A8D4',
  },
  {
    key: 'mensagens',
    label: 'Mensagens',
    icon: 'chatbubbles-outline',
    href: '/(tabs)/mensagens',
    accent: '#93C5FD',
  },
];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const primeiroNome = (user?.nome ?? 'Visitante').split(' ')[0];

  return (
    <View style={styles.root}>
      <View style={styles.bgBlobA} />
      <View style={styles.bgBlobB} />
      <View style={styles.bgBlobC} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header fixo — perfil sempre à mão, sem competir com o scroll */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>NutriCare</Text>
            <Text style={styles.date}>{dataHoje()}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.avatar,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/(tabs)/perfil')}
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
            hitSlop={8}
          >
            <Text style={styles.avatarText}>
              {(user?.nome ?? '?').charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces
          decelerationRate="normal"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.hello}>
              {saudacao()}, {primeiroNome}
            </Text>
            <Text style={styles.heroSub}>O que você quer fazer agora?</Text>
          </View>

          {/* Ações principais — primeiro no fluxo, alvos grandes */}
          <View style={styles.primaryRow}>
            {primaryActions.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => router.push(a.href as never)}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                style={({ pressed }) => [
                  styles.primaryCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.primaryIcon, { backgroundColor: a.tint }]}>
                  <Ionicons name={a.icon} size={24} color={colors.textInverse} />
                </View>
                <Text style={styles.primaryLabel}>{a.label}</Text>
                <Text style={styles.primaryHint}>{a.hint}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Ir para</Text>
          <View style={styles.destGrid}>
            {[0, 1].map((row) => (
              <View key={row} style={styles.destRow}>
                {destinations.slice(row * 2, row * 2 + 2).map((d) => (
                  <Pressable
                    key={d.key}
                    onPress={() => router.push(d.href as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ir para ${d.label}`}
                    style={({ pressed }) => [
                      styles.destCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.destIcon,
                        { backgroundColor: `${d.accent}22` },
                      ]}
                    >
                      <Ionicons name={d.icon} size={20} color={d.accent} />
                    </View>
                    <Text style={styles.destLabel}>{d.label}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="rgba(255,255,255,0.35)"
                    />
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Hoje</Text>
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => router.push(s.href as never)}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${s.label}`}
                style={({ pressed }) => [
                  styles.statCard,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: `${s.accent}22` },
                  ]}
                >
                  <Ionicons name={s.icon} size={16} color={s.accent} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="heart" size={14} color="#F9A8D4" />
            <Text style={styles.tipText} numberOfLines={2}>
              Beber água e registrar a glicemia ajudam o seu acompanhamento.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Atividade recente</Text>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Ainda sem registros hoje</Text>
            <Text style={styles.emptyText}>
              Use os atalhos acima — tudo fica a um toque.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable
                onPress={() =>
                  router.push('/(tabs)/registros/glicemia' as never)
                }
                style={({ pressed }) => [
                  styles.emptyBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Registrar glicemia"
              >
                <Ionicons name="water" size={16} color={colors.textInverse} />
                <Text style={styles.emptyBtnText}>Glicemia</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push('/(tabs)/registros/refeicao' as never)
                }
                style={({ pressed }) => [
                  styles.emptyBtn,
                  styles.emptyBtnAlt,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Registrar refeição"
              >
                <Ionicons
                  name="restaurant"
                  size={16}
                  color={colors.textInverse}
                />
                <Text style={styles.emptyBtnText}>Refeição</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.authBg1,
    overflow: 'hidden',
  },
  bgBlobA: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(108, 34, 189, 0.38)',
    top: -90,
    left: -70,
  },
  bgBlobB: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(249, 168, 212, 0.12)',
    top: 180,
    right: -80,
  },
  bgBlobC: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(110, 231, 183, 0.08)',
    bottom: 40,
    left: -40,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(26, 11, 46, 0.72)',
    zIndex: 2,
  },
  brandBlock: { gap: 2 },
  brand: {
    ...typography.eyebrow,
    color: colors.authBrand,
    letterSpacing: 2.2,
    fontSize: 11,
  },
  date: {
    ...typography.caption,
    color: colors.authMuted,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.textInverse,
    fontSize: 16,
  },
  scrollView: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl + 20,
    gap: spacing.md,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  hero: { gap: 4, marginBottom: spacing.xs },
  hello: {
    ...typography.h1,
    color: colors.textInverse,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  heroSub: {
    ...typography.body,
    color: colors.authMuted,
    fontSize: 14,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryCard: {
    flex: 1,
    minHeight: 118,
    backgroundColor: colors.authGlass,
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: 20,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
    gap: 6,
  },
  primaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  primaryLabel: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 15,
  },
  primaryHint: {
    ...typography.caption,
    color: colors.authMuted,
    fontSize: 12,
  },
  sectionLabel: {
    ...typography.eyebrow,
    color: colors.authFocus,
    letterSpacing: 1.2,
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
  },
  destGrid: { gap: spacing.sm },
  destRow: { flexDirection: 'row', gap: spacing.sm },
  destCard: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.authGlass,
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  destIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destLabel: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.authGlass,
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    ...typography.h2,
    color: colors.textInverse,
    fontSize: 20,
  },
  statLabel: {
    ...typography.caption,
    color: colors.authMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(249, 168, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 168, 212, 0.22)',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  tipText: {
    ...typography.caption,
    color: colors.authMuted,
    lineHeight: 18,
    flex: 1,
  },
  emptyCard: {
    backgroundColor: colors.authGlass,
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.authMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  emptyBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(162, 82, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.35)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },
  emptyBtnAlt: {
    backgroundColor: 'rgba(110, 231, 183, 0.18)',
    borderColor: 'rgba(110, 231, 183, 0.28)',
  },
  emptyBtnText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
