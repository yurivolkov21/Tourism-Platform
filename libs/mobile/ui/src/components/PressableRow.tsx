import { type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type PressableRowProps = {
  label: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  icon?: ReactNode;
  grouped?: boolean;
  comfortable?: boolean;
  destructive?: boolean;
};

export function PressableRow({
  label,
  subtitle,
  onPress,
  showChevron = true,
  icon,
  grouped = false,
  comfortable = false,
  destructive = false,
}: PressableRowProps) {
  const theme = useTheme();
  const styles = createStyles(theme, grouped, comfortable);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <View style={styles.textWrap}>
        <AppText
          variant="body"
          style={destructive ? { color: color(theme, 'destructive') } : undefined}
        >
          {label}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={color(theme, 'muted-foreground')}
        />
      ) : null}
    </Pressable>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  grouped: boolean,
  comfortable: boolean,
) {
  return StyleSheet.create({
    row: {
      minHeight: comfortable ? 52 : theme.minTouch,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: comfortable ? theme.spacing.md : theme.spacing.sm,
      backgroundColor: grouped ? 'transparent' : color(theme, 'card'),
      borderBottomWidth: grouped ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: color(theme, 'border'),
    },
    pressed: { backgroundColor: color(theme, 'muted') },
    iconWrap: {
      width: 28,
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    textWrap: { flex: 1, gap: 2, paddingRight: theme.spacing.sm },
  });
}
