import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Filtro = 'tudo' | 'glicemia' | 'refeicao';

const filtros: { key: Filtro; label: string }[] = [
  { key: 'tudo', label: 'Tudo' },
  { key: 'glicemia', label: 'Glicemia' },
  { key: 'refeicao', label: 'Refeições' },
];

export default function RegistrosScreen() {
  const [filtro, setFiltro] = useState<Filtro>('tudo');

  return (
    <ScreenContainer
      eyebrow="Histórico"
      title="Registros"
      subtitle="Acompanhe suas medições de glicemia e refeições."
    >
      <View style={styles.actions}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push('/(tabs)/registros/glicemia')}
        >
          <Ionicons name="water" size={18} color={colors.textInverse} />
          <Text style={styles.actionText}>Glicemia</Text>
        </Pressable>

        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push('/(tabs)/registros/refeicao')}
        >
          <Ionicons name="restaurant" size={18} color={colors.textInverse} />
          <Text style={styles.actionText}>Refeição</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {filtros.map((f) => {
          const active = filtro === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFiltro(f.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="water-outline" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Glicemia · 7d</Text>
          </View>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIcon, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="restaurant-outline" size={16} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Refeições · 7d</Text>
          </View>
        </View>
      </View>

      <Card title="Linha do tempo">
        <EmptyState
          icon="hourglass-outline"
          title="Sem registros ainda"
          message="Comece registrando sua primeira medição de glicemia ou refeição."
        />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  actionText: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.textInverse },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted },
});
