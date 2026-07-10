import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, useTheme } from '@tourism/mobile-ui';

type MoreMenuSectionProps = {
  title?: string;
  children: ReactNode;
  /** Adds extra space above — e.g. logout separated from account actions. */
  spaced?: boolean;
};

export function MoreMenuSection({ title, children, spaced = false }: MoreMenuSectionProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.root, spaced && styles.spaced]}>
      {title ? (
        <AppText variant="caption" muted style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    spaced: {
      marginTop: theme.spacing.md,
    },
    title: {
      paddingHorizontal: theme.spacing.md,
      fontFamily: theme.fonts.sansMedium,
      fontSize: theme.typography.caption,
      lineHeight: 18,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
  });
}
