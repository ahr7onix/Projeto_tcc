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
  const Body = scrollable ? ScrollView : View;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.hero} edges={['top']}>
        <View style={styles.navRow}>
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              style={styles.navBtn}
              hitSlop={10}
              accessibilityLabel="Voltar"
            >
              <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
            </Pressable>
          ) : (
            <View style={styles.navSlot} />
          )}
          {headerRight ? <View>{headerRight}</View> : <View style={styles.navSlot} />}
        </View>

        <View style={styles.heroText}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </SafeAreaView>

      <View style={styles.sheet}>
        <Body
          style={styles.sheetScroll}
          contentContainerStyle={scrollable ? styles.sheetContent : undefined}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </Body>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },

  hero: {
    backgroundColor: colors.primary,
    paddingBottom: 24,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSlot: { width: 40, height: 40 },

  heroText: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.6)',
  },
  title: {
    ...typography.h1,
    color: colors.textInverse,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 22,
  },

  sheet: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetScroll: { flex: 1 },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
});
