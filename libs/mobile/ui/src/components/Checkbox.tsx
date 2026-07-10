import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: CheckboxProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        {checked ? (
          <Ionicons
            name="checkmark"
            size={14}
            color={color(theme, 'primary-foreground')}
          />
        ) : null}
      </View>
      <AppText variant="caption" muted style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    pressed: { opacity: 0.88 },
    box: {
      width: 20,
      height: 20,
      marginTop: 1,
      borderWidth: 1,
      borderColor: color(theme, 'input'),
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'background'),
    },
    boxChecked: {
      borderColor: color(theme, 'primary'),
      backgroundColor: color(theme, 'primary'),
    },
    label: {
      flex: 1,
      lineHeight: 20,
    },
  });
}
