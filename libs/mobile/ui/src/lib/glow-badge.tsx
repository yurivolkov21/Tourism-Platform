import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from './theme-provider';

export interface GlowBadgeProps {
  /** Halo semantic: success = brass, error = destructive, neutral = muted. */
  tone?: 'success' | 'error' | 'neutral';
  size?: number;
  /** Circular content — an icon or an <Image>. */
  children: ReactNode;
}

/**
 * P5.6 confirmation hero: ONE template for success/cancel/pending — only the
 * glow color and copy differ (Navel Screens 39/50). The halo is layered
 * translucent Views, not a blurred shadow (RN renders those poorly).
 */
export function GlowBadge({
  tone = 'success',
  size = 112,
  children,
}: GlowBadgeProps) {
  const theme = useTheme();
  const glow =
    tone === 'success'
      ? theme.colors['primary']
      : tone === 'error'
        ? theme.colors['destructive']
        : theme.colors['muted-foreground'];
  return (
    <View
      testID={`glow-badge-${tone}`}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      {[1.5, 1.25].map((scale) => (
        <View
          key={scale}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * scale,
            height: size * scale,
            borderRadius: (size * scale) / 2,
            backgroundColor: glow,
            opacity: scale === 1.5 ? 0.08 : 0.16,
          }}
        />
      ))}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: glow,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
        }}
      >
        {children}
      </View>
    </View>
  );
}
