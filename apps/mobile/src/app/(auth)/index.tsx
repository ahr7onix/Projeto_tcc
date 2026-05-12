import { Link } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/lib/theme';

const roles = [
  {
    key: 'paciente',
    href: '/(auth)/login/cliente' as const,
    icon: 'person-outline' as const,
    title: 'Sou cliente',
    description: 'Acompanhe sua glicemia, refeições e plano alimentar.',
  },
  {
    key: 'nutricionista',
    href: '/(auth)/login/nutricionista' as const,
    icon: 'medkit-outline' as const,
    title: 'Sou nutricionista',
    description: 'Monitore seus pacientes e acompanhe a evolução clínica.',
  },
];

export default function AuthIndexScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Ionicons name="pulse" size={34} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Como você vai entrar?</Text>
          <Text style={styles.heroSubtitle}>
            Selecione seu perfil para continuar.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.roleList}>
            {roles.map((r) => (
              <Link key={r.key} href={r.href} asChild>
                <Pressable style={styles.roleBtn}>
                  <View style={styles.roleIcon}>
                    <Ionicons name={r.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleTitle}>{r.title}</Text>
                    <Text style={styles.roleDesc}>{r.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              </Link>
            ))}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, backgroundColor: colors.backgroundAlt },

  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
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
  roleList: { gap: spacing.md },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: { ...typography.h3, color: colors.text },
  roleDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },

  footer: { alignItems: 'center', marginTop: spacing.md },
  footerText: { ...typography.body, color: colors.textMuted },
  footerLink: { color: colors.primary, fontWeight: '700' },
});
