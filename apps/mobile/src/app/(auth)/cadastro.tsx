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
import { Ionicons } from '@expo/vector-icons';
import { Checkbox } from '@/components/Checkbox';
import { FormField } from '@/components/FormField';
import { extractAuthError, useCadastro } from '@/hooks/use-auth';
import {
  cadastroSchema,
  type CadastroFormValues,
} from '@/lib/validation/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function CadastroScreen() {
  const { control, handleSubmit } = useForm<CadastroFormValues>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: {
      nome: '',
      email: '',
      senha: '',
      role: 'paciente',
      aceiteTermos: false as unknown as true,
    },
  });
  const cadastro = useCadastro();

  const onSubmit = handleSubmit((values) => {
    cadastro.mutate({
      nome: values.nome,
      email: values.email,
      senha: values.senha,
      role: values.role,
    });
  });

  const errorMessage = cadastro.isError
    ? extractAuthError(cadastro.error, 'Não foi possível criar a conta.')
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
              <Ionicons name="pulse" size={34} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Crie sua conta</Text>
            <Text style={styles.heroSubtitle}>
              Comece a cuidar da sua saúde com acompanhamento clínico.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.form}>
              <FormField
                control={control}
                name="nome"
                label="Nome completo"
                icon="person-outline"
                placeholder="Como devemos te chamar"
              />
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
                placeholder="Crie uma senha"
              />
              <Text style={styles.hint}>
                <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />
                {'  '}Use 8+ caracteres, com letras e números.
              </Text>

              <View style={styles.terms}>
                <Checkbox control={control} name="aceiteTermos">
                  <>
                    Li e aceito os{' '}
                    <Text style={styles.termsLink}>Termos de Uso</Text> e a{' '}
                    <Text style={styles.termsLink}>Política de Privacidade</Text>.
                  </>
                </Checkbox>
              </View>

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.primaryBtn, cadastro.isPending && styles.btnDisabled]}
                onPress={onSubmit}
                disabled={cadastro.isPending}
              >
                {cadastro.isPending ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Criar conta</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Já tem conta?{' '}
                <Link href="/(auth)/login" style={styles.footerLink}>
                  Entrar
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
    gap: spacing.sm,
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
    maxWidth: 280,
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
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  terms: { marginTop: spacing.sm },
  termsLink: { color: colors.primary, fontWeight: '700' },

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

  footer: { alignItems: 'center', marginTop: spacing.md },
  footerText: { ...typography.body, color: colors.textMuted },
  footerLink: { color: colors.primary, fontWeight: '700' },
});
