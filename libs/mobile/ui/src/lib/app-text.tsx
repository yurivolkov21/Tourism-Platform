import { Text, type TextProps } from 'react-native';
import { useTheme } from './theme-provider';
import type { Theme } from './theme';

export interface AppTextProps extends TextProps {
  variant?: keyof Theme['typography'];
  /** Muted foreground (secondary copy). */
  muted?: boolean;
}

export function AppText({ variant = 'body', muted, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        theme.typography[variant],
        { color: muted ? theme.colors['muted-foreground'] : theme.colors['foreground'] },
        style,
      ]}
    />
  );
}
