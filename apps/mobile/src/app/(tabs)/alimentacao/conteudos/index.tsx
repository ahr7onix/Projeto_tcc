import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { listarConteudos } from '@/lib/api/conteudos';
import { colors, radius, spacing, typography } from '@/lib/theme';

const CATEGORIA_ICONE: Record<string, 'nutrition-outline' | 'fitness-outline' | 'medkit-outline' | 'book-outline'> = {
  alimentacao: 'nutrition-outline',
  exercicio: 'fitness-outline',
  medicamento: 'medkit-outline',
  geral: 'book-outline',
};

export default function ConteudosScreen() {
  const router = useRouter();
  const { data: conteudos, isLoading, isError, refetch } = useQuery({
    queryKey: ['conteudos'],
    queryFn: () => listarConteudos(),
  });

  return (
    <ScreenContainer
      eyebrow="Educação"
      title="Conteúdos"
      subtitle="Materiais preparados pela equipe para apoiar seu controle do diabetes."
      showBack
    >
      {isLoading ? (
        <Card>
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </Card>
      ) : isError ? (
        <Card>
          <EmptyState
            icon="cloud-offline-outline"
            title="Não foi possível carregar"
            message="Verifique sua conexão e tente novamente."
          />
          <Pressable style={styles.retry} onPress={() => refetch()}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </Card>
      ) : !conteudos?.length ? (
        <Card>
          <EmptyState
            icon="book-outline"
            title="Nenhum conteúdo publicado"
            message="Assim que a equipe publicar materiais educativos, eles aparecerão aqui."
          />
        </Card>
      ) : (
        conteudos.map((c) => (
          <Pressable
            key={c.id}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/alimentacao/conteudos/[id]',
                params: { id: c.id },
              })
            }
          >
            <Card>
              <View style={styles.header}>
                <View style={styles.iconBox}>
                  <Ionicons
                    name={CATEGORIA_ICONE[c.categoria] ?? 'book-outline'}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.titulo}>{c.titulo}</Text>
                  <Text style={styles.categoria}>{c.categoria}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              {c.resumo ? <Text style={styles.resumo}>{c.resumo}</Text> : null}
            </Card>
          </Pressable>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  retryText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { ...typography.body, color: colors.text, fontWeight: '700' },
  categoria: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  resumo: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
});
