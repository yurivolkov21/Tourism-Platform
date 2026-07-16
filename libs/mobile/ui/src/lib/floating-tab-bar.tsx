import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

/** Height of the active brass tile — screens reserve space from this. */
export const TAB_BAR_TILE = 62;

/**
 * P5.7 S4 (Navel Screen-17/18): container-less tab bar — bare outline icons
 * floating on the page, the active tab in a large brass rounded square. A
 * bottom fade to the background color sits behind the icons so content
 * scrolling underneath (other tabs) never fights them for legibility.
 * Screens must reserve space for it (Tabs sceneStyle paddingBottom).
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <>
      <LinearGradient
        testID="tabbar-fade"
        pointerEvents="none"
        colors={[theme.colors['background'] + '00', theme.colors['background']]}
        locations={[0, 0.6]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: insets.bottom + TAB_BAR_TILE + theme.spacing(10),
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + theme.spacing(2),
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: theme.spacing(6),
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
                width: focused ? TAB_BAR_TILE : 48,
                height: focused ? TAB_BAR_TILE : 48,
                borderRadius: theme.radius.xl,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused
                  ? theme.colors['primary']
                  : 'transparent',
              }}
            >
              {options.tabBarIcon?.({
                focused,
                color,
                size: focused ? 26 : 24,
              })}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
