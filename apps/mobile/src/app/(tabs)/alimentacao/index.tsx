import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function AlimentacaoScreen() {
  const router = useRouter();

  return (
    <ScreenContainer title="Alimentação" subtitle="Plano e receitas">
      <Card title="Plano alimentar de hoje">
        <Text style={styles.muted}>Nenhum plano ativo no momento.</Text>
      </Card>

      <Pressable
        style={styles.cta}
        onPress={() => router.push('/(tabs)/alimentacao/receitas')}
      >
        <Text style={styles.ctaText}>Ver receitas</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { ...typography.caption, color: colors.textMuted },
  cta: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.textInverse, fontWeight: '600', fontSize: 15 },
});
