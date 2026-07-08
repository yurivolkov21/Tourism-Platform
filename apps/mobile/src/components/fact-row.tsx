import { View } from 'react-native';
import { AppText, useTheme } from '@tourism/mobile-ui';

/** Label/value row for booking facts (result + detail screens). */
export function FactRow({
  label,
  value,
  selectable,
}: {
  label: string;
  value: string;
  /** Let the user copy the value (booking codes, payment references). */
  selectable?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(3) }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="body" selectable={selectable} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}
