import { Text, View, type ViewProps } from 'react-native';
import { useTheme } from './theme-provider';

export type BadgeTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'rating'
  | 'muted'
  | 'destructive';

export interface BadgeProps extends ViewProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'primary', style, ...rest }: BadgeProps) {
  const theme = useTheme();
  // Web parity: the amber "rating" badge keeps dark foreground text. The theme
  // has no destructive-foreground pair (web tints that badge instead of filling
  // it) — the primary pair flips light/dark correctly against the solid red.
  const color =
    tone === 'rating'
      ? theme.colors['foreground']
      : tone === 'destructive'
        ? theme.colors['primary-foreground']
        : theme.colors[`${tone}-foreground`];
  return (
    <View
      {...rest}
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: theme.colors[tone],
          borderRadius: 999,
          paddingHorizontal: theme.spacing(2),
          paddingVertical: 2,
        },
        style,
      ]}
    >
      <Text
        style={{
          color,
          fontSize: 11,
          lineHeight: 14,
          fontFamily: theme.fontFamilies.sansSemiBold,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
