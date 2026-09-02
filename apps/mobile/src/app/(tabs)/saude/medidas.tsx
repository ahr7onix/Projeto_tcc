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
import { criarAntropometria } from '@/lib/api/antropometria';
import { colors, radius, spacing, typography } from '@/lib/theme';

/** Campo vazio some do envio: a API distingue "não informado" de zero. */
const numero = (texto: string): number | undefined => {
  const limpo = texto.trim().replace(',', '.');
  if (!limpo) return undefined;
  const valor = Number(limpo);
  return Number.isNaN(valor) ? undefined : valor;
};

export default function RegistrarMedidasScreen() {
  const queryClient = useQueryClient();
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [cintura, setCintura] = useState('');
  const [quadril, setQuadril] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const dados = {
      peso: numero(peso),
      altura: numero(altura),
      circCintura: numero(cintura),
      circQuadril: numero(quadril),
      observacao: observacao.trim() || undefined,
    };

    if (!dados.peso && !dados.altura && !dados.circCintura && !dados.circQuadril) {
      Alert.alert('Nada para salvar', 'Informe pelo menos uma medida.');
      return;
    }
    if (dados.altura && (dados.altura < 0.51 || dados.altura > 2.59)) {
      Alert.alert('Altura inválida', 'Informe a altura em metros, como 1,72.');
      return;
    }

    setSaving(true);
    try {
      const registro = await criarAntropometria(dados);
      // A tela de saúde monta os cartões com essas duas consultas; invalidar as
      // duas evita o paciente voltar e ver o número antigo.
      queryClient.invalidateQueries({ queryKey: ['antropometria'] });
      queryClient.invalidateQueries({ queryKey: ['antropometria-evolucao'] });

      const corpo = registro.imc
        ? `IMC calculado: ${registro.imc}${registro.rotuloImc ? ` (${registro.rotuloImc})` : ''}.`
        : 'Suas medidas foram registradas.';
      Alert.alert('Medidas registradas', corpo, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as medidas. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      eyebrow="Novo registro"
      title="Medidas corporais"
      subtitle="Anote seu peso e suas circunferências para acompanhar a evolução."
      showBack
    >
      <Card title="Peso e altura">
        <View style={styles.linha}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput
              value={peso}
              onChangeText={setPeso}
              style={styles.input}
              keyboardType="numeric"
              placeholder="Ex.: 72,5"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Altura (m)</Text>
            <TextInput
              value={altura}
              onChangeText={setAltura}
              style={styles.input}
              keyboardType="numeric"
              placeholder="Ex.: 1,72"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <Text style={styles.dica}>
          O IMC é calculado automaticamente quando você informa peso e altura.
        </Text>
      </Card>

      <Card title="Circunferências (cm)">
        <View style={styles.linha}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Cintura</Text>
            <TextInput
              value={cintura}
              onChangeText={setCintura}
              style={styles.input}
              keyboardType="numeric"
              placeholder="Ex.: 84"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Quadril</Text>
            <TextInput
              value={quadril}
              onChangeText={setQuadril}
              style={styles.input}
              keyboardType="numeric"
              placeholder="Ex.: 98"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <Text style={styles.dica}>
          Meça sem apertar a fita. Com as duas medidas o app calcula a relação
          cintura/quadril, usada na avaliação de risco.
        </Text>
      </Card>

      <Card title="Observações">
        <TextInput
          value={observacao}
          onChangeText={setObservacao}
          style={[styles.input, styles.textarea]}
          placeholder="Horário da medição, roupa, jejum..."
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
            <Text style={styles.saveText}>Salvar medidas</Text>
          </>
        )}
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', gap: spacing.md },
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
  dica: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 2,
  },
  saveDisabled: { opacity: 0.7 },
  saveText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
