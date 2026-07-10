import { StyleSheet, View } from 'react-native';

import type { TourDetailData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppText, SectionHeader, color, useTheme } from '@tourism/mobile-ui';

type TourDetailOverviewProps = {
  tour: TourDetailData;
};

export function TourDetailOverview({ tour }: TourDetailOverviewProps) {
  const theme = useTheme();
  const t = messages.tourDetail;
  const specs = t.specs;
  const rows: { label: string; value: string }[] = [];

  if (tour.destination) {
    rows.push({ label: specs.destination, value: tour.destination });
  }
  rows.push({
    label: specs.duration,
    value: t.durationValue(tour.durationDays),
  });
  rows.push({ label: specs.departure, value: 'Flexible dates' });
  if (tour.accommodation) {
    rows.push({ label: specs.accommodation, value: tour.accommodation });
  }

  if (!tour.overview && rows.length === 0) return null;

  return (
    <View>
      <SectionHeader title={t.overview} />
      <View style={createStyles(theme).card}>
        {tour.overview ? (
          <AppText variant="body" muted style={createStyles(theme).overview}>
            {tour.overview}
          </AppText>
        ) : null}
        {rows.map((row) => (
          <View key={row.label} style={createStyles(theme).row}>
            <AppText variant="caption" muted style={createStyles(theme).label}>
              {row.label}
            </AppText>
            <AppText variant="body" style={createStyles(theme).value}>
              {row.value}
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
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: color(theme, 'card'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      gap: theme.spacing.md,
    },
    overview: { lineHeight: 24 },
    row: { gap: 4 },
    label: { textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '600' },
    value: { fontWeight: '500' },
  });
}
