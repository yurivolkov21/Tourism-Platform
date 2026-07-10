import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const PILL_CONFIG = [
  { icon: 'business-outline' as IoniconName, tone: 'primary' as const, bgAlpha: 0.1 },
  { icon: 'compass-outline' as IoniconName, tone: 'rating' as const, bgAlpha: 0.15 },
  { icon: 'leaf-outline' as IoniconName, tone: 'info' as const, bgAlpha: 0.1 },
];

const MARQUEE_DURATION_MS = 22_000;

function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${normalized}${a}`;
}

type MetricPillsProps = {
  pills: readonly string[];
  /** e.g. "— built on" — scrolls inline before the keyword pills. */
  prefix?: string;
};

function PillRow({
  pills,
  prefix,
  styles,
  theme,
}: {
  pills: readonly string[];
  prefix?: string;
  styles: ReturnType<typeof createStyles>;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.row}>
      {prefix ? (
        <AppText variant="title" serif style={styles.prefix}>
          {prefix}
        </AppText>
      ) : null}
      {pills.map((pill, index) => {
        const config = PILL_CONFIG[index] ?? PILL_CONFIG[0];
        const toneColor = color(theme, config.tone);
        return (
          <View
            key={`${pill}-${index}`}
            style={[
              styles.pill,
              { backgroundColor: hexWithAlpha(toneColor, config.bgAlpha) },
            ]}
          >
            <Ionicons name={config.icon} size={24} color={toneColor} />
            <AppText style={[styles.label, { color: toneColor }]}>{pill}</AppText>
          </View>
        );
      })}
    </View>
  );
}

/** Brand keyword pills — Fraunces italic marquee (matches web ByTheNumbers). */
export function MetricPills({ pills, prefix }: MetricPillsProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const translateX = useRef(new Animated.Value(0)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (segmentWidth <= 0 || reduceMotion) {
      translateX.stopAnimation();
      translateX.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -segmentWidth,
        duration: MARQUEE_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, segmentWidth, translateX]);

  function onSegmentLayout(event: LayoutChangeEvent) {
    const width = Math.ceil(event.nativeEvent.layout.width);
    if (width > 0 && width !== segmentWidth) {
      setSegmentWidth(width);
    }
  }

  if (reduceMotion) {
    return (
      <View style={styles.viewport}>
        <PillRow pills={pills} prefix={prefix} styles={styles} theme={theme} />
      </View>
    );
  }

  return (
    <View style={styles.viewport}>
      <Animated.View
        style={[
          styles.track,
          segmentWidth > 0 ? { transform: [{ translateX }] } : null,
        ]}
      >
        <View onLayout={onSegmentLayout}>
          <PillRow pills={pills} prefix={prefix} styles={styles} theme={theme} />
        </View>
        <PillRow pills={pills} prefix={prefix} styles={styles} theme={theme} />
      </Animated.View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    viewport: {
      overflow: 'hidden',
      width: '100%',
    },
    track: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    prefix: {
      flexShrink: 0,
      fontSize: 24,
      lineHeight: 32,
      marginRight: theme.spacing.xs,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: theme.spacing.sm,
      borderRadius: 999,
    },
    label: {
      fontFamily: theme.fonts.headingItalic,
      fontSize: 24,
      lineHeight: 28,
    },
  });
}
