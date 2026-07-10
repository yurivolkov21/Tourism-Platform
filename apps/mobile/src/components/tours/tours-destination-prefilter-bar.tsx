import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

type ToursDestinationPrefilterBarProps = {
  label: string;
  clearLabel: string;
  onClear: () => void;
};

export function ToursDestinationPrefilterBar({
  label,
  clearLabel,
  onClear,
}: ToursDestinationPrefilterBarProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.root}>
      <View style={styles.lead}>
        <Ionicons name="location-outline" size={16} color={color(theme, 'primary')} />
        <AppText variant="caption" style={styles.label} numberOfLines={1}>
          {label}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={clearLabel}
        onPress={onClear}
        hitSlop={8}
        style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
      >
        <AppText variant="caption" style={styles.clearText}>
          {clearLabel}
        </AppText>
        <Ionicons name="close" size={14} color={color(theme, 'primary')} />
      </Pressable>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: color(theme, 'primary'),
      backgroundColor: color(theme, 'muted'),
      gap: theme.spacing.sm,
    },
    lead: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      minWidth: 0,
    },
    label: {
      flex: 1,
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansSemibold,
    },
    clear: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clearPressed: {
      opacity: 0.75,
    },
    clearText: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansMedium,
    },
  });
}
