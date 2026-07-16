import { Pressable, View } from 'react-native';
import { messages } from '@tourism/i18n';
import { AppText, useTheme } from '@tourism/mobile-ui';

const t = messages.mobile.home;

/**
 * P5.7 S4 — Navel Screen-17 vertical tab rail: rotated region labels stacked
 * on the left edge; the active one turns brass with a small underline dash.
 * Short labels ("North") keep the rotation legible; a11y reads the FULL
 * region name and never rotates (accessibilityLabel).
 */
export function RegionTabs({
  regions,
  active,
  onChange,
}: {
  regions: readonly string[];
  active: string;
  onChange: (region: string) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{ width: 44, gap: theme.spacing(8), paddingTop: theme.spacing(2) }}
    >
      {regions.map((region) => {
        const selected = region === active;
        const label = t.regionShort[region] ?? region;
        return (
          <Pressable
            key={region}
            accessibilityRole="tab"
            accessibilityLabel={region}
            accessibilityState={{ selected }}
            hitSlop={10}
            onPress={() => {
              if (!selected) onChange(region);
            }}
            style={{
              height: 84,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ alignItems: 'center', gap: theme.spacing(1) }}>
              <AppText
                numberOfLines={1}
                style={{
                  transform: [{ rotate: '-90deg' }],
                  width: 84,
                  textAlign: 'center',
                  fontFamily: selected
                    ? theme.fontFamilies.sansSemiBold
                    : theme.fontFamilies.sans,
                  fontSize: 15,
                  color: selected
                    ? theme.colors['primary']
                    : theme.colors['muted-foreground'],
                }}
              >
                {label}
              </AppText>
              {selected ? (
                <View
                  style={{
                    width: 4,
                    height: 18,
                    borderRadius: 2,
                    backgroundColor: theme.colors['primary'],
                    position: 'absolute',
                    right: -2,
                  }}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
