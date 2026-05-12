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
import { FormField } from '@/components/FormField';
import { Logo } from '@/components/Logo';
import { extractAuthError, useEsqueciSenha } from '@/hooks/use-auth';
import {
  esqueciSenhaSchema,
  type EsqueciSenhaFormValues,
} from '@/lib/validation/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function EsqueciSenhaScreen() {
  const { control, handleSubmit, getValues } = useForm<EsqueciSenhaFormValues>({
    resolver: zodResolver(esqueciSenhaSchema),
    defaultValues: { email: '' },
  });
  const esqueciSenha = useEsqueciSenha();

  const onSubmit = handleSubmit((values) => {
    esqueciSenha.mutate({ email: values.email.trim() });
  });

  const errorMessage = esqueciSenha.isError
    ? extractAuthError(
        esqueciSenha.error,
        'Não foi possível enviar o e-mail agora. Tente novamente.',
      )
    : null;

  if (esqueciSenha.isSuccess) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.brand}>
            <Logo size={56} />
          </View>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Verifique seu e-mail</Text>
            <Text style={styles.subtitle}>
              Se encontrarmos uma conta para{' '}
              <Text style={styles.emailHighlight}>{getValues('email')}</Text>,
              você receberá um link para redefinir sua senha em alguns minutos.
            </Text>
            <Text style={styles.helpText}>
              Não chegou? Confira a caixa de spam ou tente novamente em alguns
              minutos.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => esqueciSenha.reset()}
            >
              <Text style={styles.secondaryBtnText}>Tentar outro e-mail</Text>
            </Pressable>

            <Link href="/(auth)" style={styles.linkText}>
              Voltar para o login
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Logo size={56} />
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              Informe o e-mail cadastrado e enviaremos um link para você criar
              uma nova senha.
            </Text>
          </View>

          <View style={styles.form}>
            <FormField
              control={control}
              name="email"
              variant="pill"
              icon="mail-outline"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="Seu e-mail"
            />

            {errorMessage ? (
              <Text style={styles.errorBanner}>{errorMessage}</Text>
            ) : null}

            <Pressable
              style={[
                styles.primaryBtn,
                esqueciSenha.isPending && styles.btnDisabled,
              ]}
              onPress={onSubmit}
              disabled={esqueciSenha.isPending}
            >
              {esqueciSenha.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>Enviar link</Text>
              )}
            </Pressable>

            <Link href="/(auth)" style={styles.linkText}>
              Voltar para o login
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  brand: { alignItems: 'flex-start' },
  headerBlock: { gap: spacing.xs },
  title: { ...typography.h1, color: colors.text, fontSize: 30 },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 21,
  },
  emailHighlight: { color: colors.text, fontWeight: '600' },
  helpText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  form: { gap: spacing.md },
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
    marginTop: spacing.sm,
    boxShadow: '0 6px 12px rgba(37, 99, 235, 0.3)',
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: { gap: spacing.md, marginTop: spacing.md },
  linkText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.md,
  },
});
