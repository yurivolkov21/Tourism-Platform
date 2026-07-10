import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';

type EmptyStateProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.md }}>
      <AppText variant="body" muted style={{ textAlign: 'center' }}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

type SpotlightEmptyStateProps = {
  title: string;
  message: string;
  /** Vertically and horizontally centered — bookmark empty layouts. */
  centered?: boolean;
};

export function SpotlightEmptyState({
  title,
  message,
  centered = false,
}: SpotlightEmptyStateProps) {
  const theme = useTheme();
  const styles = createStyles(theme, centered);

  return (
    <View style={styles.root}>
      <AppText variant="largeTitle" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" muted style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, centered: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: centered ? 0 : theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      justifyContent: centered ? 'center' : 'flex-start',
      alignItems: centered ? 'center' : 'flex-start',
    },
    title: {
      fontFamily: theme.fonts.sansBold,
      fontSize: theme.typography.largeTitle,
      lineHeight: 42,
      letterSpacing: -1,
      textAlign: centered ? 'center' : 'left',
      maxWidth: centered ? 300 : undefined,
    },
    message: {
      marginTop: theme.spacing.md,
      textAlign: centered ? 'center' : 'left',
      maxWidth: centered ? 280 : undefined,
    },
  });
}

type ErrorStateProps = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

export function ErrorState({ message, retryLabel, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.md }}>
      <AppText variant="body" style={{ textAlign: 'center', color: colorFromTheme(theme) }}>
        {message}
      </AppText>
      <Button label={retryLabel} onPress={onRetry} />
    </View>
  );
}

function colorFromTheme(theme: ReturnType<typeof useTheme>) {
  return theme.colors.destructive ?? theme.colors.foreground;
}

export function LoadingSkeleton() {
  const theme = useTheme();
  const styles = StyleSheet.create({
    row: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      height: 220,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.muted,
    },
  });
  return (
    <View style={{ paddingTop: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={styles.row} />
      <View style={styles.row} />
      <View style={styles.row} />
    </View>
  );
}

export function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <AppText
      variant="caption"
      muted
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontWeight: '600',
      }}
    >
      {title}
    </AppText>
  );
}
