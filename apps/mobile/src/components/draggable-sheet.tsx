import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  type ReactNode,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { color, useBottomSafeInset, useTheme } from '@tourism/mobile-ui';

const OPEN_SPRING = { damping: 28, stiffness: 320, mass: 0.9 };
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;
const EXIT_DURATION_MS = 200;

export type DraggableSheetHandle = {
  /** Animate the sheet out, then fire `onClose`. */
  dismiss: () => void;
};

type DraggableSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Rendered inside the drag zone, right under the grabber. */
  header?: ReactNode;
  children: ReactNode;
  /** Sheet max height as a fraction of the window height. */
  maxHeightFraction?: number;
};

/** Bottom sheet with iOS-native feel: drag down (on grabber/header) to dismiss,
 * snap back on small drags, backdrop fades with the drag. Built on RN Modal +
 * Reanimated + gesture-handler — no @gorhom/bottom-sheet (broken with
 * Reanimated 4 on the New Architecture). */
export const DraggableSheet = forwardRef<DraggableSheetHandle, DraggableSheetProps>(
  function DraggableSheet(
    { visible, onClose, header, children, maxHeightFraction = 0.85 },
    ref,
  ) {
    const theme = useTheme();
    const bottomInset = useBottomSafeInset(theme.spacing.lg);
    const { height: windowHeight } = useWindowDimensions();
    const styles = createStyles(theme);

    const translateY = useSharedValue(windowHeight);
    const dragStart = useSharedValue(0);

    useEffect(() => {
      if (visible) {
        translateY.value = windowHeight;
        translateY.value = withSpring(0, OPEN_SPRING);
      }
    }, [visible, windowHeight, translateY]);

    const animateOut = useCallback(() => {
      translateY.value = withTiming(
        windowHeight,
        { duration: EXIT_DURATION_MS },
        (finished) => {
          if (finished) {
            runOnJS(onClose)();
          }
        },
      );
    }, [onClose, translateY, windowHeight]);

    useImperativeHandle(ref, () => ({ dismiss: animateOut }), [animateOut]);

    const pan = Gesture.Pan()
      .onStart(() => {
        dragStart.value = translateY.value;
      })
      .onUpdate((event) => {
        const next = dragStart.value + event.translationY;
        // Free drag downward; heavy resistance upward past the open position.
        translateY.value = next >= 0 ? next : next * 0.15;
      })
      .onEnd((event) => {
        if (
          event.translationY > DISMISS_DISTANCE ||
          event.velocityY > DISMISS_VELOCITY
        ) {
          translateY.value = withTiming(
            windowHeight,
            { duration: EXIT_DURATION_MS },
            (finished) => {
              if (finished) {
                runOnJS(onClose)();
              }
            },
          );
        } else {
          translateY.value = withSpring(0, OPEN_SPRING);
        }
      });

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(translateY.value, [0, windowHeight], [1, 0]),
    }));
    const sheetAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={animateOut}
      >
        {/* RN Modal hosts a new native window on Android — gesture handlers
            inside it need their own GestureHandlerRootView. */}
        <GestureHandlerRootView style={styles.root}>
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={StyleSheet.absoluteFill}
              onPress={animateOut}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              {
                maxHeight: windowHeight * maxHeightFraction,
                paddingBottom: bottomInset,
              },
              sheetAnimatedStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View>
                <View style={styles.grabber} />
                {header}
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </GestureHandlerRootView>
      </Modal>
    );
  },
);

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    sheet: {
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      backgroundColor: color(theme, 'card'),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      ...Platform.select({
        ios: {
          shadowColor: color(theme, 'foreground'),
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 14,
        },
        android: { elevation: 14 },
        default: {},
      }),
    },
    grabber: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 999,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      backgroundColor: color(theme, 'muted-foreground'),
      opacity: 0.25,
    },
  });
}
