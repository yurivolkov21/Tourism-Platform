import type { ReactNode } from 'react';
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
  /** Injected wishlist heart (keeps the card presentation-only). */
  heartSlot?: ReactNode;
}

function price(currency: string, amount: number) {
  return `${currency === 'USD' ? '$' : `${currency} `}${amount.toLocaleString('en-US')}`;
}

export function TourCard({ tour, variant = 'shelf', onPress, heartSlot }: TourCardProps) {
  const theme = useTheme();
  const list = variant === 'list';
  const lowSeats = tour.nextDepartureSeatsLeft != null && tour.nextDepartureSeatsLeft <= 5;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        // Clip the ripple to the Card's rounded shape.
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <Card style={list ? undefined : { width: 260 }}>
        <View>
          <Image
            source={tour.image ? { uri: tour.image } : undefined}
            style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: theme.colors['muted'] }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={tour.title}
          />
          <View style={{ position: 'absolute', top: theme.spacing(2), left: theme.spacing(2) }}>
            <TourBadges badges={tour.badges} />
          </View>
          {heartSlot ? (
            <View style={{ position: 'absolute', top: theme.spacing(2), right: theme.spacing(2) }}>
              {heartSlot}
            </View>
          ) : null}
        </View>
        {/* Every row below renders unconditionally with a locked height so all
            cards in a rail/list line up (web parity — the user's on-device
            feedback 2026-07-07: no more short/tall card mix). */}
        <View style={{ padding: theme.spacing(3), gap: theme.spacing(2) }}>
          {/* Row 1 — meta, exactly 1 line */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(3),
              height: 18,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing(1),
                flexShrink: 1,
              }}
            >
              <Ionicons
                name="location-outline"
                size={13}
                color={theme.colors['muted-foreground']}
              />
              <AppText variant="caption" muted numberOfLines={1} style={{ flexShrink: 1 }}>
                {tour.destination}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
              <Ionicons name="time-outline" size={13} color={theme.colors['muted-foreground']} />
              <AppText variant="caption" muted numberOfLines={1}>
                {tm.home.durationDays(tour.durationDays)}
              </AppText>
            </View>
          </View>

          {/* Row 2 — title, exactly 2 lines reserved */}
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

          {/* Row 3 (list only) — summary, exactly 2 lines reserved */}
          {list ? (
            <AppText variant="caption" muted numberOfLines={2} style={{ minHeight: 32 }}>
              {tour.summary ?? ''}
            </AppText>
          ) : null}

          {/* Row 4 — rating (always shown, web parity) + seats badge, 1 line */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing(2),
              height: 20,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
              <Ionicons name="star" size={14} color={theme.colors['rating']} />
              <AppText variant="caption">{tour.rating.toFixed(1)}</AppText>
              <AppText variant="caption" muted>
                ({tour.reviewCount} {t.reviewsLabel})
              </AppText>
            </View>
            {list && lowSeats && tour.nextDepartureSeatsLeft != null ? (
              <Badge tone="warning" label={tm.tourDetail.seatsLeft(tour.nextDepartureSeatsLeft)} />
            ) : null}
          </View>

          {/* Row 5 — price, 1 line */}
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
