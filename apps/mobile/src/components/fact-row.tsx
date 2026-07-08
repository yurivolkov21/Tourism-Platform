import { View } from 'react-native';
import { AppText, useTheme } from '@tourism/mobile-ui';

/** Label/value row for booking facts (result + detail screens). */
export function FactRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(3) }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="body" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}
