import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/lib/theme';

const receitas = [
  {
    nome: 'Bowl de frango com quinoa',
    tempo: '20 min',
    tags: ['Baixo IG', 'Proteína'],
    cor: colors.primarySoft,
    icon: 'restaurant-outline' as const,
  },
  {
    nome: 'Omelete de espinafre',
    tempo: '10 min',
    tags: ['Café'],
    cor: colors.successSoft,
    icon: 'egg-outline' as const,
  },
  {
    nome: 'Salada de grão-de-bico',
    tempo: '15 min',
    tags: ['Vegano', 'Fibras'],
    cor: colors.warningSoft,
    icon: 'leaf-outline' as const,
  },
];

export default function ReceitasScreen() {
  return (
    <ScreenContainer
      eyebrow="Sugestões"
      title="Receitas"
      subtitle="Pratos pensados para o seu controle glicêmico."
    >
      <View style={styles.list}>
        {receitas.map((r) => (
          <Card key={r.nome}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: r.cor }]}>
                <Ionicons name={r.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.nome}</Text>
                <View style={styles.meta}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{r.tempo}</Text>
                </View>
                <View style={styles.tagRow}>
                  {r.tags.map((t) => (
                    <View key={t} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.body, color: colors.text, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { ...typography.caption, color: colors.textMuted },
  tagRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  tag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: colors.primary },
});
