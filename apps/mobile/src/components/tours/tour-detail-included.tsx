import { StyleSheet, View } from 'react-native';

import type { TourDetailData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppText, SectionHeader, color, useTheme } from '@tourism/mobile-ui';

type TourDetailIncludedProps = {
  tour: TourDetailData;
};

export function TourDetailIncluded({ tour }: TourDetailIncludedProps) {
  const theme = useTheme();
  const t = messages.tourDetail;
  const labels = t.inclusionLabels;

  const summaryRows = [
    tour.meals ? { label: labels.meals, value: tour.meals } : null,
    tour.transport ? { label: labels.transport, value: tour.transport } : null,
    tour.accommodation ? { label: labels.accommodation, value: tour.accommodation } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const hasIncluded = tour.included.length > 0;
  const hasExcluded = tour.notIncluded.length > 0;

  if (summaryRows.length === 0 && !hasIncluded && !hasExcluded) return null;

  const styles = createStyles(theme);

  return (
    <View>
      <SectionHeader title={t.included} />
      <View style={styles.card}>
        {summaryRows.map((row) => (
          <View key={row.label} style={styles.summaryRow}>
            <AppText variant="caption" muted style={styles.summaryLabel}>
              {row.label}
            </AppText>
            <AppText variant="body">{row.value}</AppText>
          </View>
        ))}
        {hasIncluded
          ? tour.included.map((item) => (
              <AppText key={item} variant="body" style={styles.included}>
                ✓ {item}
              </AppText>
            ))
          : null}
        {hasExcluded ? (
          <View style={styles.excludedBlock}>
            <AppText variant="caption" muted style={styles.excludedHeading}>
              {t.notIncluded}
            </AppText>
            {tour.notIncluded.map((item) => (
              <AppText key={item} variant="body" muted style={styles.excluded}>
                ✕ {item}
              </AppText>
            ))}
          </View>
        ) : null}
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
      gap: theme.spacing.sm,
    },
    summaryRow: { gap: 4, marginBottom: theme.spacing.xs },
    summaryLabel: { textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.4 },
    included: { lineHeight: 22 },
    excludedBlock: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color(theme, 'border'),
      gap: theme.spacing.xs,
    },
    excludedHeading: { fontWeight: '600', marginBottom: theme.spacing.xs },
    excluded: { lineHeight: 22 },
  });
}
