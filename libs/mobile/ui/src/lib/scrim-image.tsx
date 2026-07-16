import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './theme-provider';

export interface ScrimImageProps {
  uri: string | undefined;
  alt: string;
  /** width/height, e.g. 4/3 (default) or 3/4 for tall hero cards. */
  aspectRatio?: number;
  /** Fill the parent's height (flex: 1) instead of deriving it from width. */
  fill?: boolean;
  radius?: number;
  /** Brand grade tint layer — the ONE uniform "color grade" over any photo. */
  tint?: boolean;
  /** Bottom legibility gradient under the children. */
  scrim?: boolean;
  /** Rendered on the image, bottom-aligned. */
  children?: ReactNode;
}

/**
 * P5.6 "Nexora Dark Heritage": every photo in the app renders through this
 * primitive so real, unevenly-graded admin uploads still read as one system —
 * a thin emerald tint unifies the grade, a bottom scrim carries overlaid text.
 * Text/icons on it must use the `on-media` token (stays light in both schemes).
 */
export function ScrimImage({
  uri,
  alt,
  aspectRatio = 4 / 3,
  fill = false,
  radius,
  tint = true,
  scrim = true,
  children,
}: ScrimImageProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={alt}
      style={{
        ...(fill ? { flex: 1 } : { aspectRatio }),
        borderRadius: radius ?? theme.radius.xl,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: theme.colors['muted'],
      }}
    >
      <Image
        source={uri ? { uri } : undefined}
        alt={alt}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
      />
      {tint ? (
        <View
          testID="scrim-tint"
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: theme.colors['media-tint'],
          }}
        />
      ) : null}
      {scrim ? (
        <LinearGradient
          testID="scrim-grad"
          pointerEvents="none"
          colors={['transparent', theme.colors['scrim']]}
          locations={[0.45, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
      {children ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: theme.spacing(4),
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
