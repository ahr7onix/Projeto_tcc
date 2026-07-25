import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { listarRegistros, type RegistroItem } from '@/lib/api/registros';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Filtro = 'tudo' | 'glicemia' | 'refeicao';

const filtros: { key: Filtro; label: string }[] = [
  { key: 'tudo', label: 'Tudo' },
  { key: 'glicemia', label: 'Glicemia' },
  { key: 'refeicao', label: 'Refeições' },
];

const DIAS_HISTORICO = 30;

const MOMENTOS: Record<string, string> = {
  jejum: 'Jejum',
  pre_prandial: 'Pré-refeição',
  pos_prandial: 'Pós-refeição',
  antes_dormir: 'Antes de dormir',
  madrugada: 'Madrugada',
  aleatorio: 'Aleatório',
};

const TIPOS_REFEICAO: Record<string, string> = {
  cafe_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
};

/** Cor da bolinha do registro: verde/amarelo/vermelho conforme o alerta da API. */
function tintDoAlerta(severidade?: string) {
  if (severidade === 'critico') return { bg: colors.dangerSoft, fg: colors.danger };
  if (severidade === 'atencao') return { bg: colors.warningSoft, fg: colors.warning };
  return { bg: colors.successSoft, fg: colors.success };
}

function formatarQuando(iso: string): string {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  const hoje = new Date();
  const mesmoDia =
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear();

  return mesmoDia ? `Hoje, ${hora}:${min}` : `${dia}/${mes}, ${hora}:${min}`;
}

function LinhaRegistro({ item }: { item: RegistroItem }) {
  const glicemia = item.tipo === 'glicemia';
  const tint = glicemia
    ? tintDoAlerta(item.alerta?.severidade)
    : { bg: colors.primarySoft, fg: colors.primary };

  const titulo = glicemia
    ? `${item.valor} mg/dL`
    : (item.descricao ?? 'Refeição');

  const detalhe = glicemia
    ? (MOMENTOS[item.momento ?? ''] ?? item.momento ?? '')
    : [
        TIPOS_REFEICAO[item.tipoRefeicao ?? ''] ?? item.tipoRefeicao,
        item.carboidratos != null ? `${item.carboidratos} g de carboidrato` : null,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <View style={styles.registro}>
      <View style={[styles.registroIcon, { backgroundColor: tint.bg }]}>
        <Ionicons
          name={glicemia ? 'water' : 'restaurant'}
          size={16}
          color={tint.fg}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.registroTitulo}>{titulo}</Text>
        <Text style={styles.registroDetalhe}>
          {[detalhe, formatarQuando(item.dataHora)].filter(Boolean).join(' · ')}
        </Text>
        {glicemia && item.alerta && item.alerta.severidade !== 'normal' ? (
          <Text style={[styles.registroAlerta, { color: tint.fg }]}>
            {item.alerta.mensagem}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function RegistrosScreen() {
  const [filtro, setFiltro] = useState<Filtro>('tudo');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['registros', DIAS_HISTORICO],
    queryFn: () => listarRegistros(DIAS_HISTORICO),
  });

  // Voltar da tela de novo registro tem que trazer o item recém-criado.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const registros = useMemo(() => data?.data ?? [], [data]);

  const seteDias = useMemo(() => {
    const corte = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentes = registros.filter(
      (r) => new Date(r.dataHora).getTime() >= corte,
    );
    return {
      glicemia: recentes.filter((r) => r.tipo === 'glicemia').length,
      refeicao: recentes.filter((r) => r.tipo === 'refeicao').length,
    };
  }, [registros]);

  const visiveis =
    filtro === 'tudo' ? registros : registros.filter((r) => r.tipo === filtro);

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
            <Text style={styles.statValue}>{seteDias.glicemia}</Text>
            <Text style={styles.statLabel}>Glicemia · 7d</Text>
          </View>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIcon, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="restaurant-outline" size={16} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statValue}>{seteDias.refeicao}</Text>
            <Text style={styles.statLabel}>Refeições · 7d</Text>
          </View>
        </View>
      </View>

      <Card title="Linha do tempo">
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statLabel}>Carregando seus registros...</Text>
          </View>
        ) : isError ? (
          <>
            <EmptyState
              icon="cloud-offline-outline"
              title="Não foi possível carregar"
              message="Verifique sua conexão e tente novamente."
            />
            <Pressable style={styles.retry} onPress={() => refetch()}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </>
        ) : visiveis.length === 0 ? (
          <EmptyState
            icon="hourglass-outline"
            title={
              registros.length === 0
                ? 'Sem registros ainda'
                : 'Nada neste filtro'
            }
            message={
              registros.length === 0
                ? 'Comece registrando sua primeira medição de glicemia ou refeição.'
                : `Nos últimos ${DIAS_HISTORICO} dias você não registrou itens deste tipo.`
            }
          />
        ) : (
          <View style={styles.timeline}>
            {visiveis.map((item) => (
              <LinhaRegistro key={`${item.tipo}-${item.id}`} item={item} />
            ))}
          </View>
        )}
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

  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  retryText: { ...typography.caption, color: colors.primary, fontWeight: '600' },

  timeline: { gap: spacing.md },
  registro: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  registroIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registroTitulo: { ...typography.body, color: colors.text, fontWeight: '700' },
  registroDetalhe: { ...typography.caption, color: colors.textMuted },
  registroAlerta: { ...typography.caption, fontWeight: '600', marginTop: 2 },
});
