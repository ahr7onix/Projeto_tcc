import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
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
import { criarEmocional, ESTADOS, type EstadoEmocional } from '@/lib/api/emocional';
import { colors, radius, spacing, typography } from '@/lib/theme';

/** Fatores comuns no acompanhamento do diabetes, para não obrigar a digitar. */
const FATORES = [
  'Trabalho',
  'Família',
  'Sono',
  'Alimentação',
  'Exercício',
  'Glicemia',
  'Saúde',
  'Dinheiro',
];

const INTENSIDADES = [1, 2, 3, 4, 5];

export default function RegistrarHumorScreen() {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoEmocional | null>(null);
  const [intensidade, setIntensidade] = useState(3);
  const [fatores, setFatores] = useState<string[]>([]);
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const alternarFator = (fator: string) => {
    setFatores((atuais) =>
      atuais.includes(fator) ? atuais.filter((f) => f !== fator) : [...atuais, fator],
    );
  };

  const onSave = async () => {
    if (!estado) {
      Alert.alert('Escolha como você está', 'Toque em uma das carinhas para continuar.');
      return;
    }

    setSaving(true);
    try {
      await criarEmocional({
        estado,
        intensidade,
        // A API guarda os fatores como texto livre; a lista de chips vira uma
        // frase simples separada por vírgula.
        fatores: fatores.length ? fatores.join(', ') : undefined,
        observacao: observacao.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['emocional'] });
      queryClient.invalidateQueries({ queryKey: ['emocional-resumo'] });

      const rotuloEstado = ESTADOS.find((e) => e.valor === estado)?.rotulo ?? 'seu estado';
      Alert.alert(
        'Registro salvo',
        `Obrigado por compartilhar. Anotamos "${rotuloEstado}" para hoje — isso ajuda a nutricionista a entender como seus resultados se relacionam com o seu bem-estar.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o registro. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      eyebrow="Novo registro"
      title="Como você está hoje?"
      subtitle="O acompanhamento emocional ajuda a nutricionista a entender seus resultados."
      showBack
    >
      <Card title="Seu estado">
        <View style={styles.estados}>
          {ESTADOS.map((e) => {
            const ativo = estado === e.valor;
            return (
              <Pressable
                key={e.valor}
                onPress={() => setEstado(e.valor)}
                style={[styles.estado, ativo && styles.estadoActive]}
              >
                <Text style={styles.emoji}>{e.emoji}</Text>
                <Text style={[styles.estadoTexto, ativo && styles.estadoTextoActive]}>
                  {e.rotulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card title="Com que intensidade?">
        <View style={styles.chips}>
          {INTENSIDADES.map((n) => {
            const ativo = intensidade === n;
            return (
              <Pressable
                key={n}
                onPress={() => setIntensidade(n)}
                style={[styles.chip, ativo && styles.chipActive]}
              >
                <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.dica}>1 é pouco intenso e 5 é muito intenso.</Text>
      </Card>

      <Card title="O que influenciou?">
        <View style={styles.chips}>
          {FATORES.map((f) => {
            const ativo = fatores.includes(f);
            return (
              <Pressable
                key={f}
                onPress={() => alternarFator(f)}
                style={[styles.chip, ativo && styles.chipActive]}
              >
                <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.dica}>Pode marcar mais de um, ou nenhum.</Text>
      </Card>

      <Card title="Quer contar mais alguma coisa?">
        <TextInput
          value={observacao}
          onChangeText={setObservacao}
          style={[styles.input, styles.textarea]}
          placeholder="Opcional"
          placeholderTextColor={colors.textMuted}
          multiline
        />
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
  estados: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  estado: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  estadoActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  emoji: { fontSize: 26 },
  estadoTexto: { fontSize: 12, fontWeight: '600', color: colors.textSoft },
  estadoTextoActive: { color: colors.primaryDark },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minWidth: 44,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSoft },
  chipTextActive: { color: colors.textInverse },

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
  dica: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },

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
