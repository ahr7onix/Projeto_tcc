import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/lib/theme';

const refeicoes = [
  { nome: 'Café da manhã', horario: '07:30', status: 'feita', icon: 'cafe-outline' as const },
  { nome: 'Almoço', horario: '12:00', status: 'agora', icon: 'restaurant-outline' as const },
  { nome: 'Lanche', horario: '16:00', status: 'pendente', icon: 'leaf-outline' as const },
  { nome: 'Jantar', horario: '19:30', status: 'pendente', icon: 'moon-outline' as const },
];

function statusTint(status: string) {
  if (status === 'feita') return { bg: colors.successSoft, fg: colors.success, label: 'Feita' };
  if (status === 'agora') return { bg: colors.primarySoft, fg: colors.primary, label: 'Agora' };
  return { bg: colors.surfaceAlt, fg: colors.textMuted, label: 'Pendente' };
}

export default function AlimentacaoScreen() {
  const router = useRouter();
  const feitas = refeicoes.filter((r) => r.status === 'feita').length;
  const total = refeicoes.length;

  return (
    <ScreenContainer
      eyebrow="Plano de hoje"
      title="Alimentação"
      subtitle="Acompanhe suas refeições e descubra receitas alinhadas com o seu plano."
    >
      <Card>
        <View style={styles.planoHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planoLabel}>Seu plano alimentar</Text>
            <Text style={styles.planoTitle}>Plano padrão · controle glicêmico</Text>
          </View>
          <View style={styles.progressBox}>
            <Text style={styles.progressNum}>{feitas}/{total}</Text>
            <Text style={styles.progressLabel}>refeições</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(feitas / total) * 100}%` },
            ]}
          />
        </View>
      </Card>

      <Card title="Refeições de hoje">
        <View style={styles.list}>
          {refeicoes.map((r, i) => {
            const t = statusTint(r.status);
            return (
              <View
                key={r.nome}
                style={[styles.row, i > 0 && styles.rowDivider]}
              >
                <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
                  <Ionicons name={r.icon} size={18} color={t.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.nome}</Text>
                  <Text style={styles.rowMuted}>{r.horario}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: t.bg }]}>
                  <Text style={[styles.tagText, { color: t.fg }]}>{t.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Pressable
        style={styles.cta}
        onPress={() => router.push('/(tabs)/alimentacao/receitas')}
      >
        <Ionicons name="book-outline" size={18} color={colors.textInverse} />
        <Text style={styles.ctaText}>Explorar receitas</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
      </Pressable>

      <Card title="Restrições">
        <EmptyState
          icon="alert-circle-outline"
          title="Nenhuma restrição cadastrada"
          message="Avise seu nutricionista sobre alergias ou intolerâncias para personalizar o plano."
        />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  planoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  planoLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  planoTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  progressBox: { alignItems: 'flex-end' },
  progressNum: { ...typography.h2, color: colors.primary },
  progressLabel: { ...typography.caption, color: colors.textMuted },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },

  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  rowMuted: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 11, fontWeight: '700' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    boxShadow: '0 10px 24px rgba(91, 33, 182, 0.45)',
    elevation: 6,
  },
  ctaText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
