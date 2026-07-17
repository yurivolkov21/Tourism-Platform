import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { SectionDivider } from './SectionDivider';
import { useTheme } from '../theme/ThemeProvider';

type ScreenToolbarProps = {
  title: string;
  right?: ReactNode;
};

/** Compact title row + divider — saved / account-style screens. */
export function ScreenToolbar({ title, right }: ScreenToolbarProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <AppText variant="headline" style={styles.title}>
          {title}
        </AppText>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      <SectionDivider />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      paddingTop: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      fontFamily: theme.fonts.heading,
      letterSpacing: -0.5,
    },
    right: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
