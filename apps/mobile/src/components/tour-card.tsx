import type { ReactNode } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Card, ScrimImage, useTheme } from '@tourism/mobile-ui';
import type { TourCardVm } from '../lib/tours';
import { TourBadges } from './tour-badges';

const t = messages.featuredTours;
const tm = messages.mobile;

/** P5.6: shelf cards fill 82% of the window so the next card peeks in the rail. */
export const SHELF_CARD_WIDTH = Math.round(
  Dimensions.get('window').width * 0.82,
);

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

export function TourCard({
  tour,
  variant = 'shelf',
  onPress,
  heartSlot,
}: TourCardProps) {
  const theme = useTheme();
  const list = variant === 'list';
  const lowSeats =
    tour.nextDepartureSeatsLeft != null && tour.nextDepartureSeatsLeft <= 5;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        // Clip the ripple to the Card's rounded shape.
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      {/* P5.6 media-forward card: the photo carries the identity (title +
          meta live ON the image over the scrim); only price stays below.
          Fixed aspect per variant keeps rail/list heights uniform (standing
          user feedback 2026-07-07: no short/tall card mix). */}
      <Card
        variant="media"
        style={list ? undefined : { width: SHELF_CARD_WIDTH }}
      >
        <View>
          <ScrimImage
            uri={tour.image}
            alt={tour.title}
            aspectRatio={list ? 16 / 10 : 4 / 5}
            radius={0}
          >
            <View style={{ gap: theme.spacing(1) }}>
              {/* Meta — rating + duration, 1 line on the image */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(2),
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing(1),
                  }}
                >
                  <Ionicons
                    name="star"
                    size={13}
                    color={theme.colors['rating']}
                  />
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors['on-media'] }}
                  >
                    {tour.rating.toFixed(1)}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors['on-media'], opacity: 0.85 }}
                  >
                    ({tour.reviewCount} {t.reviewsLabel})
                  </AppText>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing(1),
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={theme.colors['on-media']}
                  />
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors['on-media'], opacity: 0.85 }}
                    numberOfLines={1}
                  >
                    {tm.home.durationDays(tour.durationDays)}
                  </AppText>
                </View>
              </View>

              {/* Title — Fraunces on the scrim, 2 lines reserved */}
              <AppText
                numberOfLines={2}
                style={{
                  fontFamily: theme.fontFamilies.headingBold,
                  fontSize: 22,
                  lineHeight: 27,
                  minHeight: 54,
                  color: theme.colors['on-media'],
                }}
              >
                {tour.title}
              </AppText>

              {/* Location — 1 line */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(1),
                }}
              >
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={theme.colors['on-media']}
                />
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    color: theme.colors['on-media'],
                    opacity: 0.85,
                    flexShrink: 1,
                  }}
                >
                  {tour.destination}
                </AppText>
              </View>
            </View>
          </ScrimImage>
          <View
            style={{
              position: 'absolute',
              top: theme.spacing(3),
              left: theme.spacing(3),
            }}
          >
            <TourBadges badges={tour.badges} />
          </View>
          {heartSlot ? (
            <View
              style={{
                position: 'absolute',
                top: theme.spacing(3),
                right: theme.spacing(3),
              }}
            >
              {heartSlot}
            </View>
          ) : null}
        </View>

        {/* Below the image: price row (+ low-seats urgency in lists) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing(2),
            padding: theme.spacing(3),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: theme.spacing(2),
              flexShrink: 1,
            }}
          >
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
              <AppText
                variant="caption"
                muted
                style={{ textDecorationLine: 'line-through' }}
              >
                {price(tour.currency, tour.compareAtPrice)}
              </AppText>
            ) : null}
          </View>
          {list && lowSeats && tour.nextDepartureSeatsLeft != null ? (
            <Badge
              tone="warning"
              label={tm.tourDetail.seatsLeft(tour.nextDepartureSeatsLeft)}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
