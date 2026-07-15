import { Pressable, View } from 'react-native';
import { messages } from '@tourism/i18n';
import { AppText, ScrimImage, useTheme } from '@tourism/mobile-ui';
import type { SavedTourVm } from '../lib/wishlist';

const tf = messages.featuredTours;

export function SavedMiniCard({
  tour,
  onPress,
}: {
  tour: SavedTourVm;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={`saved-${tour.tourId}`}
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'] }}
      style={({ pressed }) => ({
        width: 160,
        gap: theme.spacing(2),
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      {/* P5.6: uniform grade via ScrimImage; no bottom scrim (no overlaid text). */}
      <View style={{ width: 160 }}>
        <ScrimImage
          uri={tour.image}
          alt={tour.title}
          aspectRatio={160 / 108}
          radius={theme.radius.md}
          scrim={false}
        />
      </View>
      <AppText
        numberOfLines={2}
        style={{
          fontFamily: theme.fontFamilies.sansSemiBold,
          fontSize: 14,
          lineHeight: 18,
          minHeight: 36,
        }}
      >
        {tour.title}
      </AppText>
      <AppText variant="caption" muted>
        {tf.from} {tour.currency === 'USD' ? '$' : `${tour.currency} `}
        {tour.basePrice.toLocaleString('en-US')}
      </AppText>
    </Pressable>
  );
}
