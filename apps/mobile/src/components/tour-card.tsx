import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, Card, useTheme } from '@tourism/mobile-ui';
import type { TourCardVm } from '../lib/tours';

const t = messages.mobile.home;
const td = messages.mobile.tourDetail;

export interface TourCardProps {
  tour: TourCardVm;
  /** 'shelf' = 240-wide horizontal-rail card (Home). 'list' = full-width row (Explore). */
  variant?: 'shelf' | 'list';
  onPress?: () => void;
}

export function TourCard({ tour, variant = 'shelf', onPress }: TourCardProps) {
  const theme = useTheme();
  const list = variant === 'list';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card style={list ? undefined : { width: 240 }}>
        <Image
          source={tour.image ? { uri: tour.image } : undefined}
          style={{ width: '100%', height: list ? 170 : 130, backgroundColor: theme.colors['muted'] }}
          contentFit="cover"
          accessibilityLabel={tour.title}
        />
        <View style={{ padding: theme.spacing(3), gap: theme.spacing(1) }}>
          <AppText variant="caption" muted>
            {tour.destination} · {t.durationDays(tour.durationDays)}
          </AppText>
          <AppText variant="title" numberOfLines={2}>
            {tour.title}
          </AppText>
          {list && tour.reviewCount > 0 ? (
            <AppText variant="caption" muted>
              {td.reviewsLine(tour.rating, tour.reviewCount)}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing(2) }}>
            <AppText variant="body">
              {t.from} {tour.currency === 'USD' ? '$' : ''}
              {tour.basePrice}
            </AppText>
            {tour.compareAtPrice ? (
              <AppText variant="caption" muted style={{ textDecorationLine: 'line-through' }}>
                {tour.currency === 'USD' ? '$' : ''}
                {tour.compareAtPrice}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
