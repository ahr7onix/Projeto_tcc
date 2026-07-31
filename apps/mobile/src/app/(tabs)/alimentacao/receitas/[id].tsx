import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { buscarReceita, linhasDeTexto } from '@/lib/api/receitas';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function ReceitaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: receita, isLoading, isError } = useQuery({
    queryKey: ['receita', id],
    queryFn: () => buscarReceita(String(id)),
  });

  // Só monta o quadro nutricional se a nutricionista tiver informado as calorias;
  // sem elas os macros sozinhos não dizem muita coisa para o paciente.
  const macros = receita?.kcalPorcao
    ? [
        { label: 'Calorias', valor: `${receita.kcalPorcao} kcal` },
        { label: 'Carboidratos', valor: `${receita.carboidratosPorcao ?? '--'} g` },
        { label: 'Proteínas', valor: `${receita.proteinasPorcao ?? '--'} g` },
        { label: 'Gorduras', valor: `${receita.lipidiosPorcao ?? '--'} g` },
      ]
    : [];

  return (
    <ScreenContainer
      eyebrow="Receita"
      title={receita?.titulo ?? 'Carregando...'}
      subtitle={receita?.resumo ?? undefined}
      showBack
    >
      {isLoading ? (
        <Card>
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </Card>
      ) : isError || !receita ? (
        <Card>
          <EmptyState
            icon="alert-circle-outline"
            title="Receita indisponível"
            message="Esta receita pode ter sido removida ou despublicada."
          />
        </Card>
      ) : (
        <>
          <Card>
            <View style={styles.infoRow}>
              {receita.tempoPreparoMin ? (
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Preparo</Text>
                  <Text style={styles.infoValor}>{receita.tempoPreparoMin} min</Text>
                </View>
              ) : null}
              {receita.porcoes ? (
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Rende</Text>
                  <Text style={styles.infoValor}>
                    {receita.porcoes} {receita.porcoes === 1 ? 'porção' : 'porções'}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>

          {macros.length ? (
            <Card title="Por porção">
              <View style={styles.macroGrid}>
                {macros.map((m) => (
                  <View key={m.label} style={styles.macroCell}>
                    <Text style={styles.infoLabel}>{m.label}</Text>
                    <Text style={styles.macroValor}>{m.valor}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          <Card title="Ingredientes">
            {linhasDeTexto(receita.ingredientes).map((linha, i) => (
              <View key={`${i}-${linha}`} style={styles.itemLinha}>
                <View style={styles.marcador} />
                <Text style={styles.itemTexto}>{linha}</Text>
              </View>
            ))}
          </Card>

          <Card title="Modo de preparo">
            {linhasDeTexto(receita.modoPreparo).map((linha, i) => (
              <View key={`${i}-${linha}`} style={styles.itemLinha}>
                <View style={styles.passo}>
                  <Text style={styles.passoTexto}>{i + 1}</Text>
                </View>
                <Text style={styles.itemTexto}>{linha}</Text>
              </View>
            ))}
          </Card>

          <Text style={styles.autor}>Publicado por {receita.autorNome}</Text>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  infoRow: { flexDirection: 'row', gap: spacing.sm },
  infoCell: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  infoLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  infoValor: { ...typography.h3, color: colors.text },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  macroCell: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  macroValor: { ...typography.h3, color: colors.text },
  itemLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  marcador: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  passo: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoTexto: { fontSize: 12, fontWeight: '700', color: colors.primary },
  itemTexto: { ...typography.body, color: colors.text, flex: 1, lineHeight: 22 },
  autor: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
