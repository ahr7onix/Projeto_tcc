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
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Divider } from '@/components/Divider';
import { FormField } from '@/components/FormField';
import { Logo } from '@/components/Logo';
import { SocialButton, type SocialProvider } from '@/components/SocialButton';
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

  const handleSocial = (provider: SocialProvider) => {
    Alert.alert(
      'Em breve',
      `Login com ${provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Facebook'} ainda não foi configurado. Veja docs/auth-roadmap.md.`,
    );
  };

  const errorMessage = login.isError
    ? extractAuthError(login.error, 'E-mail ou senha incorretos.')
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
        >
          <View style={styles.brand}>
            <Logo size={56} />
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Fazer Login</Text>
            <Text style={styles.subtitle}>Acesse seu painel de saúde</Text>
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
            <FormField
              control={control}
              name="senha"
              variant="pill"
              icon="lock-closed-outline"
              secureTextEntry
              placeholder="Sua senha"
            />

            <Pressable style={styles.forgot}>
              <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
            </Pressable>

            {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, login.isPending && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={login.isPending}
            >
              {login.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>Acessar Conta</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.dividerWrap}>
            <Divider label="ou continue com" />
          </View>

          <View style={styles.social}>
            {Platform.OS === 'ios' ? (
              <SocialButton provider="apple" onPress={() => handleSocial('apple')} disabled />
            ) : null}
            <SocialButton provider="google" onPress={() => handleSocial('google')} disabled />
            <SocialButton provider="facebook" onPress={() => handleSocial('facebook')} disabled />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Novo por aqui?{' '}
              <Link href="/(auth)/cadastro" style={styles.footerLink}>
                Cadastre-se
              </Link>
            </Text>
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
  subtitle: { ...typography.body, color: colors.textMuted },
  form: { gap: spacing.md },
  forgot: { alignSelf: 'flex-end' },
  forgotText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  errorBanner: { ...typography.caption, color: colors.danger, textAlign: 'center' },
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
  primaryBtnText: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
  dividerWrap: { marginTop: spacing.md },
  social: { gap: spacing.sm },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  footerText: { ...typography.body, color: colors.textMuted },
  footerLink: { color: colors.primary, fontWeight: '700' },
});
