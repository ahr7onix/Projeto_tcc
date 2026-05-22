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
import { Ionicons } from '@expo/vector-icons';
import { Divider } from '@/components/Divider';
import { FormField } from '@/components/FormField';
import { SocialButton, type SocialProvider } from '@/components/SocialButton';
import { extractAuthError, useLogin, useLoginGoogle } from '@/hooks/use-auth';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'COLOQUE_SEU_WEB_CLIENT_ID_AQUI',
});

const COPY = {
  eyebrow: 'Acesso do cliente',
  title: 'Bem-vindo de volta',
  subtitle: 'Entre para acompanhar sua glicemia e refeições.',
  icon: 'person-outline' as const,
};

export function LoginForm() {
  const copy = COPY;

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  });
  const login = useLogin();

  const onSubmit = handleSubmit((values) => {
    login.mutate(values);
  });

  const loginGoogle = useLoginGoogle();

  const handleSocial = async (provider: SocialProvider) => {
    if (provider === 'google') {
      try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken;
        if (!idToken) throw new Error('Token do Google não encontrado.');
        
        loginGoogle.mutate(idToken);
      } catch (error: any) {
        if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
          Alert.alert('Erro no Google', error.message || 'Falha ao autenticar.');
        }
      }
    } else {
      Alert.alert(
        'Em breve',
        `Login com ${provider === 'apple' ? 'Apple' : 'Facebook'} ainda não foi configurado.`,
      );
    }
  };

  const errorMessage = login.isError
    ? extractAuthError(login.error, 'E-mail ou senha incorretos.')
    : null;

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
              <Ionicons name={copy.icon} size={32} color={colors.primary} />
            </View>
            <Text style={styles.heroEyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.heroTitle}>{copy.title}</Text>
            <Text style={styles.heroSubtitle}>{copy.subtitle}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.form}>
              <FormField
                control={control}
                name="email"
                label="E-mail"
                icon="mail-outline"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="seu@email.com"
              />
              <FormField
                control={control}
                name="senha"
                label="Senha"
                icon="lock-closed-outline"
                secureTextEntry
                placeholder="Sua senha"
              />

              <Link href="/(auth)/esqueci-senha" style={styles.forgot} asChild>
                <Pressable>
                  <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
                </Pressable>
              </Link>

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.primaryBtn, login.isPending && styles.btnDisabled]}
                onPress={onSubmit}
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Acessar conta</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
                  </>
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
              {loginGoogle.isPending ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <SocialButton provider="google" onPress={() => handleSocial('google')} />
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Novo por aqui?{' '}
                <Link href="/(auth)/cadastro" style={styles.footerLink}>
                  Cadastre-se
                </Link>
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
    width: 64,
    height: 64,
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
    fontSize: 28,
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
    gap: spacing.lg,
  },
  form: { gap: spacing.md },
  forgot: { alignSelf: 'flex-end' },
  forgotText: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  errorText: { ...typography.caption, color: colors.danger, flex: 1, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    boxShadow: '0 10px 24px rgba(124, 58, 237, 0.35)',
    elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: colors.textInverse, fontSize: 15, fontWeight: '700' },

  dividerWrap: { marginTop: spacing.xs },
  social: { gap: spacing.sm },
  footer: { alignItems: 'center', marginTop: spacing.md },
  footerText: { ...typography.body, color: colors.textMuted },
  footerLink: { color: colors.primary, fontWeight: '700' },
});
