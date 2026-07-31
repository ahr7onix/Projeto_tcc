import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { buscarAlimento, descreverPorcao } from '@/lib/api/alimentos';
import { colors, radius, spacing, typography } from '@/lib/theme';

/** Uma casa decimal chega: o alimento em si já é um valor médio de tabela. */
const arredondar = (valor: number): number => Math.round(valor * 10) / 10;

export default function AlimentoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quantidade, setQuantidade] = useState('100');

  const { data: alimento, isLoading, isError } = useQuery({
    queryKey: ['alimento', id],
    queryFn: () => buscarAlimento(String(id)),
  });

  const gramas = Number(quantidade.replace(',', '.'));
  const valida = Number.isFinite(gramas) && gramas > 0;
  // A conta é a mesma que a API faz ao montar o plano: proporção sobre a porção
  // de referência. Feita aqui para o número mudar enquanto o paciente digita.
  const proporcao = alimento && valida ? gramas / alimento.porcaoG : 0;

  const linhas = alimento
    ? [
        { label: 'Calorias', valor: arredondar(alimento.kcal * proporcao), unidade: 'kcal' },
        { label: 'Carboidratos', valor: arredondar(alimento.carboidratosG * proporcao), unidade: 'g' },
        { label: 'Proteínas', valor: arredondar(alimento.proteinasG * proporcao), unidade: 'g' },
        { label: 'Gorduras', valor: arredondar(alimento.lipidiosG * proporcao), unidade: 'g' },
        ...(alimento.fibrasG !== null
          ? [{ label: 'Fibras', valor: arredondar(alimento.fibrasG * proporcao), unidade: 'g' }]
          : []),
      ]
    : [];

  return (
    <ScreenContainer
      eyebrow="Tabela nutricional"
      title={alimento?.nome ?? 'Carregando...'}
      subtitle={alimento ? `Referência: ${descreverPorcao(alimento)}` : undefined}
      showBack
    >
      {isLoading ? (
        <Card>
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </Card>
      ) : isError || !alimento ? (
        <Card>
          <EmptyState
            icon="alert-circle-outline"
            title="Alimento indisponível"
            message="Este item pode ter saído da tabela."
          />
        </Card>
      ) : (
        <>
          <Card title="Quanto você vai comer?">
            <View style={styles.campo}>
              <Text style={styles.label}>Quantidade (g)</Text>
              <TextInput
                value={quantidade}
                onChangeText={setQuantidade}
                style={styles.input}
                keyboardType="numeric"
                placeholder="Ex.: 150"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            {alimento.medidaCaseira && alimento.medidaCaseiraG ? (
              <Text style={styles.dica}>
                Uma medida caseira ({alimento.medidaCaseira}) equivale a{' '}
                {alimento.medidaCaseiraG} g.
              </Text>
            ) : null}
          </Card>

          <Card title={valida ? `Em ${arredondar(gramas)} g` : 'Informe a quantidade'}>
            {valida ? (
              linhas.map((l, i) => (
                <View key={l.label} style={[styles.linha, i > 0 && styles.linhaDivisoria]}>
                  <Text style={styles.linhaLabel}>{l.label}</Text>
                  <Text style={styles.linhaValor}>
                    {l.valor} <Text style={styles.unidade}>{l.unidade}</Text>
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.dica}>Digite um valor em gramas para ver as contas.</Text>
            )}
          </Card>

          {alimento.indiceGlicemico !== null ? (
            <Card title="Índice glicêmico">
              <Text style={styles.igValor}>{alimento.indiceGlicemico}</Text>
              <Text style={styles.dica}>
                Indica a velocidade com que o alimento eleva a glicemia. Converse com a
                nutricionista sobre como usar essa informação no seu dia a dia.
              </Text>
            </Card>
          ) : null}

          <Text style={styles.rodape}>
            Fonte: {alimento.fonte}. Valores médios, para consulta.
          </Text>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  campo: { gap: spacing.xs },
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
  dica: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  linhaDivisoria: { borderTopWidth: 1, borderTopColor: colors.border },
  linhaLabel: { ...typography.body, color: colors.textSoft },
  linhaValor: { ...typography.h3, color: colors.text },
  unidade: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  igValor: { ...typography.h1, color: colors.primary },
  rodape: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
