import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from '@/components/FormField';
import { SelectField } from '@/components/SelectField';
import {
  onboardingPacienteSchema,
  type OnboardingPacienteOutput,
  type OnboardingPacienteValues,
} from '@/lib/validation/auth';
import { SEXOS, TIPOS_DIABETES } from '@/types/auth';
import { updatePacienteData } from '@/lib/api/perfil';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

function formatDateMask(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits;
  if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length > 4)
    out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  return out;
}

export default function OnboardingPacienteScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit } = useForm<OnboardingPacienteValues>({
    resolver: zodResolver(onboardingPacienteSchema),
    defaultValues: {
      dataNascimento: '',
      sexo: undefined,
      tipoDiabetes: undefined,
      peso: '',
      altura: '',
      restricoesAlergias: '',
    } as unknown as OnboardingPacienteValues,
  });

  const onSubmit = handleSubmit(async (raw) => {
    const values = raw as unknown as OnboardingPacienteOutput;
    setSaving(true);
    try {
      await updatePacienteData({
        dataNascimento: values.dataNascimento,
        sexo: values.sexo,
        tipoDiabetes: values.tipoDiabetes,
        peso: values.peso,
        altura: values.altura,
        restricoesAlergias: values.restricoesAlergias || undefined,
      });
      await updateUser({ perfilCompleto: true });
      Alert.alert(
        'Tudo pronto!',
        'Suas informações foram salvas. Agora seu nutricionista pode te acompanhar.',
        [{ text: 'Continuar', onPress: () => router.replace('/(tabs)/home') }],
      );
    } catch {
      Alert.alert(
        'Não foi possível salvar',
        'Verifique sua conexão e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logoBox}>
              <Ionicons name="person-add-outline" size={30} color={colors.primary} />
            </View>
            <Text style={styles.heroEyebrow}>Bem-vindo{user?.nome ? `, ${user.nome.split(' ')[0]}` : ''}</Text>
            <Text style={styles.heroTitle}>Vamos conhecer você</Text>
            <Text style={styles.heroSubtitle}>
              Essas informações ajudam seu nutricionista a montar um plano sob medida.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.form}>
              <Text style={styles.section}>Dados pessoais</Text>

              <FormField
                control={control}
                name="dataNascimento"
                label="Data de nascimento"
                icon="calendar-outline"
                placeholder="DD/MM/AAAA"
                keyboardType="number-pad"
                maxLength={10}
                transform={formatDateMask}
              />

              <SelectField
                control={control}
                name="sexo"
                label="Sexo"
                placeholder="Selecione"
                options={SEXOS}
              />

              <Text style={[styles.section, styles.sectionTop]}>Saúde</Text>

              <SelectField
                control={control}
                name="tipoDiabetes"
                label="Tipo de diabetes"
                placeholder="Selecione"
                options={TIPOS_DIABETES}
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <FormField
                    control={control}
                    name="peso"
                    label="Peso (kg)"
                    icon="fitness-outline"
                    keyboardType="decimal-pad"
                    placeholder="72,5"
                  />
                </View>
                <View style={styles.col}>
                  <FormField
                    control={control}
                    name="altura"
                    label="Altura (m)"
                    icon="resize-outline"
                    keyboardType="decimal-pad"
                    placeholder="1,74"
                  />
                </View>
              </View>

              <FormField
                control={control}
                name="restricoesAlergias"
                label="Restrições e alergias"
                icon="alert-circle-outline"
                placeholder="Ex.: lactose, amendoim (opcional)"
                multiline
                numberOfLines={3}
              />

              <Pressable
                style={[styles.primaryBtn, saving && styles.btnDisabled]}
                onPress={onSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Concluir cadastro</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
                  </>
                )}
              </Pressable>

              <Text style={styles.helpText}>
                Você poderá atualizar essas informações depois em Perfil.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, backgroundColor: colors.backgroundAlt },

  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)',
    elevation: 8,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.85)',
  },
  heroTitle: {
    ...typography.h1,
    color: colors.textInverse,
    fontSize: 26,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 300,
    marginTop: spacing.xs,
  },

  card: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: -spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  form: { gap: spacing.md },
  section: {
    ...typography.eyebrow,
    color: colors.primary,
  },
  sectionTop: { marginTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    boxShadow: '0 10px 24px rgba(124, 58, 237, 0.35)',
    elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: colors.textInverse, fontSize: 15, fontWeight: '700' },

  helpText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
