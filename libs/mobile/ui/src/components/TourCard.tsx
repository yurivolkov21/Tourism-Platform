import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { TOUR_CARD_IMAGE_FALLBACK, type TourCardData } from '@tourism/core';

import { AppText } from './Text';
import { PriceRow } from './PriceRow';
import { TourAvailabilityBadge } from './TourAvailabilityBadge';
import { useTheme } from '../theme/ThemeProvider';
import { cardPressedStyle, cardSectionDivider, cardShell } from '../theme/card-chrome';
import { color } from '../theme/theme';

type TourCardProps = {
  tour: TourCardData;
  onPress?: () => void;
  daysLabel: (n: number) => string;
  reviewsLabel: (n: number) => string;
  viewTourLabel: string;
  perPersonLabel: string;
  /** Precomputed — omit when no badge to show. */
  badgeLabel?: string;
  /** Precomputed — omit for on-request / no date. */
  availabilityLabel?: string;
  availabilityUrgent?: boolean;
};

function formatPriceLabel(currency: string, amount: number): string {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

function DecorativeIcon({
  name,
  color: iconColor,
  size = 14,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
}) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Ionicons name={name} size={size} color={iconColor} />
    </View>
  );
}

export function TourCard({
  tour,
  onPress,
  daysLabel,
  reviewsLabel,
  viewTourLabel,
  perPersonLabel,
  badgeLabel,
  availabilityLabel,
  availabilityUrgent = false,
}: TourCardProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const muted = color(theme, 'muted-foreground');
  const hasSignals = tour.reviewCount > 0 || !!availabilityLabel;
  const [imageUri, setImageUri] = useState(tour.image ?? TOUR_CARD_IMAGE_FALLBACK);

  useEffect(() => {
    setImageUri(tour.image ?? TOUR_CARD_IMAGE_FALLBACK);
  }, [tour.image, tour.slug]);

  const accessibilityLabel = [
    tour.title,
    tour.destination,
    daysLabel(tour.durationDays),
    formatPriceLabel(tour.currency, tour.basePrice),
    viewTourLabel,
  ].join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && cardPressedStyle()]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          onError={() => setImageUri(TOUR_CARD_IMAGE_FALLBACK)}
        />
        {badgeLabel ? (
          <View style={styles.badgeOverlay}>
            <AppText variant="caption" style={styles.badgeText}>
              {badgeLabel}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <DecorativeIcon name="location-outline" color={muted} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.metaText}>
            {tour.destination}
          </AppText>
          <View style={styles.metaDot} />
          <DecorativeIcon name="time-outline" color={muted} />
          <AppText variant="caption" muted>
            {daysLabel(tour.durationDays)}
          </AppText>
        </View>

        <View style={styles.titleRow}>
          <AppText variant="headline" numberOfLines={2} style={styles.title}>
            {tour.title}
          </AppText>
          <DecorativeIcon name="chevron-forward" color={muted} size={18} />
        </View>

        {tour.summary ? (
          <AppText variant="caption" muted numberOfLines={2} style={styles.summary}>
            {tour.summary}
          </AppText>
        ) : null}

        {hasSignals ? (
          <View style={styles.signalsRow}>
            {tour.reviewCount > 0 ? (
              <AppText variant="caption" style={styles.rating}>
                ★ {tour.rating.toFixed(1)} · {reviewsLabel(tour.reviewCount)}
              </AppText>
            ) : null}
            {availabilityLabel ? (
              <TourAvailabilityBadge
                label={availabilityLabel}
                variant={availabilityUrgent ? 'urgent' : 'default'}
                showIcon
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <PriceRow
              currency={tour.currency}
              basePrice={tour.basePrice}
              compareAtPrice={tour.compareAtPrice}
              perPersonLabel={perPersonLabel}
            />
          </View>
          <View style={styles.ctaPill} accessible={false}>
            <AppText variant="caption" style={styles.ctaText}>
              {viewTourLabel}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: cardShell(theme),
    imageWrap: { position: 'relative' },
    image: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: color(theme, 'muted'),
    },
    badgeOverlay: {
      position: 'absolute',
      top: theme.spacing.sm,
      left: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: color(theme, 'overlay'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'on-media'),
    },
    badgeText: {
      fontWeight: '600',
      color: color(theme, 'on-media'),
    },
    body: {
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    metaText: { flexShrink: 1 },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: color(theme, 'border'),
      marginHorizontal: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    title: { flex: 1 },
    summary: {
      marginTop: theme.spacing.xs,
      lineHeight: 18,
    },
    signalsRow: {
      marginTop: theme.spacing.xs,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    rating: {
      color: color(theme, 'rating'),
      fontWeight: '600',
    },
    footer: {
      ...cardSectionDivider(theme),
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    priceBlock: { flex: 1, minWidth: 0 },
    ctaPill: {
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: color(theme, 'primary'),
      flexShrink: 0,
    },
    ctaText: {
      color: color(theme, 'primary-foreground'),
      fontWeight: '600',
    },
  });
}
