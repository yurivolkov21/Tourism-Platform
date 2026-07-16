import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { messages } from '@tourism/i18n';
import { AppText, GlowBadge, useTheme } from '@tourism/mobile-ui';

/**
 * P5.7 S1b — branded boot screen (Navel Screen-0 spirit, our own mark):
 * Fraunces "N" monogram in a GlowBadge halo + wordmark/tagline at the foot.
 * Shown by RootLayout for a ~1s brand moment between the native splash and
 * onboarding/Home. Own mark on purpose — the kit's plane-in-diamond logo is
 * its identity (inspiration-only license).
 */
export function BrandSplash() {
  const theme = useTheme();
  return (
    <Animated.View
      testID="brand-splash"
      exiting={FadeOut.duration(250)}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors['background'],
      }}
    >
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        <GlowBadge size={128}>
          <AppText
            style={{
              fontFamily: theme.fontFamilies.headingBold,
              fontSize: 56,
              lineHeight: 68,
              color: theme.colors['primary'],
            }}
          >
            N
          </AppText>
        </GlowBadge>
      </Animated.View>
      <Animated.View
        entering={FadeIn.delay(200).duration(400)}
        style={{
          position: 'absolute',
          bottom: 72,
          left: 0,
          right: 0,
          alignItems: 'center',
          gap: theme.spacing(1),
        }}
      >
        <AppText
          style={{
            fontFamily: theme.fontFamilies.headingBold,
            fontSize: 34,
            lineHeight: 40,
            color: theme.colors['primary'],
          }}
        >
          {messages.brand.name}
        </AppText>
        <AppText
          variant="caption"
          style={{
            color: theme.colors['muted-foreground'],
            letterSpacing: 1.5,
            textAlign: 'center',
          }}
        >
          {messages.brand.tagline}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}
