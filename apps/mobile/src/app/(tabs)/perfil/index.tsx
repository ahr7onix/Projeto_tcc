import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  key: string;
  label: string;
  icon: IconName;
  tint?: string;
  tintBg?: string;
}

const acessoItems: MenuItem[] = [
  { key: 'editar', label: 'Editar perfil', icon: 'person-outline' },
  { key: 'senha', label: 'Alterar senha', icon: 'lock-closed-outline' },
];

const navMap: Record<string, string> = {
  editar: '/(tabs)/perfil/editar',
  senha: '/(tabs)/perfil/senha',
};

const suporteItems: MenuItem[] = [
  { key: 'ajuda', label: 'Central de ajuda', icon: 'help-circle-outline' },
  { key: 'termos', label: 'Termos e privacidade', icon: 'document-text-outline' },
  { key: 'sobre', label: 'Sobre o app', icon: 'information-circle-outline' },
];

export default function PerfilScreen() {
  const { user, signOut } = useAuthStore();
  const initial = (user?.nome ?? '?').charAt(0).toUpperCase();
  const role = 'Cliente';

  return (
    <ScreenContainer eyebrow="Sua conta" title="Perfil">
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{user?.nome ?? '—'}</Text>
        <Text style={styles.email}>{user?.email ?? '—'}</Text>
        <View style={styles.roleTag}>
          <View style={styles.roleDot} />
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>

      <Card title="Conta">
        <View style={styles.menuList}>
          {acessoItems.map((item, i) => (
            <Pressable
              key={item.key}
              style={[styles.menuRow, i > 0 && styles.rowDivider]}
              onPress={() => router.push(navMap[item.key] as never)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </Card>

      <Card title="Suporte">
        <View style={styles.menuList}>
          {suporteItems.map((item, i) => (
            <Pressable key={item.key} style={[styles.menuRow, i > 0 && styles.rowDivider]}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </Card>

      <Pressable style={styles.signOut} onPress={signOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>Sair da conta</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(124, 58, 237, 0.35)',
    elevation: 6,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textInverse,
  },
  name: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.sm,
  },
  email: { ...typography.body, color: colors.textMuted },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  roleText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  menuList: { gap: 0 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...typography.body, color: colors.text, flex: 1, fontWeight: '500' },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
