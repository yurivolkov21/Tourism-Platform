import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, useTheme } from '@tourism/mobile-ui';
import type { SavedTourVm } from '../lib/wishlist';

const tf = messages.featuredTours;

export function SavedMiniCard({ tour, onPress }: { tour: SavedTourVm; onPress: () => void }) {
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
      <Image
        source={tour.image ? { uri: tour.image } : undefined}
        style={{
          width: 160,
          height: 108,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors['muted'],
        }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={tour.title}
      />
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
