import { useId } from 'react';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import { messages } from '@tourism/i18n';
import { color, useTheme } from '@tourism/mobile-ui';

type NexoraLogoProps = {
  /** Wordmark size in px — web header uses 24 (`text-[1.5rem]`). */
  size?: number;
};

/**
 * Nexora wordmark with the web `.nexora-fold` diagonal two-tone (see `apps/web/src/app/global.css`).
 */
export function NexoraLogo({ size = 24 }: NexoraLogoProps) {
  const theme = useTheme();
  const primary = color(theme, 'primary');
  const gradientId = useId().replace(/:/g, '');
  const label = messages.brand.name;
  const height = size * 1.15;
  const width = label.length * size * 0.58;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={primary} />
          <Stop offset="0.51" stopColor={primary} />
          <Stop offset="0.51" stopColor={primary} stopOpacity={0.5} />
          <Stop offset="1" stopColor={primary} stopOpacity={0.5} />
        </LinearGradient>
      </Defs>
      <SvgText
        fill={`url(#${gradientId})`}
        fontSize={size}
        fontWeight="800"
        x={0}
        y={size}
        letterSpacing={-size * 0.045}
      >
        {label}
      </SvgText>
    </Svg>
  );
}
