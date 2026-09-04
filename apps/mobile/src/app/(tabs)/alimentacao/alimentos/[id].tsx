import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { buscarAlimento, rotuloGrupo, type Alimento } from '@/lib/api/alimentos';
import { colors, radius, spacing, typography } from '@/lib/theme';

/**
 * Uma casa decimal só quando o número precisa: 28 e 28,4.
 *
 * O arredondamento é o mesmo do servidor (`arredondar` em common/nutricao):
 * com `toFixed` a prévia mostrava 24,9 e o registro salvo ficava 25, porque
 * 24,95 em ponto flutuante é 24,9499... e as duas funções decidiam diferente.
 */
const formatar = (valor: number): string => {
  const arredondado = Math.round(valor * 10) / 10;
  return Number.isInteger(arredondado)
    ? String(arredondado)
    : String(arredondado).replace('.', ',');
};

/**
 * A mesma regra de três que a API aplica ao gravar o registro. Aqui ela roda
 * na tela só para o número mudar enquanto o paciente digita; o valor que fica
 * guardado é sempre o que o servidor calcula.
 */
function paraQuantidade(alimento: Alimento, quantidadeG: number) {
  const proporcao = quantidadeG / alimento.porcaoG;
  return {
    kcal: alimento.kcal * proporcao,
    carboidratosG: alimento.carboidratosG * proporcao,
    proteinasG: alimento.proteinasG * proporcao,
    lipidiosG: alimento.lipidiosG * proporcao,
    fibrasG: alimento.fibrasG === null ? null : alimento.fibrasG * proporcao,
  };
}

export default function AlimentoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quantidade, setQuantidade] = useState('');

  const { data: alimento, isLoading, isError } = useQuery({
    queryKey: ['alimento', id],
    queryFn: () => buscarAlimento(id),
    enabled: Boolean(id),
  });

  // Sem nada digitado, mostra a porção de referência do próprio alimento.
  const quantidadeG = useMemo(() => {
    const digitado = Number(quantidade.replace(',', '.'));
    if (digitado > 0) return digitado;
    return alimento?.medidaCaseiraG ?? alimento?.porcaoG ?? 0;
  }, [quantidade, alimento]);

  const valores = alimento ? paraQuantidade(alimento, quantidadeG) : null;

  const atalhos = useMemo(() => {
    if (!alimento) return [] as { rotulo: string; gramas: number }[];
    const lista: { rotulo: string; gramas: number }[] = [];
    if (alimento.medidaCaseira && alimento.medidaCaseiraG) {
      lista.push({ rotulo: alimento.medidaCaseira, gramas: alimento.medidaCaseiraG });
    }
    for (const gramas of [30, 50, 100, 150]) {
      if (!lista.some((a) => a.gramas === gramas)) {
        lista.push({ rotulo: `${gramas} g`, gramas });
      }
    }
    return lista;
  }, [alimento]);

  if (isLoading) {
    return (
      <ScreenContainer eyebrow="Consulta" title="Alimento" showBack>
        <Card>
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </Card>
      </ScreenContainer>
    );
  }

  if (isError || !alimento || !valores) {
    return (
      <ScreenContainer eyebrow="Consulta" title="Alimento" showBack>
        <Card>
          <EmptyState
            icon="nutrition-outline"
            title="Alimento não encontrado"
            message="Ele pode ter saído da tabela. Volte e escolha outro."
          />
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      eyebrow={rotuloGrupo(alimento.grupo)}
      title={alimento.nome}
      subtitle={`Valores por ${alimento.porcaoG} g na tabela.`}
      showBack
    >
      <Card title="Quanto você vai comer?">
        <View style={styles.chips}>
          {atalhos.map((a) => {
            const ativo = quantidadeG === a.gramas;
            return (
              <Pressable
                key={a.rotulo}
                onPress={() => setQuantidade(String(a.gramas))}
                style={[styles.chip, ativo && styles.chipActive]}
              >
                <Text style={[styles.chipText, ativo && styles.chipTextActive]}>
                  {a.rotulo}
                  {a.rotulo.endsWith('g') ? '' : ` (${a.gramas} g)`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ou digite a quantidade em gramas</Text>
          <TextInput
            value={quantidade}
            onChangeText={setQuantidade}
            style={styles.input}
            keyboardType="numeric"
            placeholder={String(alimento.medidaCaseiraG ?? alimento.porcaoG)}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </Card>

      <Card title={`Em ${formatar(quantidadeG)} g`}>
        <View style={styles.destaque}>
          <Text style={styles.destaqueValor}>{formatar(valores.carboidratosG)}</Text>
          {/* Sem o flex, a nota nao quebra linha e some na borda da tela. */}
          <View style={{ flex: 1 }}>
            <Text style={styles.destaqueUnidade}>gramas de carboidrato</Text>
            <Text style={styles.destaqueNota}>
              é este número que entra na contagem de carboidratos
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Energia</Text>
            <Text style={styles.cellValor}>
              {formatar(valores.kcal)}
              <Text style={styles.cellUnidade}> kcal</Text>
            </Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Proteínas</Text>
            <Text style={styles.cellValor}>
              {formatar(valores.proteinasG)}
              <Text style={styles.cellUnidade}> g</Text>
            </Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Gorduras</Text>
            <Text style={styles.cellValor}>
              {formatar(valores.lipidiosG)}
              <Text style={styles.cellUnidade}> g</Text>
            </Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Fibras</Text>
            <Text style={styles.cellValor}>
              {valores.fibrasG === null ? '--' : formatar(valores.fibrasG)}
              {valores.fibrasG === null ? null : <Text style={styles.cellUnidade}> g</Text>}
            </Text>
          </View>
        </View>

        {alimento.indiceGlicemico !== null ? (
          <Text style={styles.rodape}>Índice glicêmico: {alimento.indiceGlicemico}</Text>
        ) : null}
      </Card>

      {/* O aviso acompanha o dado: enquanto a tabela oficial não chega, o
          paciente precisa saber que o número é aproximado. */}
      {alimento.fonte === 'exemplo' ? (
        <Card>
          <View style={styles.aviso}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.avisoTexto}>
              Valor de exemplo, ainda não conferido pela equipe de nutrição. Use como
              referência aproximada e confirme na sua consulta.
            </Text>
          </View>
        </Card>
      ) : null}

      <Pressable
        style={styles.cta}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/registros/refeicao',
            params: { alimentoId: alimento.id, quantidadeG: String(quantidadeG) },
          })
        }
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.textInverse} />
        <Text style={styles.ctaText}>Registrar como refeição</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSoft, fontWeight: '600' },
  chipTextActive: { color: colors.textInverse },

  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSoft, fontWeight: '600' },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },

  destaque: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  destaqueValor: { fontSize: 40, fontWeight: '700', color: colors.primary, lineHeight: 44 },
  destaqueUnidade: { ...typography.body, color: colors.text, fontWeight: '600' },
  destaqueNota: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cellLabel: { ...typography.caption, color: colors.textMuted },
  cellValor: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  cellUnidade: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  rodape: { ...typography.caption, color: colors.textMuted },

  aviso: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  avisoTexto: { ...typography.caption, color: colors.textSoft, flex: 1, lineHeight: 18 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  ctaText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
