import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox } from '@/components/Checkbox';
import { ChipGroup } from '@/components/ChipGroup';
import { FormField } from '@/components/FormField';
import { Logo } from '@/components/Logo';
import { SectionLabel } from '@/components/SectionLabel';
import { SelectField } from '@/components/SelectField';
import { extractAuthError, useCadastro } from '@/hooks/use-auth';
import {
  cadastroSchema,
  type CadastroFormValues,
} from '@/lib/validation/auth';
import { SEXOS, TIPOS_DIABETES } from '@/types/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function CadastroScreen() {
  const { control, handleSubmit } = useForm<CadastroFormValues>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: {
      nome: '',
      email: '',
      dataNascimento: '',
      senha: '',
      aceiteTermos: false as unknown as true,
    },
  });
  const cadastro = useCadastro();

  const onSubmit = handleSubmit((values) => {
    cadastro.mutate({
      nome: values.nome,
      email: values.email,
      senha: values.senha,
      dataNascimento: values.dataNascimento,
      sexo: values.sexo,
      tipoDiabetes: values.tipoDiabetes,
      role: 'paciente',
    });
  });

  const errorMessage = cadastro.isError
    ? extractAuthError(cadastro.error, 'Não foi possível criar a conta.')
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Logo size={48} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Nova Conta</Text>
            <Text style={styles.subtitle}>
              Em menos de um minuto você começa a cuidar da sua saúde com a gente.
            </Text>
          </View>

          <View style={styles.form}>
            <SectionLabel>Sobre você</SectionLabel>

            <FormField
              control={control}
              name="nome"
              variant="pill"
              placeholder="Nome completo"
            />
            <FormField
              control={control}
              name="email"
              variant="pill"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="Seu melhor e-mail"
            />
            <FormField
              control={control}
              name="dataNascimento"
              variant="pill"
              keyboardType="number-pad"
              placeholder="Data de nascimento (DD/MM/AAAA)"
              maxLength={10}
              transform={maskDate}
            />

            <Text style={styles.fieldLabel}>Sexo biológico</Text>
            <ChipGroup control={control} name="sexo" options={SEXOS} />

            <SectionLabel>Sua saúde</SectionLabel>

            <SelectField
              control={control}
              name="tipoDiabetes"
              placeholder="Tipo de diabetes"
              options={TIPOS_DIABETES}
            />

            <SectionLabel>Acesso</SectionLabel>

            <FormField
              control={control}
              name="senha"
              variant="pill"
              secureTextEntry
              placeholder="Crie uma senha"
            />
            <Text style={styles.hint}>
              Use 8+ caracteres, com letras e números.
            </Text>

            <View style={styles.terms}>
              <Checkbox control={control} name="aceiteTermos">
                <>
                  Li e aceito os{' '}
                  <Text style={styles.termsLink}>Termos de Uso</Text> e a{' '}
                  <Text style={styles.termsLink}>Política de Privacidade</Text>,
                  incluindo o tratamento dos meus dados de saúde conforme a LGPD.
                </>
              </Checkbox>
            </View>

            {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, cadastro.isPending && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={cadastro.isPending}
            >
              {cadastro.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>Finalizar cadastro</Text>
              )}
            </Pressable>

            <Link href="/(auth)/login" style={styles.linkText}>
              Já tenho conta
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  brand: { alignItems: 'flex-start', marginBottom: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.text, fontSize: 30 },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 21,
  },
  form: { gap: spacing.md },
  fieldLabel: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  terms: { marginTop: spacing.md, marginBottom: spacing.xs },
  termsLink: { color: colors.primary, fontWeight: '600' },
  errorBanner: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    boxShadow: '0 6px 12px rgba(37, 99, 235, 0.3)',
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: {
    textAlign: 'center',
    color: colors.text,
    marginTop: spacing.md,
    fontSize: 14,
  },
});
