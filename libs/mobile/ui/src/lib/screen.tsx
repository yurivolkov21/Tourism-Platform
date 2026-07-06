import type { ComponentProps } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme-provider';

export interface ScreenProps extends ViewProps {
  /** Render children in a ScrollView (default true — most screens scroll). */
  scroll?: boolean;
  /** Extra props forwarded to the ScrollView (e.g. refreshControl). */
  scrollProps?: ComponentProps<typeof ScrollView>;
}

export function Screen({ scroll = true, scrollProps, children, style, ...rest }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const outer = {
    flex: 1,
    backgroundColor: theme.colors['background'],
    paddingTop: insets.top,
  };
  if (!scroll) {
    return (
      <View {...rest} style={[outer, { paddingHorizontal: theme.spacing(4) }, style]}>
        {children}
      </View>
    );
  }
  return (
    <View {...rest} style={[outer, style]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(4),
          paddingBottom: theme.spacing(6),
        }}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}
