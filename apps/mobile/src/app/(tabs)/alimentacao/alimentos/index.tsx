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
import { descreverPorcao, listarAlimentos, listarGrupos } from '@/lib/api/alimentos';
import { colors, radius, spacing, typography } from '@/lib/theme';

const rotuloGrupo = (grupo: string): string =>
  grupo.replace(/_/g, ' ').replace(/^./, (letra) => letra.toUpperCase());

export default function AlimentosScreen() {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('');

  const { data: grupos } = useQuery({
    queryKey: ['alimentos-grupos'],
    queryFn: listarGrupos,
  });

  const { data: alimentos, isLoading, isError, refetch } = useQuery({
    queryKey: ['alimentos', busca, grupo],
    queryFn: () => listarAlimentos({ busca, grupo, limite: 60 }),
  });

  return (
    <ScreenContainer
      eyebrow="Tabela nutricional"
      title="Alimentos"
      subtitle="Consulte calorias e carboidratos antes de montar o prato."
      showBack
    >
      <Card>
        <View style={styles.buscaBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            style={styles.buscaInput}
            placeholder="Buscar alimento"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
          />
          {busca ? (
            <Pressable onPress={() => setBusca('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {grupos?.length ? (
          <View style={styles.chips}>
            <Pressable
              onPress={() => setGrupo('')}
              style={[styles.chip, grupo === '' && styles.chipActive]}
            >
              <Text style={[styles.chipText, grupo === '' && styles.chipTextActive]}>
                Todos
              </Text>
            </Pressable>
            {grupos.map((g) => {
              const ativo = grupo === g.grupo;
              return (
                <Pressable
                  key={g.grupo}
                  onPress={() => setGrupo(ativo ? '' : g.grupo)}
                  style={[styles.chip, ativo && styles.chipActive]}
                >
                  <Text style={[styles.chipText, ativo && styles.chipTextActive]}>
                    {rotuloGrupo(g.grupo)}
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
      ) : !alimentos?.length ? (
        <Card>
          <EmptyState
            icon="search-outline"
            title="Nenhum alimento encontrado"
            message="Tente outro nome ou limpe os filtros."
          />
        </Card>
      ) : (
        <Card>
          {alimentos.map((a, i) => (
            <Pressable
              key={a.id}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/alimentacao/alimentos/[id]',
                  params: { id: a.id },
                })
              }
              style={[styles.linha, i > 0 && styles.linhaDivisoria]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{a.nome}</Text>
                <Text style={styles.porcao}>
                  {rotuloGrupo(a.grupo)} · {descreverPorcao(a)}
                </Text>
              </View>
              <View style={styles.numeros}>
                <Text style={styles.kcal}>{a.kcal} kcal</Text>
                <Text style={styles.carb}>{a.carboidratosG} g carb.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>
      )}

      <Text style={styles.rodape}>
        Valores por porção de referência, para consulta. Quem define o seu plano é a
        nutricionista.
      </Text>
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

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  linhaDivisoria: { borderTopWidth: 1, borderTopColor: colors.border },
  nome: { ...typography.body, color: colors.text, fontWeight: '600' },
  porcao: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  numeros: { alignItems: 'flex-end' },
  kcal: { fontSize: 13, fontWeight: '700', color: colors.primary },
  carb: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  rodape: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
