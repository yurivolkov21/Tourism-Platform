import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AppText, useTheme } from '@tourism/mobile-ui';

const AUTO_DISMISS_MS = 4000;

export interface SnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  /** Clears the bottom UI (e.g. the floating tab bar) it floats above. */
  bottomOffset?: number;
}

/** Transient bottom bar for undo-able destructive actions (e.g. unsave). */
export function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  bottomOffset = 0,
}: SnackbarProps) {
  const theme = useTheme();
  // Ref keeps the timeout from resetting on every re-render of an inline
  // `onDismiss` — only `visible`/`message` should restart the auto-dismiss clock.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{
        // The parent Screen already reserves horizontal padding for content —
        // 0/0 aligns the snackbar to that same edge instead of double-padding it.
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: bottomOffset,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing(3),
          backgroundColor: theme.colors['foreground'],
          borderRadius: theme.radius.md,
          paddingVertical: theme.spacing(3),
          paddingHorizontal: theme.spacing(4),
        }}
      >
        <AppText
          variant="body"
          numberOfLines={1}
          style={{ flex: 1, color: theme.colors['background'] }}
        >
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            hitSlop={8}
          >
            <AppText
              variant="body"
              style={{
                color: theme.colors['primary'],
                fontFamily: theme.fontFamilies.sansSemiBold,
              }}
            >
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
