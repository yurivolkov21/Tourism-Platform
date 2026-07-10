import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const styles = createStyles(theme, variant);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={color(theme, 'primary-foreground')} />
      ) : (
        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  variant: 'primary' | 'secondary',
) {
  const isPrimary = variant === 'primary';
  return StyleSheet.create({
    base: {
      minHeight: 48,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: isPrimary
        ? color(theme, 'primary')
        : color(theme, 'secondary'),
    },
    label: {
      fontFamily: theme.fonts.sansSemibold,
      color: isPrimary
        ? color(theme, 'primary-foreground')
        : color(theme, 'secondary-foreground'),
    },
    pressed: { opacity: 0.88 },
    disabled: { opacity: 0.5 },
  });
}
