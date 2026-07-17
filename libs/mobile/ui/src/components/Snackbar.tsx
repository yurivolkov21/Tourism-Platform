import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';
import { cardElevation } from '../theme/card-chrome';

type SnackbarProps = {
  visible: boolean;
  message: string;
  /** Optional action (e.g. "Undo") shown at the right edge. */
  actionLabel?: string;
  onAction?: () => void;
  /** Called when the auto-dismiss timer elapses. */
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. */
  duration?: number;
  /** Distance from the bottom edge — lift above a floating tab bar. */
  bottomOffset?: number;
};

const SHOW_MS = 220;
const HIDE_MS = 160;

/** Transient confirmation bar with optional action — bottom of the screen. */
export function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 4000,
  bottomOffset = 0,
}: SnackbarProps) {
  const theme = useTheme();
  const styles = createStyles(theme, bottomOffset);
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: SHOW_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      dismissTimer.current = setTimeout(onDismiss, duration);
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: HIDE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
    // Re-run on message change so consecutive snackbars restart the timer.
  }, [visible, message, duration, onDismiss, progress]);

  if (!mounted) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.bar,
          {
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <AppText variant="caption" style={styles.message} numberOfLines={2}>
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={10}
            onPress={onAction}
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
          >
            <AppText variant="caption" style={styles.actionText}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  bottomOffset: number,
) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: bottomOffset,
      alignItems: 'center',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.sm,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      backgroundColor: color(theme, 'card'),
      ...cardElevation(theme),
    },
    message: {
      flexShrink: 1,
      color: color(theme, 'foreground'),
    },
    action: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    actionPressed: {
      opacity: 0.6,
    },
    actionText: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansSemibold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
}
