import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { ScreenContainer } from '@/components/ScreenContainer';
import { createGlicemia } from '@/lib/api/registros';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Momento = 'jejum' | 'pre' | 'pos' | 'aleatorio';

const momentos: { key: Momento; label: string }[] = [
  { key: 'jejum', label: 'Jejum' },
  { key: 'pre', label: 'Pré-refeição' },
  { key: 'pos', label: 'Pós-refeição' },
  { key: 'aleatorio', label: 'Aleatório' },
];

export default function RegistrarGlicemiaScreen() {
  const [valor, setValor] = useState('');
  const [momento, setMomento] = useState<Momento>('jejum');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const num = Number(valor.replace(',', '.'));
    if (!valor || Number.isNaN(num) || num <= 0) {
      Alert.alert('Valor inválido', 'Informe a glicemia em mg/dL.');
      return;
    }
    setSaving(true);
    try {
      const registro = await createGlicemia({
        valor: num,
        momento,
        observacao: observacoes || undefined,
      });

      const { severidade, mensagem, faixaReferencia } = registro.alerta;
      const titulo =
        severidade === 'critico'
          ? 'Atenção: valor crítico'
          : severidade === 'atencao'
            ? 'Fora da faixa esperada'
            : 'Registrado';
      const corpo =
        severidade === 'normal'
          ? 'Sua glicemia foi registrada.'
          : `${mensagem}\n\nFaixa de referência: ${faixaReferencia.min}–${faixaReferencia.max} mg/dL.`;

      Alert.alert(titulo, corpo, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o registro. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      eyebrow="Novo registro"
      title="Glicemia"
      subtitle="Anote sua medição para o acompanhamento clínico."
      showBack
    >
      <Card title="Medição">
        <View style={styles.field}>
          <Text style={styles.label}>Valor (mg/dL)</Text>
          <TextInput
            value={valor}
            onChangeText={setValor}
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ex.: 110"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Momento</Text>
          <View style={styles.chips}>
            {momentos.map((m) => {
              const active = momento === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setMomento(m.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            value={observacoes}
            onChangeText={setObservacoes}
            style={[styles.input, styles.textarea]}
            placeholder="Sintomas, atividade física, medicação..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>
      </Card>

      <Pressable
        style={[styles.saveBtn, saving && styles.saveDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <>
            <Ionicons name="checkmark" size={18} color={colors.textInverse} />
            <Text style={styles.saveText}>Salvar registro</Text>
          </>
        )}
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  textarea: { minHeight: 88, textAlignVertical: 'top' },
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

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    boxShadow: '0 10px 24px rgba(124, 58, 237, 0.35)',
    elevation: 6,
  },
  saveDisabled: { opacity: 0.7 },
  saveText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
