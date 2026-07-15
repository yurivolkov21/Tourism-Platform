import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme-provider';

/**
 * Minimal structural subset of react-navigation's BottomTabBarProps.
 * @react-navigation/bottom-tabs is not directly resolvable in this workspace
 * (it lives inside expo-router's dependency tree), and adding our own copy
 * risks duplicating react-navigation. TS structural typing makes the real
 * props assignable to this shape at the expo-router `tabBar` wiring site.
 */
export interface FloatingTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarIcon?: (props: {
          focused: boolean;
          color: string;
          size: number;
        }) => ReactNode;
      };
    }
  >;
  navigation: { navigate: (name: string) => void };
}

/**
 * P5.6 "Nexora Dark Heritage": floating pill tab bar — detached from the
 * screen edges, icon-only, the active tab sits in a brass rounded-square
 * capsule. Screens must reserve space for it (Tabs sceneStyle paddingBottom).
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: theme.spacing(5),
        right: theme.spacing(5),
        bottom: insets.bottom + theme.spacing(3),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors['card'],
        borderRadius: 999,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: theme.colors['border'],
        paddingHorizontal: theme.spacing(2),
        paddingVertical: theme.spacing(2),
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused
          ? theme.colors['primary-foreground']
          : theme.colors['muted-foreground'];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={options.title ?? route.name}
            accessibilityState={{ selected: focused }}
            android_ripple={{
              color: theme.colors['accent'],
              borderless: true,
            }}
            onPress={() => {
              if (!focused) navigation.navigate(route.name);
            }}
            style={{
              width: 52,
              height: 52,
              borderRadius: theme.radius.lg,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused
                ? theme.colors['primary']
                : 'transparent',
            }}
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
          </Pressable>
        );
      })}
    </View>
  );
}
