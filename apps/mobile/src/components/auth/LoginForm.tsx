import { useCallback, useEffect, useState } from 'react';
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
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Checkbox } from '@/components/Checkbox';
import { Divider } from '@/components/Divider';
import { FormField } from '@/components/FormField';
import { SocialButton, type SocialProvider } from '@/components/SocialButton';
import {
  extractAuthError,
  useCadastro,
  useLogin,
  useLoginGoogle,
} from '@/hooks/use-auth';
import {
  isGoogleAuthConfigured,
  mountGoogleWebButton,
  useNativeGoogleAuthRequest,
} from '@/lib/google-sign-in';
import {
  cadastroSchema,
  loginSchema,
  type CadastroFormValues,
  type LoginFormValues,
} from '@/lib/validation/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Mode = 'login' | 'cadastro';

interface Props {
  initialMode?: Mode;
}

function GoogleWebButton({
  loading,
  disabled,
  onCredential,
  onError,
}: {
  loading?: boolean;
  disabled?: boolean;
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || disabled || !host) return;
    return mountGoogleWebButton(host, onCredential, onError);
  }, [host, disabled, onCredential, onError]);

  return (
    <View style={styles.googleWebWrap}>
      <SocialButton provider="google" loading={loading} disabled={disabled} />
      {Platform.OS === 'web' ? (
        // Host DOM real para o botão oficial do Google (web / popup, sem redirect_uri)
        <div
          ref={setHost}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            opacity: 0.02,
            overflow: 'hidden',
            pointerEvents: disabled || loading ? 'none' : 'auto',
          }}
        />
      ) : null}
    </View>
  );
}

export function LoginForm({ initialMode = 'login' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const isSignUp = mode === 'cadastro';
  const isWeb = Platform.OS === 'web';

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  });
  const cadastroForm = useForm<CadastroFormValues>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: {
      nome: '',
      email: '',
      senha: '',
      role: 'paciente',
      aceiteTermos: false as unknown as true,
    },
  });

  const login = useLogin();
  const cadastro = useCadastro();
  const loginGoogle = useLoginGoogle();
  const googleConfigured = isGoogleAuthConfigured();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [googleRequest, googleResponse, promptGoogle] = useNativeGoogleAuthRequest();

  const submitGoogleToken = useCallback((idToken: string) => {
    setGoogleError(null);
    loginGoogle.mutate(idToken, {
      onError: (err) => {
        setGoogleError(extractAuthError(err, 'Não foi possível entrar com Google.'));
      },
    });
  }, [loginGoogle]);

  const handleGoogleWebError = useCallback((message: string) => {
    setGoogleError(message);
  }, []);

  useEffect(() => {
    if (isWeb || !googleResponse) return;
    if (googleResponse.type === 'success') {
      const idToken = googleResponse.params.id_token;
      if (!idToken) {
        setGoogleError('O Google não retornou o token de identidade.');
        return;
      }
      submitGoogleToken(idToken);
      return;
    }
    if (googleResponse.type === 'error') {
      setGoogleError(googleResponse.error?.message || 'Falha no login com Google.');
    }
  }, [googleResponse, isWeb]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (next: Mode) => {
    setMode(next);
    login.reset();
    cadastro.reset();
    loginGoogle.reset();
    setGoogleError(null);
    if (next === 'cadastro') {
      router.replace('/(auth)/cadastro');
    } else {
      router.replace('/(auth)/login/cliente');
    }
  };

  const onLogin = loginForm.handleSubmit((values) => {
    login.mutate(values);
  });

  const onCadastro = cadastroForm.handleSubmit((values) => {
    cadastro.mutate({
      nome: values.nome,
      email: values.email,
      senha: values.senha,
      role: 'paciente',
    });
  });

  const handleGoogleNative = async () => {
    setGoogleError(null);
    if (!googleConfigured) {
      Alert.alert(
        'Google não configurado',
        'Defina EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no arquivo .env do app mobile e reinicie o Expo.',
      );
      return;
    }
    try {
      await promptGoogle();
    } catch (err) {
      setGoogleError(
        err instanceof Error ? err.message : 'Não foi possível abrir o login do Google.',
      );
    }
  };

  const handleSocial = (provider: SocialProvider) => {
    if (provider === 'google') {
      void handleGoogleNative();
      return;
    }
    Alert.alert(
      'Em breve',
      `Login com ${provider === 'apple' ? 'Apple' : 'Facebook'} ainda não foi configurado.`,
    );
  };

  const pending =
    (isSignUp ? cadastro.isPending : login.isPending) || loginGoogle.isPending;
  const errorMessage = googleError
    ? googleError
    : isSignUp
      ? cadastro.isError
        ? extractAuthError(cadastro.error, 'Não foi possível criar a conta.')
        : null
      : login.isError
        ? extractAuthError(login.error, 'E-mail ou senha incorretos.')
        : null;

  const googleButton = isWeb ? (
    <GoogleWebButton
      loading={loginGoogle.isPending}
      disabled={!googleConfigured || pending}
      onCredential={submitGoogleToken}
      onError={handleGoogleWebError}
    />
  ) : (
    <SocialButton
      provider="google"
      loading={loginGoogle.isPending}
      disabled={!googleRequest || pending}
      onPress={() => handleSocial('google')}
    />
  );

  return (
    <View style={styles.root}>
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
              <Text style={styles.title}>
                {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUp
                  ? 'Cadastre-se no app para acompanhar glicemia e refeições com seu nutricionista.'
                  : 'Entre para acompanhar sua glicemia e refeições.'}
              </Text>

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {isSignUp ? (
                <View style={styles.form}>
                  <FormField
                    control={cadastroForm.control}
                    name="nome"
                    icon="person-outline"
                    placeholder="Nome completo"
                    autoComplete="name"
                  />
                  <FormField
                    control={cadastroForm.control}
                    name="email"
                    icon="mail-outline"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="E-mail"
                  />
                  <FormField
                    control={cadastroForm.control}
                    name="senha"
                    icon="lock-closed-outline"
                    secureTextEntry
                    placeholder="Senha (mín. 8 caracteres)"
                    autoComplete="new-password"
                  />
                  <Text style={styles.hint}>
                    Use 8+ caracteres, com letras e números.
                  </Text>
                  <Checkbox control={cadastroForm.control} name="aceiteTermos">
                    <>
                      Li e aceito os{' '}
                      <Text style={styles.termsLink}>Termos de Uso</Text> e a{' '}
                      <Text style={styles.termsLink}>Política de Privacidade</Text>.
                    </>
                  </Checkbox>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.primaryBtnPressed,
                      pending && styles.btnDisabled,
                    ]}
                    onPress={onCadastro}
                    disabled={pending}
                  >
                    {pending && !loginGoogle.isPending ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Cadastrar</Text>
                    )}
                  </Pressable>

                  <View style={styles.dividerWrap}>
                    <Divider label="ou continue com" />
                  </View>

                  {googleButton}
                </View>
              ) : (
                <View style={styles.form}>
                  <FormField
                    control={loginForm.control}
                    name="email"
                    icon="mail-outline"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="Endereço de e-mail"
                  />
                  <FormField
                    control={loginForm.control}
                    name="senha"
                    icon="lock-closed-outline"
                    secureTextEntry
                    placeholder="Senha"
                  />

                  <Link href="/(auth)/esqueci-senha" asChild>
                    <Pressable style={styles.forgot}>
                      <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                    </Pressable>
                  </Link>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.primaryBtnPressed,
                      pending && styles.btnDisabled,
                    ]}
                    onPress={onLogin}
                    disabled={pending}
                  >
                    {pending && !loginGoogle.isPending ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Entrar</Text>
                    )}
                  </Pressable>

                  <View style={styles.dividerWrap}>
                    <Divider label="ou continue com" />
                  </View>

                  {googleButton}
                </View>
              )}

              <Pressable
                style={styles.toggle}
                onPress={() => switchMode(isSignUp ? 'login' : 'cadastro')}
              >
                <Text style={styles.toggleText}>
                  {isSignUp ? 'Já tem conta? ' : 'Novo por aqui? '}
                  <Text style={styles.toggleStrong}>
                    {isSignUp ? 'Entrar' : 'Criar conta'}
                  </Text>
                </Text>
              </Pressable>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    boxShadow: '0 4px 12px rgba(16, 24, 40, 0.08)',
    elevation: 3,
  },
  brand: {
    ...typography.eyebrow,
    color: colors.primary,
    letterSpacing: 1,
    textAlign: 'center',
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  form: { gap: spacing.md, width: '100%' },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  termsLink: { color: colors.primary, fontWeight: '700' },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
    paddingVertical: spacing.xs,
  },
  forgotText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
    fontWeight: '600',
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  primaryBtnPressed: { backgroundColor: colors.primaryDark },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  dividerWrap: { marginTop: spacing.sm },
  toggle: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSoft,
    textAlign: 'center',
  },
  toggleStrong: {
    color: colors.primary,
    fontWeight: '700',
  },
  googleWebWrap: {
    position: 'relative',
    width: '100%',
    minHeight: 48,
  },
});
