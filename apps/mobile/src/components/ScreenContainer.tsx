import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/lib/theme';

interface Props {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  headerRight?: ReactNode;
  showBack?: boolean;
  children?: ReactNode;
  scrollable?: boolean;
}

export function ScreenContainer({
  title,
  subtitle,
  eyebrow,
  headerRight,
  showBack = false,
  children,
  scrollable = true,
}: Props) {
  const Body: typeof ScrollView | typeof View = scrollable ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {showBack ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          {headerRight ? <View>{headerRight}</View> : <View style={styles.backBtn} />}
        </View>
      ) : null}

      <Body
        style={styles.body}
        contentContainerStyle={scrollable ? styles.content : undefined}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {!showBack && headerRight ? headerRight : null}
        </View>
        {children}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundAlt },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primary },
  title: { ...typography.h1, color: colors.text, marginTop: spacing.xs },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
