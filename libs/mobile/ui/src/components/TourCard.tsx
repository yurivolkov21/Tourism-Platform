import { Ionicons } from '@expo/vector-icons';
import { useEffect, useId, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { TOUR_CARD_IMAGE_FALLBACK, type TourCardData } from '@tourism/core';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

export type TourCardViewMode = 'vertical' | 'horizontal';

type TourCardProps = {
  tour: TourCardData;
  onPress?: () => void;
  daysLabel: (n: number) => string;
  reviewsLabel: (n: number) => string;
  /** Used in accessibility label (CTA is icon-only). */
  viewTourLabel: string;
  /** Kept for API compat; not shown on editorial overlay (reduces clutter). */
  perPersonLabel?: string;
  viewMode?: TourCardViewMode;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Precomputed — omit when no badge to show. */
  badgeLabel?: string;
  /** Precomputed — omit unless meaningful (e.g. few seats). */
  availabilityLabel?: string;
  availabilityUrgent?: boolean;
  /** Wishlist — omit heart when not provided. */
  saved?: boolean;
  saveLabel?: string;
  unsaveLabel?: string;
  onToggleSave?: () => void;
};

const textHalo = {
  textShadowColor: 'rgba(0, 0, 0, 0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;

function formatPriceLabel(currency: string, amount: number): string {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

export function TourCard({
  tour,
  onPress,
  daysLabel,
  reviewsLabel,
  viewTourLabel,
  viewMode = 'vertical',
  width,
  height,
  style,
  badgeLabel,
  availabilityLabel,
  availabilityUrgent = false,
  saved = false,
  saveLabel,
  unsaveLabel,
  onToggleSave,
}: TourCardProps) {
  const theme = useTheme();
  const landscape = viewMode === 'horizontal';
  const styles = createStyles(theme, landscape, width, height);
  const onMedia = color(theme, 'on-media');
  const [imageUri, setImageUri] = useState(tour.image ?? TOUR_CARD_IMAGE_FALLBACK);
  const idBase = useId().replace(/:/g, '');
  const topGradientId = `${idBase}-top`;
  const bottomGradientId = `${idBase}-bottom`;

  useEffect(() => {
    setImageUri(tour.image ?? TOUR_CARD_IMAGE_FALLBACK);
  }, [tour.image, tour.slug]);

  const priceLabel = formatPriceLabel(tour.currency, tour.basePrice);
  const showCompare =
    tour.compareAtPrice != null && tour.compareAtPrice > tour.basePrice;

  // title → price → destination → duration (a11y preference)
  const accessibilityLabel = [
    tour.title,
    priceLabel,
    tour.destination,
    daysLabel(tour.durationDays),
    tour.reviewCount > 0 ? reviewsLabel(tour.reviewCount) : null,
    availabilityLabel,
    viewTourLabel,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
    >
      <View style={styles.imageWrap} pointerEvents="none">
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          accessible={false}
          importantForAccessibility="no"
          onError={() => setImageUri(TOUR_CARD_IMAGE_FALLBACK)}
        />
      </View>

      {/* Smooth local gradients — same language as DestinationCard */}
      <View style={styles.topScrim} pointerEvents="none">
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={topGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={landscape ? 0.4 : 0.36} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${topGradientId})`} />
        </Svg>
      </View>
      <View style={styles.bottomScrim} pointerEvents="none">
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={bottomGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0} />
              <Stop offset="0.45" stopColor="#000000" stopOpacity={landscape ? 0.26 : 0.3} />
              <Stop offset="1" stopColor="#000000" stopOpacity={landscape ? 0.58 : 0.64} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${bottomGradientId})`} />
        </Svg>
      </View>

      <View style={styles.topBar} pointerEvents="box-none">
        {badgeLabel ? (
          <View style={styles.badge} pointerEvents="none">
            <AppText variant="caption" style={styles.badgeText} numberOfLines={1}>
              {badgeLabel}
            </AppText>
          </View>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
        {onToggleSave && saveLabel && unsaveLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? unsaveLabel : saveLabel}
            hitSlop={6}
            onPress={() => {
              onToggleSave();
            }}
            style={({ pressed }) => [styles.wishlist, pressed && styles.wishlistPressed]}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={landscape ? 18 : 20}
              color={saved ? color(theme, 'destructive') : onMedia}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.footer} pointerEvents="box-none">
        <View style={styles.copy} pointerEvents="none">
          {tour.destination ? (
            <View style={styles.locationChip}>
              <Ionicons name="location-outline" size={14} color={onMedia} />
              <AppText variant="caption" style={styles.locationText} numberOfLines={1}>
                {tour.destination}
              </AppText>
            </View>
          ) : null}
          <AppText
            variant="headline"
            style={styles.title}
            numberOfLines={2}
          >
            {tour.title}
          </AppText>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={onMedia} />
            <AppText variant="caption" style={styles.meta} numberOfLines={1}>
              {daysLabel(tour.durationDays)}
            </AppText>
            {tour.reviewCount > 0 ? (
              <>
                <View style={styles.metaDot} />
                <Ionicons name="star" size={13} color={color(theme, 'rating')} />
                <AppText variant="caption" style={styles.meta} numberOfLines={1}>
                  {tour.rating.toFixed(1)}
                </AppText>
              </>
            ) : null}
            {availabilityLabel ? (
              <>
                <View style={styles.metaDot} />
                <AppText
                  variant="caption"
                  style={[styles.meta, availabilityUrgent && styles.metaUrgent]}
                  numberOfLines={1}
                >
                  {availabilityLabel}
                </AppText>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.trailing}>
          <View style={styles.priceBlock} pointerEvents="none">
            {showCompare ? (
              <AppText variant="caption" style={styles.comparePrice} numberOfLines={1}>
                {formatPriceLabel(tour.currency, tour.compareAtPrice!)}
              </AppText>
            ) : null}
            <AppText variant="headline" style={styles.price} numberOfLines={1}>
              {priceLabel}
            </AppText>
          </View>
          <View
            style={styles.cta}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Ionicons
              name="arrow-forward"
              size={landscape ? 18 : 20}
              color={color(theme, 'primary-foreground')}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  landscape: boolean,
  width: number | undefined,
  height: number | undefined,
) {
  const resolvedHeight = height ?? (landscape ? 220 : 320);
  const inset = landscape ? theme.spacing.md + 2 : theme.spacing.lg;
  const heartSize = landscape ? 42 : 44;

  return StyleSheet.create({
    card: {
      width: width ?? undefined,
      height: resolvedHeight,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'muted'),
      minHeight: 44,
    },
    cardPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.98 }],
    },
    imageWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    topScrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: landscape ? '32%' : '26%',
    },
    bottomScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: landscape ? '62%' : '52%',
    },
    topBar: {
      position: 'absolute',
      top: inset,
      left: inset,
      right: inset,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    locationChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minWidth: 0,
      maxWidth: '100%',
    },
    locationText: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
      flexShrink: 1,
      ...textHalo,
    },
    topBarSpacer: {
      flex: 1,
    },
    badge: {
      flexShrink: 1,
      maxWidth: '70%',
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: color(theme, 'overlay'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'on-media'),
    },
    badgeText: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansSemibold,
      fontSize: 12,
      lineHeight: 16,
      ...textHalo,
    },
    wishlist: {
      width: heartSize,
      height: heartSize,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'overlay'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'on-media'),
    },
    wishlistPressed: {
      opacity: 0.75,
    },
    footer: {
      position: 'absolute',
      left: inset,
      right: inset,
      bottom: inset,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.md,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: landscape ? 6 : 6,
      paddingRight: theme.spacing.xs,
    },
    title: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansSemibold,
      fontSize: landscape ? 20 : 26,
      lineHeight: landscape ? 26 : 32,
      letterSpacing: -0.4,
      textShadowColor: 'rgba(0, 0, 0, 0.65)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    meta: {
      color: color(theme, 'on-media'),
      opacity: 0.95,
      fontFamily: theme.fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
      flexShrink: 1,
      ...textHalo,
    },
    metaUrgent: {
      color: color(theme, 'destructive'),
      opacity: 1,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: color(theme, 'on-media'),
      opacity: 0.55,
    },
    trailing: {
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
      flexShrink: 0,
    },
    priceBlock: {
      alignItems: 'flex-end',
      gap: 2,
      maxWidth: landscape ? 110 : 140,
    },
    comparePrice: {
      color: color(theme, 'on-media'),
      opacity: 0.9,
      fontSize: 13,
      lineHeight: 17,
      textDecorationLine: 'line-through',
      fontFamily: theme.fonts.sansMedium,
      textShadowColor: 'rgba(0, 0, 0, 0.85)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    price: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansSemibold,
      fontSize: landscape ? 20 : 22,
      lineHeight: landscape ? 24 : 28,
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 10,
    },
    cta: {
      minWidth: 44,
      minHeight: 44,
      width: landscape ? 50 : 52,
      height: landscape ? 46 : 48,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'primary'),
    },
  });
}
