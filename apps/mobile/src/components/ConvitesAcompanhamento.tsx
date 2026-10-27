import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccessibleMode } from '@/hooks/use-accessible-mode';
import { aceitarConvite, listarConvites, recusarConvite } from '@/lib/api/vinculos';
import { colors, radius, spacing, typography } from '@/lib/theme';

/**
 * Convites de acompanhamento na tela inicial. O paciente precisa saber o que
 * está autorizando antes de aceitar, por isso o cartão diz o que o
 * nutricionista passa a ver — e que dá para voltar atrás.
 */
export function ConvitesAcompanhamento() {
  const queryClient = useQueryClient();
  const { isSimplified } = useAccessibleMode();
  const [erro, setErro] = useState<string | null>(null);

  const { data: convites = [] } = useQuery({
    queryKey: ['convites'],
    queryFn: listarConvites,
  });

  const { mutate: responder, isPending, variables } = useMutation({
    mutationFn: ({ id, aceitar }: { id: string; aceitar: boolean }) =>
      aceitar ? aceitarConvite(id) : recusarConvite(id),
    onSuccess: () => {
      setErro(null);
      queryClient.invalidateQueries({ queryKey: ['convites'] });
      queryClient.invalidateQueries({ queryKey: ['meus-nutricionistas'] });
      queryClient.invalidateQueries({ queryKey: ['conversas'] });
    },
    onError: () => setErro('Não foi possível enviar sua resposta. Tente novamente.'),
  });

  if (!convites.length) return null;

  return (
    <View style={styles.lista}>
      {convites.map((convite) => {
        const respondendo = isPending && variables?.id === convite.id;
        const { nutricionista } = convite;
        return (
          <View key={convite.id} style={styles.card}>
            <View style={styles.topo}>
              <View style={styles.icone}>
                <Ionicons name="person-add-outline" size={isSimplified ? 26 : 20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.titulo, isSimplified && styles.tituloGrande]}>
                  {nutricionista.nome} quer acompanhar você
                </Text>
                {(nutricionista.crn || nutricionista.especialidade) && (
                  <Text style={styles.detalhe}>
                    {[nutricionista.crn, nutricionista.especialidade].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
            </View>

            <Text style={[styles.texto, isSimplified && styles.textoGrande]}>
              Se aceitar, essa pessoa passa a ver suas medições de glicemia, refeições,
              medidas, humor e medicamentos, pode montar seu plano alimentar e conversar
              com você. Você pode encerrar o acompanhamento quando quiser, em Perfil.
            </Text>

            {respondendo ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={styles.botoes}>
                <Pressable
                  style={({ pressed }) => [styles.botao, styles.recusar, pressed && styles.pressionado]}
                  onPress={() => responder({ id: convite.id, aceitar: false })}
                  disabled={isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Recusar o convite de ${nutricionista.nome}`}
                >
                  <Text style={[styles.botaoTexto, styles.recusarTexto]}>Recusar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.botao, styles.aceitar, pressed && styles.pressionado]}
                  onPress={() => responder({ id: convite.id, aceitar: true })}
                  disabled={isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Aceitar o acompanhamento de ${nutricionista.nome}`}
                >
                  <Text style={[styles.botaoTexto, styles.aceitarTexto]}>Aceitar</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
      {erro && <Text style={styles.erro}>{erro}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    gap: spacing.md,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icone: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { ...typography.h3, color: colors.text },
  tituloGrande: { fontSize: 20 },
  detalhe: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  texto: { ...typography.body, color: colors.textSoft, lineHeight: 21 },
  textoGrande: { fontSize: 18, lineHeight: 26 },
  botoes: { flexDirection: 'row', gap: spacing.sm },
  botao: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aceitar: { backgroundColor: colors.primary },
  recusar: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressionado: { opacity: 0.8 },
  botaoTexto: { fontSize: 15, fontWeight: '700' },
  aceitarTexto: { color: colors.textInverse },
  recusarTexto: { color: colors.text },
  erro: { ...typography.caption, color: colors.danger },
});
