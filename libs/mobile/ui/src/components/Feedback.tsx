import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';

type EmptyStateProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: theme.spacing.xl,
        alignItems: 'center',
        gap: theme.spacing.md,
      }}
    >
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
  /** Optional visual above the title (e.g. wishlist heart). */
  icon?: ReactNode;
  /** Vertically and horizontally centered — saved / empty layouts. */
  centered?: boolean;
  /** Optional CTA below the message (e.g. "Explore tours"). */
  actionLabel?: string;
  onAction?: () => void;
};

export function SpotlightEmptyState({
  title,
  message,
  icon,
  centered = false,
  actionLabel,
  onAction,
}: SpotlightEmptyStateProps) {
  const theme = useTheme();
  const styles = createStyles(theme, centered);

  return (
    <View style={styles.root}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText variant="largeTitle" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" muted style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
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
    icon: {
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
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
    action: {
      marginTop: theme.spacing.lg,
      alignSelf: centered ? 'center' : 'flex-start',
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
    <View
      style={{
        padding: theme.spacing.xl,
        alignItems: 'center',
        gap: theme.spacing.md,
      }}
    >
      <AppText
        variant="body"
        style={{ textAlign: 'center', color: colorFromTheme(theme) }}
      >
        {message}
      </AppText>
      <Button label={retryLabel} onPress={onRetry} />
    </View>
  );
}

function colorFromTheme(theme: ReturnType<typeof useTheme>) {
  return theme.colors.destructive ?? theme.colors.foreground;
}

export function LoadingSkeleton({
  variant = 'default',
}: {
  /** Match tours/destinations viewMode: portrait carousel vs landscape rows. */
  variant?: 'default' | 'portrait' | 'landscape';
}) {
  const theme = useTheme();
  const styles = StyleSheet.create({
    wrap: {
      paddingTop: theme.spacing.md,
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    row: {
      marginBottom: theme.spacing.md,
      height:
        variant === 'portrait' ? 320 : variant === 'landscape' ? 220 : 220,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.muted,
      width: variant === 'portrait' ? '88%' : '100%',
      alignSelf: variant === 'portrait' ? 'center' : 'stretch',
    },
    carouselRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'center',
    },
    peek: {
      width: 28,
      height: 320,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.muted,
      opacity: 0.55,
    },
  });

  if (variant === 'portrait') {
    return (
      <View style={styles.wrap}>
        <View style={styles.carouselRow}>
          <View style={styles.peek} />
          <View style={[styles.row, { marginBottom: 0, flex: 1 }]} />
          <View style={styles.peek} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
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
