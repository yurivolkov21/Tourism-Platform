import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type TourAvailabilityBadgeProps = {
  label: string;
  variant?: 'default' | 'urgent';
  showIcon?: boolean;
};

export function TourAvailabilityBadge({
  label,
  variant = 'default',
  showIcon = false,
}: TourAvailabilityBadgeProps) {
  const theme = useTheme();
  const styles = createStyles(theme, variant);
  const iconColor =
    variant === 'urgent'
      ? color(theme, 'warning-foreground')
      : color(theme, 'foreground');

  return (
    <View style={styles.badge}>
      {showIcon ? (
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Ionicons name="calendar-outline" size={12} color={iconColor} />
        </View>
      ) : null}
      <AppText variant="caption" style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  variant: 'default' | 'urgent',
) {
  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor:
        variant === 'urgent'
          ? color(theme, 'warning')
          : color(theme, 'muted'),
    },
    text: {
      fontWeight: '600',
      color:
        variant === 'urgent'
          ? color(theme, 'warning-foreground')
          : color(theme, 'foreground'),
    },
  });
}
