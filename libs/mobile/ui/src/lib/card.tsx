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
        },
        style,
      ]}
    />
  );
}
