import { View, type ViewProps } from 'react-native';
import { useTheme } from './theme-provider';

export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors['card'],
          borderRadius: theme.radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: theme.colors['border'],
          overflow: 'hidden',
          // RN 0.81 CSS shadow (replaces legacy shadow* + elevation). The rgba
          // is a shadow alpha, not a palette color — mirrors the web tokens'
          // card shadow, exempt from the no-hex palette rule.
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        style,
      ]}
    />
  );
}
