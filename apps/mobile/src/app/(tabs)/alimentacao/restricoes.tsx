import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAccessibleMode } from '@/hooks/use-accessible-mode';
import {
  atualizarRestricao,
  criarRestricao,
  listarRestricoes,
  removerRestricao,
  type Restricao,
} from '@/lib/api/restricoes';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function RestricoesScreen() {
  const queryClient = useQueryClient();
  const { isSimplified } = useAccessibleMode();
  const { data: restricoes, isLoading } = useQuery({
    queryKey: ['restricoes'],
    queryFn: listarRestricoes,
  });

  const [novaDescricao, setNovaDescricao] = useState('');
  const [salvandoNova, setSalvandoNova] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoTexto, setEditandoTexto] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['restricoes'] });

  const onAdicionar = async () => {
    const texto = novaDescricao.trim();
    if (texto.length < 2) {
      Alert.alert('Descrição muito curta', 'Descreva a restrição com pelo menos 2 letras.');
      return;
    }
    setSalvandoNova(true);
    try {
      await criarRestricao(texto);
      invalidar();
      setNovaDescricao('');
      Alert.alert('Restrição adicionada', `"${texto}" foi salva no seu perfil.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a restrição. Tente novamente.');
    } finally {
      setSalvandoNova(false);
    }
  };

  const onIniciarEdicao = (r: Restricao) => {
    setEditandoId(r.id);
    setEditandoTexto(r.descricao);
  };

  const onCancelarEdicao = () => {
    setEditandoId(null);
    setEditandoTexto('');
  };

  const onSalvarEdicao = async (id: string) => {
    const texto = editandoTexto.trim();
    if (texto.length < 2) {
      Alert.alert('Descrição muito curta', 'Descreva a restrição com pelo menos 2 letras.');
      return;
    }
    setSalvandoEdicao(true);
    try {
      await atualizarRestricao(id, texto);
      invalidar();
      onCancelarEdicao();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a alteração. Tente novamente.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const onRemover = (r: Restricao) => {
    Alert.alert('Remover restrição', `Remover "${r.descricao}" da sua lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerRestricao(r.id);
            invalidar();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover. Tente novamente.');
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer
      eyebrow="Alimentação"
      title="Restrições alimentares"
      subtitle="Mantenha suas alergias e intolerâncias atualizadas para o seu nutricionista."
      showBack
    >
      <Card title="Adicionar restrição">
        <View style={styles.linhaNova}>
          <TextInput
            value={novaDescricao}
            onChangeText={setNovaDescricao}
            style={[styles.input, isSimplified && styles.inputGrande, { flex: 1 }]}
            placeholder="Ex.: Intolerância à lactose"
            placeholderTextColor={colors.textMuted}
            maxLength={160}
          />
          <Pressable
            style={[
              styles.addBtn,
              isSimplified && styles.addBtnGrande,
              salvandoNova && styles.btnDisabled,
            ]}
            onPress={onAdicionar}
            disabled={salvandoNova}
          >
            {salvandoNova ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Ionicons name="add" size={isSimplified ? 26 : 20} color={colors.textInverse} />
            )}
          </Pressable>
        </View>
      </Card>

      <Card title="Suas restrições">
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !restricoes?.length ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Nenhuma restrição cadastrada"
            message="Use o campo acima para adicionar sua primeira restrição."
          />
        ) : (
          restricoes.map((r, i) => {
            const editando = editandoId === r.id;
            return (
              <View key={r.id} style={[styles.linha, i > 0 && styles.linhaDivisoria]}>
                {editando ? (
                  <>
                    <TextInput
                      value={editandoTexto}
                      onChangeText={setEditandoTexto}
                      style={[styles.input, isSimplified && styles.inputGrande, { flex: 1 }]}
                      placeholderTextColor={colors.textMuted}
                      maxLength={160}
                      autoFocus
                    />
                    <Pressable
                      style={[styles.iconBtn, isSimplified && styles.iconBtnGrande]}
                      onPress={() => onSalvarEdicao(r.id)}
                      disabled={salvandoEdicao}
                    >
                      {salvandoEdicao ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <Ionicons
                          name="checkmark"
                          size={isSimplified ? 26 : 20}
                          color={colors.success}
                        />
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.iconBtn, isSimplified && styles.iconBtnGrande]}
                      onPress={onCancelarEdicao}
                    >
                      <Ionicons name="close" size={isSimplified ? 26 : 20} color={colors.textMuted} />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={[styles.itemTexto, isSimplified && styles.itemTextoGrande]}>
                      {r.descricao}
                    </Text>
                    <Pressable
                      style={[styles.iconBtn, isSimplified && styles.iconBtnGrande]}
                      onPress={() => onIniciarEdicao(r)}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={isSimplified ? 24 : 18}
                        color={colors.primary}
                      />
                    </Pressable>
                    <Pressable
                      style={[styles.iconBtn, isSimplified && styles.iconBtnGrande]}
                      onPress={() => onRemover(r)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={isSimplified ? 24 : 18}
                        color={colors.danger}
                      />
                    </Pressable>
                  </>
                )}
              </View>
            );
          })
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  linhaNova: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnGrande: { width: 54, height: 54 },
  btnDisabled: { opacity: 0.7 },
  inputGrande: { fontSize: 18, paddingVertical: spacing.lg },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  linhaDivisoria: { borderTopWidth: 1, borderTopColor: colors.border },
  itemTexto: { ...typography.body, color: colors.text, flex: 1 },
  itemTextoGrande: { fontSize: 18, lineHeight: 24 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGrande: { width: 48, height: 48 },
});
