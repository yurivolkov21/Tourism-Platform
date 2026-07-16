import { View } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, useTheme } from '@tourism/mobile-ui';

const HEIGHT = 240;

/**
 * P5.7 S2 — auth screens' photo header (Navel Screen-4): the image DISSOLVES
 * into the emerald background (gradient to the background color, not a black
 * scrim) so there is no visible seam; the Fraunces display title sits on the
 * blend. Decorative — pointerEvents none except nothing interactive anyway.
 */
export function AuthHero({
  image,
  title,
}: {
  image: ImageProps['source'];
  title: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ height: HEIGHT, justifyContent: 'flex-end' }}>
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
        locations={[0.15, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <AppText
        variant="display"
        style={{ paddingHorizontal: theme.spacing(4) }}
      >
        {title}
      </AppText>
    </View>
  );
}
