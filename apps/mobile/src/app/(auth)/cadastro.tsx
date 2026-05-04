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
import { RoleSelector } from '@/components/RoleSelector';
import { extractAuthError, useCadastro } from '@/hooks/use-auth';
import { cadastroSchema, type CadastroFormValues } from '@/lib/validation/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function CadastroScreen() {
  const { control, handleSubmit } = useForm<CadastroFormValues>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: '', email: '', senha: '', role: 'paciente' },
  });
  const cadastro = useCadastro();

  const onSubmit = handleSubmit((values) => {
    cadastro.mutate(values);
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
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Comece sua jornada de saúde</Text>
          </View>

          <View style={styles.form}>
            <FormField
              control={control}
              name="nome"
              label="Nome completo"
              placeholder="Seu nome"
            />
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
              placeholder="Mínimo 8 caracteres"
            />
            <RoleSelector control={control} name="role" label="Tipo de conta" />

            {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

            <Pressable
              style={[styles.button, cadastro.isPending && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={cadastro.isPending}
            >
              {cadastro.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Cadastrar</Text>
              )}
            </Pressable>

            <Link href="/(auth)/login" style={styles.linkText}>
              Já tem conta? Entrar
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, flexGrow: 1, justifyContent: 'center' },
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
