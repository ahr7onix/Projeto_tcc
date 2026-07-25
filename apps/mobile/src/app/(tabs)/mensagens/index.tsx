import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { listarConversas } from '@/lib/api/mensagens';
import { colors, radius, spacing, typography } from '@/lib/theme';

function formatarQuando(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const horas = Math.floor(diff / 3600000);
  if (horas < 1) return 'agora';
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ontem' : `${dias}d`;
}

export default function MensagensScreen() {
  const router = useRouter();

  const { data: conversas, isLoading, isError, refetch } = useQuery({
    queryKey: ['conversas'],
    queryFn: listarConversas,
    refetchInterval: 30000,
  });

  return (
    <ScreenContainer
      eyebrow="Acompanhamento"
      title="Mensagens"
      subtitle="Fale com seu nutricionista sobre dúvidas e ajustes no plano."
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
      ) : !conversas?.length ? (
        <Card>
          <EmptyState
            icon="chatbubbles-outline"
            title="Nenhuma conversa"
            message="Assim que um nutricionista vincular você, a conversa aparecerá aqui."
          />
        </Card>
      ) : (
        <Card>
          {conversas.map((c, i) => (
            <Pressable
              key={c.contraparteId}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/mensagens/[id]',
                  params: { id: c.contraparteId, nome: c.contraparteNome },
                })
              }
              style={[styles.row, i > 0 && styles.rowDivider]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {c.contraparteNome.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{c.contraparteNome}</Text>
                <Text style={styles.previa} numberOfLines={1}>
                  {c.ultimaMensagem ?? 'Sem mensagens ainda'}
                </Text>
              </View>
              <View style={styles.direita}>
                <Text style={styles.quando}>{formatarQuando(c.ultimaEm)}</Text>
                {c.naoLidas > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{c.naoLidas}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </Card>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  nome: { ...typography.body, color: colors.text, fontWeight: '600' },
  previa: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  direita: { alignItems: 'flex-end', gap: 4 },
  quando: { ...typography.caption, color: colors.textMuted },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
});
