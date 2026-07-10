import { StyleSheet, View } from 'react-native';

import type { TourDetailData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppText, SectionHeader, color, useTheme } from '@tourism/mobile-ui';

type TourDetailItineraryProps = {
  tour: TourDetailData;
};

export function TourDetailItinerary({ tour }: TourDetailItineraryProps) {
  const theme = useTheme();
  const t = messages.tourDetail;

  if (tour.itinerary.length === 0) return null;

  const styles = createStyles(theme);

  return (
    <View>
      <SectionHeader title={t.itinerary} />
      <View style={styles.card}>
        {tour.itinerary.map((day, index) => (
          <View
            key={day.day}
            style={[styles.day, index === tour.itinerary.length - 1 && styles.dayLast]}
          >
            <AppText variant="caption" muted style={styles.dayLabel}>
              {t.dayLabel(day.day)}
            </AppText>
            <AppText variant="headline">{day.title}</AppText>
            {day.body ? (
              <AppText variant="body" muted style={styles.body}>
                {day.body}
              </AppText>
            ) : null}
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
    day: {
      padding: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color(theme, 'border'),
      gap: theme.spacing.xs,
    },
    dayLast: { borderBottomWidth: 0 },
    dayLabel: { textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.4 },
    body: { lineHeight: 22, marginTop: theme.spacing.xs },
  });
}
