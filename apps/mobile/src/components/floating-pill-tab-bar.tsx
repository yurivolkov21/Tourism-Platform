import { useEffect, useState } from 'react';
import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { color, useBottomSafeInset, useTheme, useThemeColorScheme } from '@tourism/mobile-ui';

import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MARGIN,
} from './floating-tab-bar.constants';
import { tabBarSpringConfig, useTabBarVisibility } from './tab-bar-visibility';

export { FLOATING_TAB_BAR_HEIGHT, FLOATING_TAB_BAR_MARGIN } from './floating-tab-bar.constants';
const TAB_BAR_RADIUS = 28;
const INDICATOR_INSET = 6;

export function useFloatingTabBarInset(): number {
  const bottom = useBottomSafeInset(FLOATING_TAB_BAR_MARGIN);
  return FLOATING_TAB_BAR_HEIGHT + bottom;
}

/** Minimum bottom padding for scrollable content to clear the floating tab bar. */
export function useTabBarScrollPadding(extra = 0): number {
  return useFloatingTabBarInset() + extra;
}

export function FloatingPillTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const theme = useTheme();
  const { tabBarOffset, show } = useTabBarVisibility();
  const bottomOffset = useBottomSafeInset(FLOATING_TAB_BAR_MARGIN);
  const isDark = useThemeColorScheme() === 'dark';
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useSharedValue(0);
  const tabCount = state.routes.length;
  const tabWidth = tabCount > 0 ? barWidth / tabCount : 0;
  const toursRouteIndex = state.routes.findIndex((route) => route.name === 'tours');

  useEffect(() => {
    if (toursRouteIndex < 0) return;
    if (state.index !== toursRouteIndex) {
      show();
    }
  }, [state.index, toursRouteIndex, show]);

  useEffect(() => {
    if (tabWidth <= 0) return;
    indicatorX.value = withSpring(state.index * tabWidth, tabBarSpringConfig);
  }, [state.index, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value + INDICATOR_INSET }],
    width: Math.max(tabWidth - INDICATOR_INSET * 2, 0),
  }));

  const wrapperAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarOffset.value }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingBottom: bottomOffset,
          paddingHorizontal: FLOATING_TAB_BAR_MARGIN,
        },
        wrapperAnimatedStyle,
      ]}
    >
      <View
        style={[
          styles.pill,
          Platform.OS === 'ios'
            ? {
                shadowColor: color(theme, 'foreground'),
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.35 : 0.12,
                shadowRadius: 16,
              }
            : { elevation: 10 },
          {
            height: FLOATING_TAB_BAR_HEIGHT,
            borderRadius: TAB_BAR_RADIUS,
            borderColor: color(theme, 'border'),
          },
        ]}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            pointerEvents="none"
            intensity={isDark ? 55 : 72}
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.glassOverlay,
            {
              backgroundColor: color(theme, 'card'),
              opacity: Platform.OS === 'ios' ? (isDark ? 0.55 : 0.7) : 0.94,
              borderRadius: TAB_BAR_RADIUS,
            },
          ]}
        />

        {barWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicatorShell, indicatorStyle]}
          >
            <View
              style={[
                styles.indicator,
                {
                  backgroundColor: color(theme, 'primary'),
                  borderRadius: TAB_BAR_RADIUS - INDICATOR_INSET,
                },
              ]}
            />
          </Animated.View>
        ) : null}

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const label = options.title ?? route.name;
            const tint = isFocused
              ? color(theme, 'primary')
              : color(theme, 'muted-foreground');

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
              >
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: tint,
                  size: 26,
                })}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pill: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  glassOverlay: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  indicatorShell: {
    position: 'absolute',
    top: INDICATOR_INSET,
    bottom: INDICATOR_INSET,
    left: 0,
  },
  indicator: {
    flex: 1,
    opacity: 0.2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: FLOATING_TAB_BAR_HEIGHT,
  },
  tabPressed: {
    opacity: 0.85,
  },
});
