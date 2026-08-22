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
  atualizarMedicamento,
  criarMedicamento,
  horaCurta,
  listarMedicamentos,
  removerMedicamento,
  type Medicamento,
} from '@/lib/api/medicamentos';
import { colors, radius, spacing, typography } from '@/lib/theme';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const UNIDADES = ['mg', 'UI', 'ml', 'comprimido'];

type Form = {
  nome: string;
  dose: string;
  unidade: string;
  frequencia: string;
  horario: string;
  observacoes: string;
};

const FORM_VAZIO: Form = {
  nome: '',
  dose: '',
  unidade: UNIDADES[0],
  frequencia: '',
  horario: '',
  observacoes: '',
};

/** "500 mg" -> { dose: "500", unidade: "mg" }; sem unidade reconhecida, cai tudo em dose. */
function separarDosagem(dosagem: string): { dose: string; unidade: string } {
  const partes = dosagem.trim().split(/\s+/);
  const ultima = partes[partes.length - 1];
  if (partes.length > 1 && UNIDADES.includes(ultima)) {
    return { dose: partes.slice(0, -1).join(' '), unidade: ultima };
  }
  return { dose: dosagem, unidade: UNIDADES[0] };
}

export default function MedicamentosScreen() {
  const queryClient = useQueryClient();
  const { isSimplified } = useAccessibleMode();
  const { data: medicamentos, isLoading } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: listarMedicamentos,
  });

  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['medicamentos'] });

  const setCampo = <K extends keyof Form>(campo: K, valor: Form[K]) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

  const iniciarEdicao = (m: Medicamento) => {
    const { dose, unidade } = separarDosagem(m.dosagem);
    setForm({
      nome: m.nome,
      dose,
      unidade,
      frequencia: m.frequencia,
      horario: horaCurta(m.horarioInicial),
      observacoes: m.observacoes ?? '',
    });
    setEditandoId(m.id);
  };

  const cancelar = () => {
    setForm(FORM_VAZIO);
    setEditandoId(null);
  };

  const validar = (): string | null => {
    if (form.nome.trim().length < 2) return 'Informe o nome do medicamento.';
    if (!form.dose.trim()) return 'Informe a dose.';
    if (!form.frequencia.trim()) return 'Informe a frequência (ex.: 8 em 8h).';
    if (!HORA_REGEX.test(form.horario.trim())) return 'Informe o horário no formato HH:MM.';
    return null;
  };

  const onSalvar = async () => {
    const erro = validar();
    if (erro) {
      Alert.alert('Confira os dados', erro);
      return;
    }

    const input = {
      nome: form.nome.trim(),
      dosagem: `${form.dose.trim()} ${form.unidade}`,
      frequencia: form.frequencia.trim(),
      horarioInicial: form.horario.trim(),
      observacoes: form.observacoes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editandoId) {
        await atualizarMedicamento(editandoId, input);
      } else {
        await criarMedicamento(input);
      }
      invalidar();
      Alert.alert(editandoId ? 'Medicamento atualizado' : 'Medicamento adicionado');
      cancelar();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o medicamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const onRemover = (m: Medicamento) => {
    Alert.alert('Remover medicamento', `Remover "${m.nome}" da sua lista ativa?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerMedicamento(m.id);
            invalidar();
            if (editandoId === m.id) cancelar();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover. Tente novamente.');
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer
      eyebrow="Saúde"
      title="Medicamentos"
      subtitle="Mantenha sua lista de medicamentos em uso atualizada."
      showBack
    >
      <Card title={editandoId ? 'Editar medicamento' : 'Adicionar medicamento'}>
        <View style={styles.field}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={form.nome}
            onChangeText={(v) => setCampo('nome', v)}
            style={styles.input}
            placeholder="Ex.: Metformina"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.linha}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Dose</Text>
            <TextInput
              value={form.dose}
              onChangeText={(v) => setCampo('dose', v)}
              style={styles.input}
              placeholder="Ex.: 500"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Unidade</Text>
            <View style={styles.chips}>
              {UNIDADES.map((u) => {
                const active = form.unidade === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => setCampo('unidade', u)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{u}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.linha}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Frequência</Text>
            <TextInput
              value={form.frequencia}
              onChangeText={(v) => setCampo('frequencia', v)}
              style={styles.input}
              placeholder="Ex.: 8 em 8h"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Horário inicial</Text>
            <TextInput
              value={form.horario}
              onChangeText={(v) => setCampo('horario', v)}
              style={styles.input}
              placeholder="Ex.: 08:00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            value={form.observacoes}
            onChangeText={(v) => setCampo('observacoes', v)}
            style={[styles.input, styles.textarea]}
            placeholder="Como tomar, efeitos a observar..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        <View style={styles.acoesForm}>
          {editandoId ? (
            <Pressable style={styles.cancelBtn} onPress={cancelar}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={onSalvar}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.textInverse} />
                <Text style={styles.saveText}>
                  {editandoId ? 'Salvar alterações' : 'Adicionar'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </Card>

      <Card title="Seus medicamentos">
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !medicamentos?.length ? (
          <EmptyState
            icon="medkit-outline"
            title="Nenhum medicamento cadastrado"
            message="Use o formulário acima para adicionar o primeiro."
          />
        ) : (
          medicamentos.map((m, i) => (
            <View key={m.id} style={[styles.linhaItem, i > 0 && styles.linhaDivisoria]}>
              <View style={[styles.remedioIcone, isSimplified && styles.remedioIconeGrande]}>
                <Ionicons name="medkit-outline" size={isSimplified ? 22 : 16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.remedioNome, isSimplified && styles.remedioNomeGrande]}>
                  {m.nome}
                </Text>
                <Text style={[styles.remedioNota, isSimplified && styles.remedioNotaGrande]}>
                  {m.dosagem} · {m.frequencia} · {horaCurta(m.horarioInicial)}
                </Text>
              </View>
              <Pressable
                style={[styles.iconBtn, isSimplified && styles.iconBtnGrande]}
                onPress={() => iniciarEdicao(m)}
              >
                <Ionicons name="pencil-outline" size={isSimplified ? 24 : 18} color={colors.primary} />
              </Pressable>
              <Pressable
                style={[styles.iconBtn, isSimplified && styles.iconBtnGrande]}
                onPress={() => onRemover(m)}
              >
                <Ionicons name="trash-outline" size={isSimplified ? 24 : 18} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  field: { gap: spacing.xs, marginBottom: spacing.md },
  linha: { flexDirection: 'row', gap: spacing.md },
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
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
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

  acoesForm: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  btnDisabled: { opacity: 0.7 },
  saveText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: colors.textSoft, fontWeight: '700', fontSize: 15 },

  linhaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  linhaDivisoria: { borderTopWidth: 1, borderTopColor: colors.border },
  remedioIcone: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remedioIconeGrande: { width: 44, height: 44 },
  remedioNome: { ...typography.body, color: colors.text, fontWeight: '600' },
  remedioNomeGrande: { fontSize: 18 },
  remedioNota: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  remedioNotaGrande: { fontSize: 14 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGrande: { width: 48, height: 48 },
});
