import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatTile } from '@/components/StatTile';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataHoje() {
  const d = new Date();
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  return `${d.getDate()} de ${meses[d.getMonth()]}`;
}

const quickActions = [
  { key: 'glicemia', label: 'Registrar glicemia', icon: 'water-outline' as const, href: '/(tabs)/registros' },
  { key: 'refeicao', label: 'Registrar refeição', icon: 'restaurant-outline' as const, href: '/(tabs)/alimentacao' },
] as const;

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const primeiroNome = (user?.nome ?? 'Visitante').split(' ')[0];

  return (
    <ScreenContainer
      eyebrow={dataHoje()}
      title={`${saudacao()}, ${primeiroNome}`}
      subtitle="Aqui está um panorama da sua saúde hoje."
      headerRight={
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.nome ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      }
    >
      <View style={styles.statsRow}>
        <StatTile icon="water-outline" value="0" label="Glicemia hoje" tint="primary" />
        <StatTile icon="restaurant-outline" value="0" label="Refeições" tint="success" />
        <StatTile icon="trending-up-outline" value="--" label="Média" tint="warning" />
      </View>

      <Card title="Ações rápidas">
        <View style={styles.actionsList}>
          {quickActions.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => router.push(a.href as never)}
              style={styles.action}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </Card>

      <Card title="Atividade recente">
        <EmptyState
          icon="time-outline"
          title="Nada por aqui ainda"
          message="Seus registros e medições vão aparecer aqui assim que você começar."
        />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { ...typography.h3, color: colors.textInverse },

  statsRow: { flexDirection: 'row', gap: spacing.md },

  actionsList: { gap: spacing.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
});
