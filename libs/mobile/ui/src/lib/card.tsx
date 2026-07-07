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
          borderWidth: 1,
          borderColor: theme.colors['border'],
          overflow: 'hidden',
          // Android-first resting depth (web card parity); iOS clips shadows
          // under overflow:hidden — acceptable this phase.
          shadowColor: theme.colors['foreground'],
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        style,
      ]}
    />
  );
}
