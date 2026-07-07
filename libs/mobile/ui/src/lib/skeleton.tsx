import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewProps } from 'react-native';
import { useTheme } from './theme-provider';

export interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

/** Loading placeholder with a soft opacity pulse (native driver — Expo Go safe). */
export function Skeleton({ width, height, borderRadius, style, ...rest }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      {...rest}
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? theme.radius.md,
          backgroundColor: theme.colors['muted'],
          opacity,
        },
        style,
      ]}
    />
  );
}
