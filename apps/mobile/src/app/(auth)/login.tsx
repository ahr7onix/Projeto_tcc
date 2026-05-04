import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/FormField';
import { extractAuthError, useLogin } from '@/hooks/use-auth';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function LoginScreen() {
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  });
  const login = useLogin();

  const onSubmit = handleSubmit((values) => {
    login.mutate(values);
  });

  const errorMessage = login.isError
    ? extractAuthError(login.error, 'E-mail ou senha incorretos.')
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>Acesse sua conta para continuar</Text>
        </View>

        <View style={styles.form}>
          <FormField
            control={control}
            name="email"
            label="E-mail"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="voce@exemplo.com"
          />
          <FormField
            control={control}
            name="senha"
            label="Senha"
            secureTextEntry
            placeholder="••••••••"
          />

          {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

          <Pressable
            style={[styles.button, login.isPending && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={login.isPending}
          >
            {login.isPending ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>

          <Link href="/(auth)/cadastro" style={styles.linkText}>
            Não tem conta? Cadastre-se
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  header: { marginBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  form: { gap: spacing.lg },
  errorBanner: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.textInverse, fontSize: 16, fontWeight: '600' },
  linkText: { textAlign: 'center', color: colors.primary, marginTop: spacing.md },
});
