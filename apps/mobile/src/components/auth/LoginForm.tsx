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
      <SocialButton provider="google" tone="glass" loading={loading} disabled />
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
      tone="glass"
      loading={loginGoogle.isPending}
      disabled={!googleRequest || pending}
      onPress={() => handleSocial('google')}
    />
  );

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
                  <Ionicons name="alert-circle" size={16} color="#FECACA" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {isSignUp ? (
                <View style={styles.form}>
                  <FormField
                    control={cadastroForm.control}
                    name="nome"
                    variant="glass"
                    icon="person-outline"
                    placeholder="Nome completo"
                    autoComplete="name"
                  />
                  <FormField
                    control={cadastroForm.control}
                    name="email"
                    variant="glass"
                    icon="mail-outline"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="E-mail"
                  />
                  <FormField
                    control={cadastroForm.control}
                    name="senha"
                    variant="glass"
                    icon="lock-closed-outline"
                    secureTextEntry
                    placeholder="Senha (mín. 8 caracteres)"
                    autoComplete="new-password"
                  />
                  <Text style={styles.hint}>
                    Use 8+ caracteres, com letras e números.
                  </Text>
                  <Checkbox control={cadastroForm.control} name="aceiteTermos" tone="glass">
                    <>
                      Li e aceito os{' '}
                      <Text style={styles.termsLink}>Termos de Uso</Text> e a{' '}
                      <Text style={styles.termsLink}>Política de Privacidade</Text>.
                    </>
                  </Checkbox>
                  <Pressable
                    style={[styles.primaryBtn, pending && styles.btnDisabled]}
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
                    <Divider label="ou continue com" tone="glass" />
                  </View>

                  {googleButton}
                </View>
              ) : (
                <View style={styles.form}>
                  <FormField
                    control={loginForm.control}
                    name="email"
                    variant="glass"
                    icon="mail-outline"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="Endereço de e-mail"
                  />
                  <FormField
                    control={loginForm.control}
                    name="senha"
                    variant="glass"
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
                    style={[styles.primaryBtn, pending && styles.btnDisabled]}
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
                    <Divider label="ou continue com" tone="glass" />
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
  hint: {
    ...typography.caption,
    color: colors.authMuted,
    marginTop: -spacing.xs,
  },
  termsLink: { color: colors.authFocus, fontWeight: '700' },
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.xs },
  forgotText: {
    ...typography.caption,
    color: colors.authMuted,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.caption,
    color: '#FECACA',
    flex: 1,
    fontWeight: '600',
  },
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
  dividerWrap: { marginTop: spacing.xs },
  toggle: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.body,
    color: colors.authMuted,
    textAlign: 'center',
  },
  toggleStrong: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  googleWebWrap: {
    position: 'relative',
    width: '100%',
    minHeight: 48,
  },
});
