import { View, type ViewProps } from 'react-native';
import { useTheme } from './theme-provider';

export interface CardProps extends ViewProps {
  /** `media` (P5.6): image-led card — no border/shadow, xl radius; the photo
   * (ScrimImage) carries the surface, so chrome would just dilute it. */
  variant?: 'surface' | 'media';
}

export function Card({ style, variant = 'surface', ...rest }: CardProps) {
  const theme = useTheme();
  const media = variant === 'media';
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors['card'],
          borderRadius: media ? theme.radius.xl : theme.radius.lg,
          borderCurve: 'continuous',
          borderWidth: media ? 0 : 1,
          borderColor: theme.colors['border'],
          overflow: 'hidden',
          // RN 0.81 CSS shadow (replaces legacy shadow* + elevation). The rgba
          // is a shadow alpha, not a palette color — mirrors the web tokens'
          // card shadow, exempt from the no-hex palette rule.
          boxShadow: media ? undefined : '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        style,
      ]}
    />
  );
}
