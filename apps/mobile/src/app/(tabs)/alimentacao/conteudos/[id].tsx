import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { buscarConteudo } from '@/lib/api/conteudos';
import { colors, spacing, typography } from '@/lib/theme';

export default function ConteudoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: conteudo, isLoading, isError } = useQuery({
    queryKey: ['conteudo', id],
    queryFn: () => buscarConteudo(String(id)),
  });

  return (
    <ScreenContainer
      eyebrow="Conteúdo"
      title={conteudo?.titulo ?? 'Carregando...'}
      subtitle={conteudo?.resumo ?? undefined}
      showBack
    >
      {isLoading ? (
        <Card>
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </Card>
      ) : isError || !conteudo ? (
        <Card>
          <EmptyState
            icon="alert-circle-outline"
            title="Conteúdo indisponível"
            message="Este material pode ter sido removido ou despublicado."
          />
        </Card>
      ) : (
        <Card>
          <Text style={styles.corpo}>{conteudo.conteudo}</Text>
          {conteudo.autorNome ? (
            <Text style={styles.autor}>Publicado por {conteudo.autorNome}</Text>
          ) : null}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  corpo: { ...typography.body, color: colors.text, lineHeight: 23 },
  autor: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
