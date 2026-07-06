import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';
import { useTheme } from './theme-provider';

export function Spinner(props: ActivityIndicatorProps) {
  const theme = useTheme();
  return <ActivityIndicator color={theme.colors['primary']} {...props} />;
}
