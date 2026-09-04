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
import {
  descreverPorcao,
  listarAlimentos,
  listarGrupos,
  rotuloGrupo,
} from '@/lib/api/alimentos';
import { colors, radius, spacing, typography } from '@/lib/theme';

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
      eyebrow="Consulta"
      title="Alimentos"
      subtitle="Veja quanto carboidrato tem no que você vai comer."
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
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
            icon="nutrition-outline"
            title="Nenhum alimento encontrado"
            message={
              busca || grupo
                ? 'Tente outro nome ou limpe os filtros.'
                : 'A tabela de alimentos ainda não foi carregada.'
            }
          />
        </Card>
      ) : (
        alimentos.map((a) => (
          <Pressable
            key={a.id}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/alimentacao/alimentos/[id]',
                params: { id: a.id },
              })
            }
          >
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nome}>{a.nome}</Text>
                  <Text style={styles.porcao}>{descreverPorcao(a)}</Text>
                  <View style={styles.tagRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{rotuloGrupo(a.grupo)}</Text>
                    </View>
                    {/* O aviso fica junto do dado, não escondido no rodapé. */}
                    {a.fonte === 'exemplo' ? (
                      <View style={styles.tagAviso}>
                        <Text style={styles.tagAvisoText}>valor de exemplo</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.carbo}>
                  <Text style={styles.carboValor}>{a.carboidratosG}</Text>
                  <Text style={styles.carboUnidade}>g carb.</Text>
                  <Text style={styles.carboPor}>por {a.porcaoG} g</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
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
  nome: { ...typography.body, color: colors.text, fontWeight: '700' },
  porcao: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  tag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  tagAviso: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagAvisoText: { fontSize: 11, fontWeight: '600', color: colors.warning },

  carbo: { alignItems: 'flex-end' },
  carboValor: { fontSize: 22, fontWeight: '700', color: colors.text, lineHeight: 24 },
  carboUnidade: { fontSize: 11, fontWeight: '600', color: colors.textSoft },
  carboPor: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
});
