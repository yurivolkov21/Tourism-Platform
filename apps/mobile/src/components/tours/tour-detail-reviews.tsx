import { StyleSheet, View } from 'react-native';

import type { TourDetailData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppText, SectionHeader, color, useTheme } from '@tourism/mobile-ui';

type TourDetailReviewsProps = {
  tour: TourDetailData;
};

export function TourDetailReviews({ tour }: TourDetailReviewsProps) {
  if (tour.reviews.length === 0) return null;

  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View>
      <SectionHeader title={messages.tourDetail.reviewsSection.heading} />
      <View style={styles.card}>
        {tour.reviews.map((review, index) => (
          <View
            key={review.id}
            style={[styles.review, index === tour.reviews.length - 1 && styles.reviewLast]}
          >
            <View style={styles.header}>
              <AppText variant="headline">{review.author}</AppText>
              <AppText variant="caption" muted>
                ★ {review.rating.toFixed(1)}
              </AppText>
            </View>
            {review.date ? (
              <AppText variant="caption" muted>
                {review.date}
              </AppText>
            ) : null}
            <AppText variant="body" muted style={styles.quote}>
              {review.quote}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'card'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
    },
    review: {
      padding: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color(theme, 'border'),
      gap: theme.spacing.xs,
    },
    reviewLast: { borderBottomWidth: 0 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    quote: { lineHeight: 22, marginTop: theme.spacing.xs },
  });
}
