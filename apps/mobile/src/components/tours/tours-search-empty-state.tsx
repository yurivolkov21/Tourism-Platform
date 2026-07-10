import { StyleSheet, View } from 'react-native';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

type ToursSearchEmptyStateProps = {
  title: string;
  message: string;
};

export function ToursSearchEmptyState({ title, message }: ToursSearchEmptyStateProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.root}>
      <AppText style={styles.title}>{title}</AppText>
      <AppText variant="body" style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.heading,
      fontSize: theme.typography.largeTitle,
      lineHeight: 40,
      letterSpacing: -0.5,
      textAlign: 'center',
      maxWidth: 300,
    },
    message: {
      marginTop: theme.spacing.md,
      color: color(theme, 'muted-foreground'),
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 24,
    },
  });
}
