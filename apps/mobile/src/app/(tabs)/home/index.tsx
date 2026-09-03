import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlicemicStatusBanner } from '@/components/GlicemicStatusBanner';
import { useAccessibleMode } from '@/hooks/use-accessible-mode';
import { useGlycemicWatch } from '@/hooks/use-glycemic-watch';
import { listarRegistros, type RegistroItem } from '@/lib/api/registros';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function ehHoje(iso: string): boolean {
  const d = new Date(iso);
  const hoje = new Date();
  return (
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear()
  );
}

function horaCurta(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

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

const statsMeta: {
  key: 'glicemia' | 'refeicoes' | 'media';
  icon: IconName;
  label: string;
  fg: string;
  bg: string;
  href: string;
}[] = [
  {
    key: 'glicemia',
    icon: 'water',
    label: 'Glicemia',
    fg: colors.primary,
    bg: colors.primarySoft,
    href: '/(tabs)/registros',
  },
  {
    key: 'refeicoes',
    icon: 'restaurant',
    label: 'Refeições',
    fg: colors.success,
    bg: colors.successSoft,
    href: '/(tabs)/alimentacao',
  },
  {
    key: 'media',
    icon: 'sparkles',
    label: 'Média',
    fg: colors.warning,
    bg: colors.warningSoft,
    href: '/(tabs)/registros',
  },
];

const primaryActions: {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  href: string;
  fg: string;
  bg: string;
}[] = [
  {
    key: 'glicemia',
    label: 'Glicemia',
    hint: 'Registrar agora',
    icon: 'water',
    href: '/(tabs)/registros/glicemia',
    fg: colors.primary,
    bg: colors.primarySoft,
  },
  {
    key: 'refeicao',
    label: 'Refeição',
    hint: 'Anotar comida',
    icon: 'restaurant',
    href: '/(tabs)/registros/refeicao',
    fg: colors.success,
    bg: colors.successSoft,
  },
];

const destinations: {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  fg: string;
  bg: string;
}[] = [
  {
    key: 'alimentacao',
    label: 'Alimentação',
    icon: 'nutrition-outline',
    href: '/(tabs)/alimentacao',
    fg: colors.success,
    bg: colors.successSoft,
  },
  {
    key: 'registros',
    label: 'Registros',
    icon: 'add-circle-outline',
    href: '/(tabs)/registros',
    fg: colors.primary,
    bg: colors.primarySoft,
  },
  {
    key: 'saude',
    label: 'Saúde',
    icon: 'heart-outline',
    href: '/(tabs)/saude',
    fg: colors.danger,
    bg: colors.dangerSoft,
  },
  {
    key: 'mensagens',
    label: 'Mensagens',
    icon: 'chatbubbles-outline',
    href: '/(tabs)/mensagens',
    fg: colors.primary,
    bg: colors.primarySoft,
  },
];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const primeiroNome = (user?.nome ?? 'Visitante').split(' ')[0];
  const { isSimplified } = useAccessibleMode();

  useGlycemicWatch();

  const { data: registrosData } = useQuery({
    queryKey: ['registros', 7],
    queryFn: () => listarRegistros(7),
  });

  const registrosHoje = useMemo(() => {
    const todos = registrosData?.data ?? [];
    return todos.filter((r) => ehHoje(r.dataHora));
  }, [registrosData]);

  const stats = useMemo(() => {
    const glicemiaHoje = registrosHoje.filter((r) => r.tipo === 'glicemia');
    const refeicoesHoje = registrosHoje.filter((r) => r.tipo === 'refeicao');
    const media = glicemiaHoje.length
      ? Math.round(
          glicemiaHoje.reduce((soma, r) => soma + (r.valor ?? 0), 0) / glicemiaHoje.length,
        )
      : null;

    const valores: Record<'glicemia' | 'refeicoes' | 'media', string> = {
      glicemia: String(glicemiaHoje.length),
      refeicoes: String(refeicoesHoje.length),
      media: media != null ? String(media) : '--',
    };

    return statsMeta.map((s) => ({ ...s, value: valores[s.key] }));
  }, [registrosHoje]);

  const heroSub = registrosHoje.length
    ? `Você já registrou ${registrosHoje.length} ${registrosHoje.length === 1 ? 'item' : 'itens'} hoje. Continue assim!`
    : 'O que você quer fazer agora?';

  return (
    <View style={styles.root}>
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
            <Text style={styles.heroSub}>{heroSub}</Text>
          </View>

          <GlicemicStatusBanner />

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
                  isSimplified && styles.primaryCardGrande,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.primaryIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={isSimplified ? 30 : 24} color={a.fg} />
                </View>
                <Text style={[styles.primaryLabel, isSimplified && styles.primaryLabelGrande]}>
                  {a.label}
                </Text>
                <Text style={[styles.primaryHint, isSimplified && styles.primaryHintGrande]}>
                  {a.hint}
                </Text>
              </Pressable>
            ))}
          </View>

          {!isSimplified && (
            <>
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
                          style={[styles.destIcon, { backgroundColor: d.bg }]}
                        >
                          <Ionicons name={d.icon} size={20} color={d.fg} />
                        </View>
                        <Text style={styles.destLabel}>{d.label}</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.textMuted}
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
                      style={[styles.statIcon, { backgroundColor: s.bg }]}
                    >
                      <Ionicons name={s.icon} size={16} color={s.fg} />
                    </View>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.tipCard}>
                <Ionicons name="heart" size={14} color={colors.primary} />
                <Text style={styles.tipText} numberOfLines={2}>
                  Beber água e registrar a glicemia ajudam o seu acompanhamento.
                </Text>
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>Atividade recente</Text>
          {registrosHoje.length === 0 ? (
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
          ) : (
            <View style={styles.activityCard}>
              {registrosHoje.slice(0, 4).map((item: RegistroItem, i) => (
                <View
                  key={`${item.tipo}-${item.id}`}
                  style={[styles.activityRow, i > 0 && styles.activityDivider]}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      {
                        backgroundColor:
                          item.tipo === 'glicemia'
                            ? colors.primarySoft
                            : colors.successSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.tipo === 'glicemia' ? 'water' : 'restaurant'}
                      size={16}
                      color={item.tipo === 'glicemia' ? colors.primary : colors.success}
                    />
                  </View>
                  <Text style={styles.activityText} numberOfLines={1}>
                    {item.tipo === 'glicemia'
                      ? `Glicemia: ${item.valor} mg/dL`
                      : (item.descricao ?? 'Refeição')}
                  </Text>
                  <Text style={styles.activityHora}>{horaCurta(item.dataHora)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    zIndex: 2,
  },
  brandBlock: { gap: 2 },
  brand: {
    ...typography.eyebrow,
    color: colors.primary,
    letterSpacing: 1.6,
    fontSize: 12,
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.primary,
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
    color: colors.text,
  },
  heroSub: {
    ...typography.body,
    color: colors.textSoft,
    fontSize: 14,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryCard: {
    flex: 1,
    minHeight: 118,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
    gap: 6,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 1,
  },
  primaryCardGrande: { minHeight: 148, paddingVertical: spacing.xl },
  primaryLabelGrande: { fontSize: 19 },
  primaryHintGrande: { fontSize: 14 },
  primaryIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  primaryLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  primaryHint: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  sectionLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
    letterSpacing: 1,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 1,
  },
  destIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 1,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    fontSize: 20,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  tipText: {
    ...typography.caption,
    color: colors.textSoft,
    lineHeight: 18,
    flex: 1,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 1,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
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
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  emptyBtnAlt: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  emptyBtnText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  activityDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    ...typography.caption,
    color: colors.textSoft,
    fontWeight: '600',
    flex: 1,
  },
  activityHora: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
});
