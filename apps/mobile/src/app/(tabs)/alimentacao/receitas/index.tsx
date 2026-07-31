import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { listarCategorias, listarReceitas } from '@/lib/api/receitas';
import { colors, radius, spacing, typography } from '@/lib/theme';

const CATEGORIA_ICONE: Record<string, 'sunny-outline' | 'restaurant-outline' | 'moon-outline' | 'cafe-outline' | 'nutrition-outline'> = {
  cafe_da_manha: 'sunny-outline',
  almoco: 'restaurant-outline',
  jantar: 'moon-outline',
  lanche: 'cafe-outline',
  geral: 'nutrition-outline',
};

const rotuloCategoria = (categoria: string): string =>
  categoria.replace(/_/g, ' ').replace(/^./, (letra) => letra.toUpperCase());

export default function ReceitasScreen() {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');

  const { data: categorias } = useQuery({
    queryKey: ['receitas-categorias'],
    queryFn: listarCategorias,
  });

  const { data: receitas, isLoading, isError, refetch } = useQuery({
    queryKey: ['receitas', busca, categoria],
    queryFn: () => listarReceitas({ busca, categoria, limite: 50 }),
  });

  return (
    <ScreenContainer
      eyebrow="Sugestões"
      title="Receitas"
      subtitle="Pratos publicados pela equipe de nutrição."
      showBack
    >
      <Card>
        <View style={styles.buscaBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            style={styles.buscaInput}
            placeholder="Buscar receita ou ingrediente"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {categorias?.length ? (
          <View style={styles.chips}>
            <Pressable
              onPress={() => setCategoria('')}
              style={[styles.chip, categoria === '' && styles.chipActive]}
            >
              <Text style={[styles.chipText, categoria === '' && styles.chipTextActive]}>
                Todas
              </Text>
            </Pressable>
            {categorias.map((c) => {
              const ativo = categoria === c.categoria;
              return (
                <Pressable
                  key={c.categoria}
                  onPress={() => setCategoria(ativo ? '' : c.categoria)}
                  style={[styles.chip, ativo && styles.chipActive]}
                >
                  <Text style={[styles.chipText, ativo && styles.chipTextActive]}>
                    {rotuloCategoria(c.categoria)} ({c.total})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Card>

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
      ) : !receitas?.length ? (
        <Card>
          <EmptyState
            icon="restaurant-outline"
            title="Nenhuma receita encontrada"
            message={
              busca || categoria
                ? 'Tente outra busca ou limpe os filtros.'
                : 'Assim que a equipe publicar receitas, elas aparecem aqui.'
            }
          />
        </Card>
      ) : (
        receitas.map((r) => (
          <Pressable
            key={r.id}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/alimentacao/receitas/[id]',
                params: { id: r.id },
              })
            }
          >
            <Card>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons
                    name={CATEGORIA_ICONE[r.categoria] ?? 'nutrition-outline'}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.titulo}>{r.titulo}</Text>
                  <View style={styles.meta}>
                    {r.tempoPreparoMin ? (
                      <>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.metaText}>{r.tempoPreparoMin} min</Text>
                      </>
                    ) : null}
                    {r.porcoes ? (
                      <Text style={styles.metaText}>
                        {r.porcoes} {r.porcoes === 1 ? 'porção' : 'porções'}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.tagRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{rotuloCategoria(r.categoria)}</Text>
                    </View>
                    {r.kcalPorcao !== null ? (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{r.kcalPorcao} kcal/porção</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              {r.resumo ? <Text style={styles.resumo}>{r.resumo}</Text> : null}
            </Card>
          </Pressable>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  buscaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  buscaInput: { flex: 1, paddingVertical: spacing.md, fontSize: 15, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSoft },
  chipTextActive: { color: colors.textInverse },

  center: { alignItems: 'center', paddingVertical: spacing.lg },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  retryText: { ...typography.body, color: colors.primary, fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { ...typography.body, color: colors.text, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { ...typography.caption, color: colors.textMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  tag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  resumo: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
});
