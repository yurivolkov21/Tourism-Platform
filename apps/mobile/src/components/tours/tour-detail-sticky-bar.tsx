import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TourDetailData } from '@tourism/core';
import { Button, PriceRow, color, useTheme } from '@tourism/mobile-ui';

type TourDetailStickyBarProps = {
  tour: TourDetailData;
  fromLabel: string;
  perPersonLabel: string;
  contactLabel: string;
  onContact: () => void;
  loading?: boolean;
};

export function TourDetailStickyBar({
  tour,
  fromLabel,
  perPersonLabel,
  contactLabel,
  onContact,
  loading = false,
}: TourDetailStickyBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.bottom);

  return (
    <View style={styles.bar}>
      <View style={styles.price}>
        <PriceRow
          currency={tour.currency}
          basePrice={tour.basePrice}
          compareAtPrice={tour.compareAtPrice}
          fromLabel={fromLabel}
          perPersonLabel={perPersonLabel}
          size="lg"
        />
      </View>
      <Button
        label={contactLabel}
        onPress={onContact}
        loading={loading}
        style={styles.button}
      />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, bottomInset: number) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: Math.max(theme.spacing.sm, bottomInset),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color(theme, 'border'),
      backgroundColor: color(theme, 'card'),
    },
    price: { flex: 1, minWidth: 0 },
    button: { flexShrink: 0 },
  });
}
