import { StyleSheet, View } from 'react-native';

import type { TourDetailData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppText, color, useTheme } from '@tourism/mobile-ui';

import { RemoteImage } from '../remote-image';

type TourDetailHeroProps = {
  tour: TourDetailData;
  daysLabel: (n: number) => string;
  badgeLabel?: string;
};

export function TourDetailHero({ tour, daysLabel, badgeLabel }: TourDetailHeroProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View>
      <RemoteImage uri={tour.heroImage ?? ''} style={styles.image} />
      <View style={styles.body}>
        {badgeLabel ? (
          <View style={styles.badge}>
            <AppText variant="caption" style={styles.badgeText}>
              {badgeLabel}
            </AppText>
          </View>
        ) : null}
        <AppText variant="title">{tour.title}</AppText>
        <AppText variant="caption" muted>
          {tour.destination} · {daysLabel(tour.durationDays)}
        </AppText>
        {tour.reviewCount > 0 ? (
          <AppText variant="caption" muted style={styles.rating}>
            ★ {tour.rating.toFixed(1)} · {messages.tourDetail.reviews(tour.reviewCount)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    image: {
      width: '100%',
      aspectRatio: 16 / 10,
    },
    body: {
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: color(theme, 'secondary'),
      marginBottom: theme.spacing.xs,
    },
    badgeText: { fontWeight: '600' },
    rating: { marginTop: theme.spacing.xs },
  });
}
