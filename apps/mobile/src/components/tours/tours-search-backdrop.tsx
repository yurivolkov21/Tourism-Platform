import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { color, useTheme, useThemeColorScheme } from '@tourism/mobile-ui';

import {
  SEARCH_BACKDROP_DARK_OPACITY,
  SEARCH_BLUR_INTENSITY,
  SEARCH_BLUR_SCRIM_OPACITY,
  SEARCH_SCRIM_OPACITY,
} from './tours-search.constants';

type ToursSearchBackdropProps = {
  searchActive: boolean;
  overlayProgress: SharedValue<number>;
  onDismiss: () => void;
  dismissLabel: string;
};

export function ToursSearchBackdrop({
  searchActive,
  overlayProgress,
  onDismiss,
  dismissLabel,
}: ToursSearchBackdropProps) {
  const theme = useTheme();
  const isDark = useThemeColorScheme() === 'dark';

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(overlayProgress.value, [0, 0.65], [0, 1], Extrapolation.CLAMP),
  }));

  // Subtle wash — recent panel uses its own opaque card for contrast.
  const scrimColor = color(theme, 'foreground');
  const scrimOpacity =
    Platform.OS === 'ios'
      ? isDark
        ? SEARCH_BLUR_SCRIM_OPACITY
        : SEARCH_BACKDROP_DARK_OPACITY
      : SEARCH_SCRIM_OPACITY;

  return (
    <Animated.View
      pointerEvents={searchActive ? 'box-none' : 'none'}
      style={[styles.root, backdropStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        onPress={onDismiss}
        style={StyleSheet.absoluteFillObject}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            pointerEvents="none"
            intensity={SEARCH_BLUR_INTENSITY}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: scrimColor, opacity: scrimOpacity },
          ]}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },
});
