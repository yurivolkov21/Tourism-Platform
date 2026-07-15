import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme-provider';

export interface StickyCTABarProps {
  /** Left slot — typically the price block. */
  leading?: ReactNode;
  /** Right slot — the CTA button(s). */
  children: ReactNode;
}

/**
 * P5.6 "Nexora Dark Heritage": price + CTA pinned above the bottom edge,
 * detached from scroll (the single highest-impact "feels native" pattern —
 * Navel Screens 28-30). Screens hosting it must pad their scroll content
 * (~96 + bottom inset) so nothing hides beneath the bar.
 */
export function StickyCTABar({ leading, children }: StickyCTABarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="sticky-cta-bar"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing(3),
        paddingHorizontal: theme.spacing(5),
        paddingTop: theme.spacing(3),
        paddingBottom: insets.bottom + theme.spacing(3),
        backgroundColor: theme.colors['card'],
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        borderCurve: 'continuous',
        borderTopWidth: 1,
        borderColor: theme.colors['border'],
      }}
    >
      {/* The price side yields (flexShrink) — CTAs never clip off-screen
          (adversarial-review finding: a capped, non-shrinking CTA slot
          overflowed on narrow devices at large font scales). */}
      {leading ? <View style={{ flexShrink: 1 }}>{leading}</View> : null}
      <View>{children}</View>
    </View>
  );
}
