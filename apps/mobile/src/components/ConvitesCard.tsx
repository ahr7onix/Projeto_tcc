import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { listarConvites, responderConvite } from '@/lib/api/convites';
import { colors, radius, spacing, typography } from '@/lib/theme';

/**
 * Convites de acompanhamento: o nutricionista só enxerga os dados do paciente
 * depois do "Aceitar" daqui. Não renderiza nada quando não há convite.
 */
export function ConvitesCard() {
  const queryClient = useQueryClient();
  const { data: convites = [] } = useQuery({
    queryKey: ['convites'],
    queryFn: listarConvites,
  });

  const responder = useMutation({
    mutationFn: ({ id, aceitar }: { id: string; aceitar: boolean }) =>
      responderConvite(id, aceitar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites'] });
      queryClient.invalidateQueries({ queryKey: ['mensagens'] });
    },
    onError: () =>
      Alert.alert('Não foi possível responder', 'Tente novamente em instantes.'),
  });

  function confirmar(id: string, nome: string, aceitar: boolean) {
    Alert.alert(
      aceitar ? 'Aceitar convite?' : 'Recusar convite?',
      aceitar
        ? `${nome} passará a ver seus registros de glicemia, refeições e dados de saúde. Você poderá pedir o encerramento do acompanhamento depois.`
        : `${nome} não terá acesso aos seus dados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: aceitar ? 'Aceitar' : 'Recusar',
          style: aceitar ? 'default' : 'destructive',
          onPress: () => responder.mutate({ id, aceitar }),
        },
      ],
    );
  }

  if (convites.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {convites.map((c) => (
        <View key={c.conviteId} style={styles.card}>
          <Text style={styles.eyebrow}>Convite de acompanhamento</Text>
          <Text style={styles.nome}>{c.nutricionistaNome}</Text>
          <Text style={styles.detalhe}>
            {[c.crn ? `CRN ${c.crn}` : null, c.especialidade].filter(Boolean).join(' · ') ||
              'Nutricionista'}
          </Text>
          <Text style={styles.texto}>
            Quer acompanhar você pelo NutriCare. Só depois que você aceitar ele(a) poderá ver os
            seus dados.
          </Text>
          <View style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnSec, pressed && styles.pressed]}
              disabled={responder.isPending}
              onPress={() => confirmar(c.conviteId, c.nutricionistaNome, false)}
              accessibilityRole="button"
              accessibilityLabel={`Recusar convite de ${c.nutricionistaNome}`}
            >
              <Text style={styles.btnSecText}>Recusar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnPri, pressed && styles.pressed]}
              disabled={responder.isPending}
              onPress={() => confirmar(c.conviteId, c.nutricionistaNome, true)}
              accessibilityRole="button"
              accessibilityLabel={`Aceitar convite de ${c.nutricionistaNome}`}
            >
              <Text style={styles.btnPriText}>Aceitar</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primary },
  nome: { ...typography.h3, color: colors.text },
  detalhe: { ...typography.caption, color: colors.textSoft },
  texto: { ...typography.body, color: colors.textSoft, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPri: { backgroundColor: colors.primary },
  btnPriText: { ...typography.body, fontWeight: '600', color: colors.textInverse },
  btnSec: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  btnSecText: { ...typography.body, fontWeight: '600', color: colors.text },
  pressed: { opacity: 0.8 },
});
