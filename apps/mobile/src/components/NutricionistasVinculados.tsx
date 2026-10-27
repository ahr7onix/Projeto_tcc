import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { encerrarAcompanhamento, listarMeusNutricionistas } from '@/lib/api/vinculos';
import { colors, radius, spacing, typography } from '@/lib/theme';

/**
 * Quem vê os dados de saúde do paciente hoje, com o caminho para revogar a
 * autorização (LGPD, art. 18). A confirmação fica no próprio cartão em vez de
 * um Alert: no aplicativo em modo web o Alert com botões não aparece.
 */
export function NutricionistasVinculados() {
  const queryClient = useQueryClient();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const { data: nutricionistas = [], isLoading } = useQuery({
    queryKey: ['meus-nutricionistas'],
    queryFn: listarMeusNutricionistas,
  });

  const { mutate: encerrar, isPending } = useMutation({
    mutationFn: encerrarAcompanhamento,
    onSuccess: () => {
      setConfirmandoId(null);
      setErro(null);
      queryClient.invalidateQueries({ queryKey: ['meus-nutricionistas'] });
      queryClient.invalidateQueries({ queryKey: ['conversas'] });
    },
    onError: () => setErro('Não foi possível encerrar agora. Tente novamente.'),
  });

  return (
    <Card title="Quem acompanha você">
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : nutricionistas.length === 0 ? (
        <Text style={styles.vazio}>
          Nenhum nutricionista acompanha você no momento. Quando chegar um convite, ele
          aparece na tela inicial para você aceitar ou recusar.
        </Text>
      ) : (
        nutricionistas.map((n, i) => (
          <View key={n.id} style={[styles.linha, i > 0 && styles.divisor]}>
            <View style={styles.cabecalho}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{n.nome}</Text>
                <Text style={styles.detalhe}>
                  {[n.crn, `desde ${new Date(n.vinculadoEm).toLocaleDateString('pt-BR')}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {confirmandoId !== n.id && (
                <Pressable
                  onPress={() => setConfirmandoId(n.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Encerrar o acompanhamento com ${n.nome}`}
                  hitSlop={8}
                >
                  <Text style={styles.encerrar}>Encerrar</Text>
                </Pressable>
              )}
            </View>

            {confirmandoId === n.id && (
              <View style={styles.confirmacao}>
                <Text style={styles.confirmacaoTexto}>
                  Encerrar o acompanhamento com {n.nome}? Essa pessoa deixa de ver seus
                  dados de saúde. O histórico das conversas fica guardado.
                </Text>
                <View style={styles.botoes}>
                  <Pressable
                    style={[styles.botao, styles.cancelar]}
                    onPress={() => setConfirmandoId(null)}
                    disabled={isPending}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelarTexto}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.botao, styles.confirmar]}
                    onPress={() => encerrar(n.id)}
                    disabled={isPending}
                    accessibilityRole="button"
                  >
                    {isPending ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={styles.confirmarTexto}>Sim, encerrar</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ))
      )}
      {erro && <Text style={styles.erro}>{erro}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  vazio: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
  linha: { gap: spacing.sm },
  divisor: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nome: { ...typography.body, color: colors.text, fontWeight: '600' },
  detalhe: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  encerrar: { fontSize: 14, fontWeight: '700', color: colors.danger },
  confirmacao: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  confirmacaoTexto: { ...typography.caption, color: colors.text, lineHeight: 19 },
  botoes: { flexDirection: 'row', gap: spacing.sm },
  botao: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelar: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cancelarTexto: { fontSize: 14, fontWeight: '700', color: colors.text },
  confirmar: { backgroundColor: colors.danger },
  confirmarTexto: { fontSize: 14, fontWeight: '700', color: colors.textInverse },
  erro: { ...typography.caption, color: colors.danger },
});
