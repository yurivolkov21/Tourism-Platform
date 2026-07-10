import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type PriceRowProps = {
  currency: string;
  basePrice: number;
  compareAtPrice?: number;
  fromLabel?: string;
  perPersonLabel?: string;
  size?: 'md' | 'lg';
};

function formatMoney(currency: string, amount: number): string {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

export function PriceRow({
  currency,
  basePrice,
  compareAtPrice,
  fromLabel,
  perPersonLabel,
  size = 'md',
}: PriceRowProps) {
  const theme = useTheme();
  const styles = createStyles(theme, size);
  const showCompare =
    compareAtPrice != null && compareAtPrice > basePrice;

  return (
    <View style={styles.root}>
      {fromLabel ? (
        <AppText variant="caption" muted>
          {fromLabel}
        </AppText>
      ) : null}
      <View style={styles.row}>
        {showCompare ? (
          <AppText variant="caption" muted style={styles.compare}>
            {formatMoney(currency, compareAtPrice)}
          </AppText>
        ) : null}
        <AppText variant={size === 'lg' ? 'title' : 'headline'} style={styles.price}>
          {formatMoney(currency, basePrice)}
        </AppText>
      </View>
      {perPersonLabel ? (
        <AppText variant="caption" muted style={styles.perPerson}>
          {perPersonLabel}
        </AppText>
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, size: 'md' | 'lg') {
  return StyleSheet.create({
    root: { gap: 2 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    compare: {
      textDecorationLine: 'line-through',
      fontSize: theme.typography.caption,
      marginBottom: size === 'lg' ? 4 : 2,
    },
    price: {
      color: color(theme, 'price'),
      fontSize: size === 'lg' ? theme.typography.title : theme.typography.headline,
      fontWeight: '700',
    },
    perPerson: {
      marginTop: 2,
    },
  });
}
