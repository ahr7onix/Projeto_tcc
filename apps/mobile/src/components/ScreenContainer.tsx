import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  scrollable?: boolean;
}

export function ScreenContainer({ title, subtitle, children, scrollable = true }: Props) {
  const Body = scrollable ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Body
        style={styles.body}
        contentContainerStyle={scrollable ? styles.content : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundAlt },
  body: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
});
