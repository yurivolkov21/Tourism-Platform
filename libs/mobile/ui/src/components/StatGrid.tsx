import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type StatGridProps = {
  labels: readonly string[];
  values: readonly string[];
};

export function StatGrid({ labels, values }: StatGridProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.grid}>
      {labels.map((label, i) => (
        <View key={label} style={styles.cell}>
          <AppText variant="largeTitle" style={styles.value}>
            {values[i] ?? '—'}
          </AppText>
          <AppText variant="caption" muted style={styles.label}>
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    cell: {
      width: '47%',
      padding: theme.spacing.md,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    value: {
      color: color(theme, 'primary'),
      fontSize: 40,
      lineHeight: 44,
      textAlign: 'center',
    },
    label: {
      textAlign: 'center',
      fontFamily: theme.fonts.sansMedium,
    },
  });
}
