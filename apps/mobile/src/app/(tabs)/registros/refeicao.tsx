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
import { colors, radius, spacing, typography } from '@/lib/theme';

type Tipo = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'ceia';

const tipos: { key: Tipo; label: string }[] = [
  { key: 'cafe', label: 'Café da manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche', label: 'Lanche' },
  { key: 'jantar', label: 'Jantar' },
  { key: 'ceia', label: 'Ceia' },
];

export default function RegistrarRefeicaoScreen() {
  const [tipo, setTipo] = useState<Tipo>('almoco');
  const [descricao, setDescricao] = useState('');
  const [carboidratos, setCarboidratos] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!descricao.trim()) {
      Alert.alert('Descrição obrigatória', 'Descreva o que foi consumido.');
      return;
    }
    setSaving(true);
    // TODO: integrar com API POST /registros/refeicao
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Registrado', 'Sua refeição foi registrada.');
      router.back();
    }, 600);
  };

  return (
    <ScreenContainer
      eyebrow="Novo registro"
      title="Refeição"
      subtitle="Descreva sua refeição para o nutricionista acompanhar."
      showBack
    >
      <Card title="Refeição">
        <View style={styles.field}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.chips}>
            {tipos.map((t) => {
              const active = tipo === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTipo(t.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>O que você comeu?</Text>
          <TextInput
            value={descricao}
            onChangeText={setDescricao}
            style={[styles.input, styles.textarea]}
            placeholder="Ex.: arroz, feijão, frango grelhado, salada"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Carboidratos estimados (g)</Text>
          <TextInput
            value={carboidratos}
            onChangeText={setCarboidratos}
            style={styles.input}
            keyboardType="numeric"
            placeholder="Opcional"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            value={observacoes}
            onChangeText={setObservacoes}
            style={[styles.input, styles.textarea]}
            placeholder="Como se sentiu, dificuldades, etc."
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
  chipActive: { backgroundColor: colors.success, borderColor: colors.success },
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
