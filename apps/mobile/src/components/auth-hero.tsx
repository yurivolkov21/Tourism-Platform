import { View, useWindowDimensions } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, useTheme } from '@tourism/mobile-ui';

/**
 * P5.7 S2 v2 — auth screens' photo header (Navel Screen-4): the image owns
 * ~42% of the screen and DISSOLVES into the emerald background over a long
 * gradient (to the background color, not a black scrim) — no visible seam.
 * The Fraunces display title sits in the blend zone at the bottom.
 */
export function AuthHero({
  image,
  title,
}: {
  image: ImageProps['source'];
  title: string;
}) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const heroHeight = Math.round(height * 0.42);
  return (
    <View style={{ height: heroHeight, justifyContent: 'flex-end' }}>
      <Image
        source={image}
        style={{ position: 'absolute', inset: 0 }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={title}
      />
      <View
        testID="auth-hero-tint"
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: theme.colors['media-tint'],
        }}
      />
      <LinearGradient
        testID="auth-hero-fade"
        pointerEvents="none"
        colors={['transparent', theme.colors['background']]}
        locations={[0.3, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <AppText variant="hero" style={{ paddingHorizontal: theme.spacing(7) }}>
        {title}
      </AppText>
    </View>
  );
}
