import { Pressable, type PressableProps } from 'react-native';
import { AppText } from './app-text';
import { Spinner } from './spinner';
import { useTheme } from './theme-provider';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'outline';
  loading?: boolean;
}

export function Button({ label, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      {...rest}
      style={(state) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing(2),
          minHeight: 44,
          paddingHorizontal: theme.spacing(5),
          borderRadius: theme.radius.md,
          backgroundColor: primary ? theme.colors['primary'] : 'transparent',
          borderWidth: primary ? 0 : 1,
          borderColor: theme.colors['border'],
          opacity: disabled ? 0.5 : state.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? <Spinner size="small" /> : null}
      <AppText
        variant="body"
        style={{
          fontFamily: theme.fontFamilies.sansSemiBold,
          color: primary ? theme.colors['primary-foreground'] : theme.colors['foreground'],
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
