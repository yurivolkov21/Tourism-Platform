import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './theme-provider';
import type { Theme } from './theme';

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
  navigation: {
    navigate: (name: string) => void;
    /** Structural subset of react-navigation's `emit` — needed so tapping an
     * already-focused tab still fires 'tabPress' (screens use it for
     * scroll-to-top via `useScrollToTop`), which a bare `navigate` guard
     * skips since navigating to the current route is a no-op. */
    emit: (event: {
      type: 'tabPress';
      target?: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
  };
}

/** Size of the sliding brass tile and each tab's tap target. */
export const TAB_BAR_TILE = 62;

const PRESS_SPRING = { damping: 18, stiffness: 220 };
const INDICATOR_SPRING = { damping: 26, stiffness: 210 };

interface TabItemProps {
  route: FloatingTabBarProps['state']['routes'][number];
  options: FloatingTabBarProps['descriptors'][string]['options'];
  focused: boolean;
  index: number;
  navigation: FloatingTabBarProps['navigation'];
  theme: Theme;
  onMeasure: (index: number, x: number) => void;
}

/** A bare tap target — the brass tile behind it is one shared element that slides between tabs, not per-tab state. */
function TabItem({
  route,
  options,
  focused,
  index,
  navigation,
  theme,
  onMeasure,
}: TabItemProps) {
  const color = focused
    ? theme.colors['primary-foreground']
    : theme.colors['muted-foreground'];

  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  // Icon scale-pop + opacity dim on real focus transitions only — skip on
  // initial mount (the tab that starts focused shouldn't play the pop).
  const iconScale = useSharedValue(1);
  const focusProgress = useSharedValue(focused ? 1 : 0);
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    focusProgress.value = withTiming(focused ? 1 : 0, { duration: 200 });
    if (focused) {
      iconScale.value = withSequence(
        withTiming(0.95, { duration: 50 }), // anticipatory undershoot
        withTiming(1.05, { duration: 90 }), // brief overshoot past rest
        withTiming(1, { duration: 60 }), // settle — 200ms total
      );
    } else {
      iconScale.value = withTiming(1, { duration: 180 }); // shrink back to rest
    }
  }, [focused, focusProgress, iconScale]);

  const iconWrapperStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [0.75, 1]),
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Pressable
      onLayout={(e: LayoutChangeEvent) =>
        onMeasure(index, e.nativeEvent.layout.x)
      }
      accessibilityRole="button"
      accessibilityLabel={options.title ?? route.name}
      accessibilityState={{ selected: focused }}
      android_ripple={{ color: theme.colors['accent'], borderless: true }}
      onPress={() => {
        // Mirrors react-navigation's own default tab bar: always emit
        // 'tabPress' (screens rely on it, e.g. `useScrollToTop`), only skip
        // navigating if the tab handled it itself (`defaultPrevented`) or
        // it's already focused (navigating to the current route is a no-op).
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      }}
      onPressIn={() => {
        pressScale.value = withSpring(0.96, PRESS_SPRING);
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, PRESS_SPRING);
      }}
      style={{
        width: TAB_BAR_TILE,
        height: TAB_BAR_TILE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={pressStyle}>
        <Animated.View
          testID={`tab-icon-${route.name}`}
          style={iconWrapperStyle}
        >
          {options.tabBarIcon?.({ focused, color, size: focused ? 26 : 24 })}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * P5.7 S4 (Navel Screen-17/18): container-less tab bar — bare outline icons
 * floating on the page, the active tab in a large brass rounded square. A
 * bottom fade to the background color sits behind the icons so content
 * scrolling underneath (other tabs) never fights them for legibility.
 * Screens must reserve space for it (Tabs sceneStyle paddingBottom).
 *
 * The brass square is ONE element (not per-tab state) that slides its
 * `translateX` to whichever tab is focused, measured via each tab's own
 * `onLayout` — this reads as a single tile gliding across, not five tiles
 * independently popping/fading (the earlier per-tab color-fade approach was
 * dropped for exactly this reason — it read as a "smear" between states).
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const positions = useRef<Record<number, number>>({});
  const isFirstPlacement = useRef(true);
  const [ready, setReady] = useState(false);
  const indicatorX = useSharedValue(0);
  const focusedIndex = state.index;

  const handleMeasure = useCallback(
    (index: number, x: number) => {
      positions.current[index] = x;
      if (index === focusedIndex && isFirstPlacement.current) {
        indicatorX.value = x; // instant placement — nothing to slide FROM yet
        isFirstPlacement.current = false;
        setReady(true);
      }
    },
    [focusedIndex, indicatorX],
  );

  // Skips the initial mount (handled by handleMeasure above) — only animates
  // on a genuine tab switch, once every tab's position is already known.
  useEffect(() => {
    if (isFirstPlacement.current) return;
    const x = positions.current[focusedIndex];
    if (x !== undefined) {
      indicatorX.value = withSpring(x, INDICATOR_SPRING);
    }
  }, [focusedIndex, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    opacity: ready ? 1 : 0,
  }));

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
        <Animated.View
          testID="tab-indicator"
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: TAB_BAR_TILE,
              height: TAB_BAR_TILE,
              borderRadius: theme.radius.xl,
              borderCurve: 'continuous',
              backgroundColor: theme.colors['primary'],
            },
            indicatorStyle,
          ]}
        />
        {state.routes.map((route, index) => (
          <TabItem
            key={route.key}
            route={route}
            options={descriptors[route.key].options}
            focused={state.index === index}
            index={index}
            navigation={navigation}
            theme={theme}
            onMeasure={handleMeasure}
          />
        ))}
      </View>
    </>
  );
}
