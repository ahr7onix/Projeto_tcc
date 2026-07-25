import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { getPlanoAtivo, type RefeicaoPlano } from '@/lib/api/planos';
import { colors, radius, spacing, typography } from '@/lib/theme';

type IconName = 'cafe-outline' | 'restaurant-outline' | 'leaf-outline' | 'moon-outline';
type Status = 'concluida' | 'agora' | 'pendente';

function iconeRefeicao(nome: string): IconName {
  const n = nome.toLowerCase();
  if (n.includes('café') || n.includes('cafe')) return 'cafe-outline';
  if (n.includes('almoço') || n.includes('almoco') || n.includes('jantar')) return 'restaurant-outline';
  if (n.includes('ceia') || n.includes('noite')) return 'moon-outline';
  return 'leaf-outline';
}

function minutos(horario: string): number {
  const [h, m] = horario.split(':').map(Number);
  return h * 60 + m;
}

function statusRefeicao(horario: string, agoraMin: number): Status {
  const inicio = minutos(horario);
  if (agoraMin >= inicio + 60) return 'concluida';
  if (agoraMin >= inicio - 30) return 'agora';
  return 'pendente';
}

function statusTint(status: Status) {
  if (status === 'concluida') return { bg: colors.successSoft, fg: colors.success, label: 'Concluída' };
  if (status === 'agora') return { bg: colors.primarySoft, fg: colors.primary, label: 'Agora' };
  return { bg: colors.surfaceAlt, fg: colors.textMuted, label: 'Pendente' };
}

function formatarPeriodo(inicio: string, fim: string | null): string {
  const fmt = (iso: string) => {
    const [ano, mes, dia] = iso.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  };
  return fim ? `${fmt(inicio)} a ${fmt(fim)}` : `Desde ${fmt(inicio)}`;
}

export default function AlimentacaoScreen() {
  const router = useRouter();

  const { data: plano, isLoading, isError, refetch } = useQuery({
    queryKey: ['plano-ativo'],
    queryFn: getPlanoAtivo,
  });

  const agoraMin = useMemo(() => {
    const agora = new Date();
    return agora.getHours() * 60 + agora.getMinutes();
  }, []);

  const refeicoes: RefeicaoPlano[] = plano?.refeicoes ?? [];
  const concluidas = refeicoes.filter(
    (r) => statusRefeicao(r.horario, agoraMin) === 'concluida',
  ).length;
  const total = refeicoes.length;

  return (
    <ScreenContainer
      eyebrow="Plano de hoje"
      title="Alimentação"
      subtitle="Acompanhe suas refeições e descubra receitas alinhadas com o seu plano."
    >
      {isLoading ? (
        <Card>
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.rowMuted}>Carregando seu plano...</Text>
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
      ) : !plano ? (
        <Card>
          <EmptyState
            icon="clipboard-outline"
            title="Nenhum plano alimentar ativo"
            message="Seu nutricionista ainda não criou um plano para você. Assim que ele for liberado, aparecerá aqui."
          />
        </Card>
      ) : (
        <>
          <Card>
            <View style={styles.planoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planoLabel}>Seu plano alimentar</Text>
                <Text style={styles.planoTitle}>
                  {formatarPeriodo(plano.dataInicio, plano.dataFim)}
                </Text>
                <Text style={styles.rowMuted}>Por {plano.nutricionistaNome}</Text>
              </View>
              <View style={styles.progressBox}>
                <Text style={styles.progressNum}>
                  {concluidas}/{total}
                </Text>
                <Text style={styles.progressLabel}>refeições</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: total ? `${(concluidas / total) * 100}%` : '0%' },
                ]}
              />
            </View>
          </Card>

          <Card title="Refeições de hoje">
            <View style={styles.list}>
              {refeicoes.map((r, i) => {
                const t = statusTint(statusRefeicao(r.horario, agoraMin));
                return (
                  <View key={r.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                    <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
                      <Ionicons name={iconeRefeicao(r.nome)} size={18} color={t.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{r.nome}</Text>
                      <Text style={styles.rowMuted}>{r.horario}</Text>
                      <Text style={styles.rowItens}>{r.itens}</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: t.bg }]}>
                      <Text style={[styles.tagText, { color: t.fg }]}>{t.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      )}

      <Pressable
        style={styles.cta}
        onPress={() => router.push('/(tabs)/alimentacao/conteudos')}
      >
        <Ionicons name="book-outline" size={18} color={colors.textInverse} />
        <Text style={styles.ctaText}>Conteúdos educativos</Text>
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
  center: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  retryText: { ...typography.body, color: colors.primary, fontWeight: '600' },

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
    alignItems: 'flex-start',
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
  rowItens: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
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
