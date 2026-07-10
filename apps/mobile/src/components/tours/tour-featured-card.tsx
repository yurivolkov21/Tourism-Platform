import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { type TourCardData } from '@tourism/core';
import { AppText, color, useTheme } from '@tourism/mobile-ui';

import { RemoteImage } from '../remote-image';

type TourFeaturedCardProps = {
  tour: TourCardData;
  width: number;
  topRecommendedLabel?: string;
  onPress: () => void;
};

export function TourFeaturedCard({
  tour,
  width,
  topRecommendedLabel,
  onPress,
}: TourFeaturedCardProps) {
  const theme = useTheme();
  const styles = createStyles(theme, width);
  const onMedia = color(theme, 'on-media');
  const showRating = tour.reviewCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <RemoteImage uri={tour.image ?? ''} style={styles.imageWrap} imageStyle={styles.image} />
      <View style={styles.scrim} pointerEvents="none" />

      {showRating ? (
        <View style={styles.ratingBadge} pointerEvents="none">
          <Ionicons name="star" size={12} color={color(theme, 'rating')} />
          <AppText variant="caption" style={styles.ratingText}>
            {tour.rating.toFixed(1)}
          </AppText>
        </View>
      ) : null}

      <View style={styles.footer} pointerEvents="none">
        <View style={styles.copy}>
          {topRecommendedLabel ? (
            <AppText variant="caption" style={styles.eyebrow}>
              {topRecommendedLabel}
            </AppText>
          ) : null}
          <AppText variant="headline" style={styles.title} numberOfLines={2}>
            {tour.title}
          </AppText>
          <AppText variant="caption" style={styles.destination} numberOfLines={1}>
            {tour.destination}
          </AppText>
        </View>

        <View style={styles.arrow}>
          <Ionicons name="arrow-forward" size={18} color={onMedia} />
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, width: number) {
  const cardHeight = Math.round(width * 0.62);

  return StyleSheet.create({
    card: {
      width,
      height: cardHeight,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'muted'),
    },
    cardPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.99 }],
    },
    imageWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: color(theme, 'overlay'),
      opacity: 0.35,
    },
    ratingBadge: {
      position: 'absolute',
      top: theme.spacing.sm,
      left: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.lg,
      backgroundColor: color(theme, 'card'),
    },
    ratingText: {
      fontFamily: theme.fonts.sansSemibold,
      color: color(theme, 'foreground'),
    },
    footer: {
      position: 'absolute',
      left: theme.spacing.md,
      right: theme.spacing.md,
      bottom: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    eyebrow: {
      color: color(theme, 'on-media'),
      opacity: 0.9,
    },
    title: {
      color: color(theme, 'on-media'),
      fontSize: 20,
      lineHeight: 26,
    },
    destination: {
      color: color(theme, 'on-media'),
      opacity: 0.88,
    },
    arrow: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'overlay'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'on-media'),
    },
  });
}
