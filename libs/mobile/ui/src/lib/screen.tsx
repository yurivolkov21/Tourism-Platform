import type { ComponentProps } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTheme } from './theme-provider';

export interface ScreenProps extends ViewProps {
  /** Render children in a ScrollView (default true — most screens scroll). */
  scroll?: boolean;
  /** Extra props forwarded to the ScrollView (e.g. refreshControl). */
  scrollProps?: ComponentProps<typeof ScrollView>;
  /**
   * Swap the ScrollView for `KeyboardAwareScrollView` — auto-scrolls the
   * focused TextInput above the keyboard, no KeyboardAvoidingView wrapper
   * needed. Opt-in (default false) so unrelated screens are unaffected.
   */
  keyboardAware?: boolean;
}

export function Screen({
  scroll = true,
  scrollProps,
  keyboardAware = false,
  children,
  style,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const outer = {
    flex: 1,
    backgroundColor: theme.colors['background'],
    paddingTop: insets.top,
  };
  if (!scroll) {
    return (
      <View
        {...rest}
        style={[outer, { paddingHorizontal: theme.spacing(4) }, style]}
      >
        {children}
      </View>
    );
  }
  const ScrollComponent = keyboardAware ? KeyboardAwareScrollView : ScrollView;
  return (
    <View {...rest} style={[outer, style]}>
      <ScrollComponent
        // bottomOffset: breathing room between the focused input's bottom
        // edge and the keyboard (KeyboardAwareScrollView-only; the plain
        // ScrollView branch never sees keyboardAware=true props).
        {...(keyboardAware ? { bottomOffset: theme.spacing(4) } : null)}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(4),
          paddingBottom: theme.spacing(6),
        }}
        // The indicator flashing on screen entry reads as a glitch on-device
        // (user feedback 2026-07-07); callers can re-enable via scrollProps.
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
      </ScrollComponent>
    </View>
  );
}
