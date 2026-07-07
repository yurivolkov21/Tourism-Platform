import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Card, useTheme } from '@tourism/mobile-ui';
import type { TourCardVm } from '../lib/tours';
import { TourBadges } from './tour-badges';

const t = messages.featuredTours;
const tm = messages.mobile;

export interface TourCardProps {
  tour: TourCardVm;
  /** 'shelf' = 260-wide horizontal-rail card (Home). 'list' = full-width row (Explore). */
  variant?: 'shelf' | 'list';
  onPress?: () => void;
}

function price(currency: string, amount: number) {
  return `${currency === 'USD' ? '$' : `${currency} `}${amount.toLocaleString('en-US')}`;
}

export function TourCard({ tour, variant = 'shelf', onPress }: TourCardProps) {
  const theme = useTheme();
  const list = variant === 'list';
  const lowSeats = tour.nextDepartureSeatsLeft != null && tour.nextDepartureSeatsLeft <= 5;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card style={list ? undefined : { width: 260 }}>
        <View>
          <Image
            source={tour.image ? { uri: tour.image } : undefined}
            style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: theme.colors['muted'] }}
            contentFit="cover"
            accessibilityLabel={tour.title}
          />
          <View style={{ position: 'absolute', top: theme.spacing(2), left: theme.spacing(2) }}>
            <TourBadges badges={tour.badges} />
          </View>
        </View>
        <View style={{ padding: theme.spacing(3), gap: theme.spacing(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
              <Ionicons
                name="location-outline"
                size={13}
                color={theme.colors['muted-foreground']}
              />
              <AppText variant="caption" muted>
                {tour.destination}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
              <Ionicons name="time-outline" size={13} color={theme.colors['muted-foreground']} />
              <AppText variant="caption" muted>
                {tm.home.durationDays(tour.durationDays)}
              </AppText>
            </View>
          </View>

          <AppText
            numberOfLines={2}
            style={{
              fontFamily: theme.fontFamilies.sansSemiBold,
              fontSize: 17,
              lineHeight: 24,
              minHeight: 48,
              color: theme.colors['foreground'],
            }}
          >
            {tour.title}
          </AppText>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing(2),
            }}
          >
            {tour.reviewCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
                <Ionicons name="star" size={14} color={theme.colors['rating']} />
                <AppText variant="caption">{tour.rating.toFixed(1)}</AppText>
                <AppText variant="caption" muted>
                  ({tour.reviewCount} {t.reviewsLabel})
                </AppText>
              </View>
            ) : (
              <View />
            )}
            {list && lowSeats && tour.nextDepartureSeatsLeft != null ? (
              <Badge tone="warning" label={tm.tourDetail.seatsLeft(tour.nextDepartureSeatsLeft)} />
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing(2) }}>
            <AppText variant="caption" muted>
              {t.from}
            </AppText>
            <AppText
              style={{
                fontFamily: theme.fontFamilies.sansSemiBold,
                fontSize: 18,
                lineHeight: 24,
                color: theme.colors['foreground'],
              }}
            >
              {price(tour.currency, tour.basePrice)}
            </AppText>
            {tour.compareAtPrice ? (
              <AppText variant="caption" muted style={{ textDecorationLine: 'line-through' }}>
                {price(tour.currency, tour.compareAtPrice)}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
