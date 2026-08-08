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
  const firstName = user?.nome?.split(' ')[0];

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
    <View style={styles.root}>
      <View style={styles.bgBlobA} />
      <View style={styles.bgBlobB} />
      <View style={styles.bgBlobC} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.panel}>
              <Text style={styles.brand}>NutriCare</Text>
              <Text style={styles.title}>Vamos conhecer você</Text>
              <Text style={styles.subtitle}>
                {firstName
                  ? `Oi, ${firstName}. Essas informações ajudam seu nutricionista a montar um plano sob medida.`
                  : 'Essas informações ajudam seu nutricionista a montar um plano sob medida.'}
              </Text>

              <View style={styles.form}>
                <Text style={styles.section}>Dados pessoais</Text>

                <FormField
                  control={control}
                  name="dataNascimento"
                  variant="glass"
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
                  tone="glass"
                  label="Sexo"
                  placeholder="Selecione"
                  options={SEXOS}
                />

                <Text style={[styles.section, styles.sectionTop]}>Saúde</Text>

                <SelectField
                  control={control}
                  name="tipoDiabetes"
                  tone="glass"
                  label="Tipo de diabetes"
                  placeholder="Selecione"
                  options={TIPOS_DIABETES}
                />

                <View style={styles.row}>
                  <View style={styles.col}>
                    <FormField
                      control={control}
                      name="peso"
                      variant="glass"
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
                      variant="glass"
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
                  variant="glass"
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
                    <Text style={styles.primaryBtnText}>Concluir cadastro</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.authBg1,
    overflow: 'hidden',
  },
  bgBlobA: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(108, 34, 189, 0.35)',
    top: -80,
    left: -60,
  },
  bgBlobB: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(157, 78, 221, 0.22)',
    bottom: -40,
    right: -70,
  },
  bgBlobC: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(11, 0, 26, 0.55)',
    top: '42%',
    left: '30%',
  },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: colors.authGlass,
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
    elevation: 12,
  },
  brand: {
    ...typography.eyebrow,
    color: colors.authBrand,
    letterSpacing: 2.2,
    textAlign: 'center',
    fontSize: 12,
  },
  title: {
    ...typography.h1,
    color: colors.textInverse,
    fontSize: 26,
    letterSpacing: 0.4,
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    ...typography.body,
    color: colors.authMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
  form: { gap: spacing.md, width: '100%' },
  section: {
    ...typography.eyebrow,
    color: colors.authFocus,
    letterSpacing: 1.2,
  },
  sectionTop: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C22BD',
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    boxShadow: '0 10px 20px rgba(108, 34, 189, 0.35)',
    elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  helpText: {
    ...typography.caption,
    color: colors.authMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
